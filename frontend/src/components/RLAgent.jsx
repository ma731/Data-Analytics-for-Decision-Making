import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getRL, fmtINR } from "../api.js";
import { ChartTip, useCountUp } from "./ui.jsx";

// price level index (0=cheapest .. 4=dearest) -> colour
function fareColor(idx, n = 5) {
  const t = idx / (n - 1);
  const hue = 212 - t * 212; // blue -> red
  return `hsl(${hue}, ${55 + t * 20}%, ${52 + (1 - t) * 6}%)`;
}

// the six metros — coords for sector distance, so picking a route moves the fare
const CITIES = {
  Delhi: { code: "DEL", lat: 28.556, lon: 77.1 },
  Mumbai: { code: "BOM", lat: 19.089, lon: 72.868 },
  Bengaluru: { code: "BLR", lat: 13.199, lon: 77.71 },
  Hyderabad: { code: "HYD", lat: 17.24, lon: 78.429 },
  Chennai: { code: "MAA", lat: 12.99, lon: 80.169 },
  Kolkata: { code: "CCU", lat: 22.654, lon: 88.447 },
};
const REF_KM = 1140; // Delhi–Mumbai, the reference sector
function haversineKm(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
  const la1 = a.lat * toR, la2 = b.lat * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// the policy the agent converges to, as a quotable move
const MOVES = [
  { k: "Hold — fill the plane", c: "var(--data-blue-bright)" },
  { k: "Ease up gently", c: "var(--data-blue-bright)" },
  { k: "Nudge the fare", c: "var(--accent)" },
  { k: "Push hard", c: "var(--accent)" },
  { k: "Peak — last seats", c: "var(--negative)" },
];

export default function RLAgent({ f }) {
  const [d, setD] = useState(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    getRL().then((data) => { setD(data); setPlaying(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!playing || !d) return;
    let last = 0;
    const step = (ts) => {
      if (ts - last > 90) {
        last = ts;
        setFrame((f) => { if (f >= d.history.length - 1) { setPlaying(false); return f; } return f + 1; });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, d]);

  function play() { if (frame >= (d?.history.length || 1) - 1) setFrame(0); setPlaying(true); }

  const snap = d?.history[frame];
  const curve = (d?.history || []).slice(0, frame + 1).map((h, i) => ({
    i, agent: h.agent_rev / 1e5, baseline: h.baseline_rev / 1e5,
  }));
  const baseRev = d?.baseline_rev || 0;
  const uplift = snap && baseRev ? Math.round(((snap.agent_rev - baseRev) / baseRev) * 100) : 0;
  const pct = d ? Math.round((frame / (d.history.length - 1)) * 100) : 0;
  const heat = snap?.heatmap || []; // [day][seatBucket] = price idx

  // ---- interactive euro fare desk: the agent's converged policy, quoted on any route ----
  const [orig, setOrig] = useState("Delhi");
  const [dest, setDest] = useState("Mumbai");
  const [daysLeft, setDaysLeft] = useState(7);
  const [seatsPct, setSeatsPct] = useState(45);
  const farOut = f?.panic_tax?.far_out_avg ?? 4000;
  const lastMin = f?.panic_tax?.last_minute_avg ?? 11000;
  const sameRoute = orig === dest;
  const km = sameRoute ? 0 : haversineKm(CITIES[orig], CITIES[dest]);
  const distFactor = Math.pow(Math.max(km, 1) / REF_KM, 0.6);
  const timePressure = 1 - (daysLeft - 1) / 19; // 0 far out .. 1 day-of
  const scarcity = 1 - seatsPct / 100;          // 0 empty plane .. 1 nearly full
  const fareIdx = sameRoute ? 0 : Math.max(0, Math.min(4, Math.round((0.5 * timePressure + 0.5 * scarcity) * 4)));
  const levelFare = farOut + (lastMin - farOut) * (fareIdx / 4);
  const fareInr = Math.round(levelFare * distFactor);
  const fareEur = Math.round(fareInr / 90);
  const move = MOVES[fareIdx];
  const eurShown = useCountUp(sameRoute ? 0 : fareEur, { duration: 450, format: (v) => `€${Math.round(v).toLocaleString("en-US")}` });

  return (
    <div className="panel">
      <h3 className="panel-h">Reinforcement learning — an agent that learns to price</h3>
      <p className="panel-sub">
        A Q-learning agent sets a fare each day of the 20-day booking window for a fixed-inventory flight, rewarded only
        when seats sell. Starting from the airline&rsquo;s instinct — discount to fill the plane — watch its revenue climb
        as it learns a smarter, inventory-aware policy.
      </p>

      <div className="controls-row">
        <button className="btn-play" onClick={playing ? () => setPlaying(false) : play} disabled={!d}>
          {playing ? "❚❚ Pause" : frame >= (d?.history.length || 1) - 1 ? "↻ Replay" : "▶ Train agent"}
        </button>
        <div style={{ minWidth: 200, flex: 1 }}>
          <span className="gen-tag">EPISODE {(snap?.episode ?? 0).toLocaleString("en-US")} / {d ? d.episodes.toLocaleString("en-US") : "—"}</span>
          <div className="gen-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="readout rl-uplift">
          <div className="l">Revenue vs discount-to-fill</div>
          <div className="v" style={{ color: uplift >= 0 ? "var(--positive)" : "var(--negative)" }}>
            {uplift >= 0 ? "+" : ""}{uplift}%
          </div>
        </div>
      </div>

      <div className="grid rl-grid">
        {/* learning curve */}
        <div>
          <div className="rl-cap">Agent revenue per training checkpoint (₹ lakh)</div>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={curve} margin={{ top: 10, right: 14, bottom: 6, left: -8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="i" hide />
                <YAxis domain={[1.5, 4.2]} tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} stroke="var(--border)" />
                <ReferenceLine y={baseRev / 1e5} stroke="var(--negative)" strokeDasharray="5 4"
                  label={{ value: "discount-to-fill", fill: "var(--negative)", fontSize: 10, position: "insideBottomRight" }} />
                <Tooltip content={<ChartTip render={(p) => (
                  <div className="muted">Agent: <b style={{ color: "var(--positive)" }}>₹{(p[0].payload.agent).toFixed(2)} L</b></div>
                )} />} />
                <Line dataKey="agent" type="monotone" stroke="var(--positive)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* policy heatmap */}
        <div>
          <div className="rl-cap">Learned policy · fare by days-left × seats-left</div>
          <div className="heatmap" role="img" aria-label="Pricing policy heatmap sharpening as the agent learns">
            {heat.map((row, r) => (
              <div className="heat-row" key={r}>
                {row.map((idx, c) => (
                  <span key={c} className="heat-cell" style={{ background: fareColor(idx) }} />
                ))}
              </div>
            ))}
          </div>
          <div className="heat-axes">
            <span>← more seats left · fewer seats →</span>
          </div>
          <div className="heat-legend">
            <span>cheap</span>
            <i style={{ background: "linear-gradient(90deg, hsl(212,55%,58%), hsl(106,60%,55%), hsl(0,75%,52%))" }} />
            <span>premium</span>
          </div>
        </div>
      </div>

      {/* interactive euro fare desk */}
      <div className="faredesk">
        <div className="fd-controls">
          <div className="rl-cap">Try the policy live — quote a fare on any route, in euros</div>
          <label className="fd-field">
            <span className="fd-k">Route</span>
            <div className="fd-route-row">
              <select value={orig} onChange={(e) => setOrig(e.target.value)} aria-label="Origin city">
                {Object.keys(CITIES).map((c) => <option key={c} value={c}>{c} ({CITIES[c].code})</option>)}
              </select>
              <span className="fd-arrow" aria-hidden="true">→</span>
              <select value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Destination city">
                {Object.keys(CITIES).map((c) => <option key={c} value={c}>{c} ({CITIES[c].code})</option>)}
              </select>
            </div>
          </label>
          <label className="fd-field">
            <span className="fd-k">Days before departure <b>{daysLeft}</b></span>
            <input type="range" min="1" max="20" value={daysLeft} onChange={(e) => setDaysLeft(+e.target.value)} aria-label="Days before departure" />
          </label>
          <label className="fd-field">
            <span className="fd-k">Seats still unsold <b>{seatsPct}%</b></span>
            <input type="range" min="5" max="95" value={seatsPct} onChange={(e) => setSeatsPct(+e.target.value)} aria-label="Seats still unsold" />
          </label>
        </div>
        <div className="fd-out">
          <div className="fd-price">
            <span className="fd-eur mono">{sameRoute ? "—" : eurShown}</span>
            <span className="fd-inr mono">{sameRoute ? "pick two different cities" : `${fmtINR(fareInr)} · ${Math.round(km)} km sector`}</span>
          </div>
          <div className="fd-move" style={{ borderColor: move.c, color: move.c }}>
            <span className="fd-move-k">Agent</span>{sameRoute ? "—" : move.k}
          </div>
          <div className="fd-levels" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`fd-dot ${!sameRoute && l <= fareIdx ? "on" : ""}`} />)}
          </div>
        </div>
      </div>

      <p className="chart-caption">
        The agent rediscovers <b style={{ color: "var(--positive)" }}>revenue management</b> on its own: hold cheap fares
        when the plane is empty and far out, escalate hard as seats fill and departure nears. Final policy earns{" "}
        <b style={{ color: "var(--accent)" }}>{d ? `+${d.uplift_pct}%` : "…"}</b> over the discount-to-fill instinct.
      </p>
      <div className="assume">
        Stylised fixed-inventory demand model; uplift is vs an always-cheapest baseline (a deliberate worst case). It shows
        RL <i>rediscovers</i> revenue management, not a booking forecast. The fare desk applies that learned policy to each
        sector&rsquo;s observed fare range (₹{Math.round(farOut).toLocaleString("en-US")}–₹{Math.round(lastMin).toLocaleString("en-US")}),
        scaled by distance — illustrative, not a live quote.
      </div>
    </div>
  );
}
