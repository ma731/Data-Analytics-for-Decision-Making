import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { getRL } from "../api.js";
import { ChartTip } from "./ui.jsx";

// price level index (0=cheapest .. 4=dearest) -> colour
function fareColor(idx, n = 5) {
  const t = idx / (n - 1);
  const hue = 212 - t * 212; // blue -> red
  return `hsl(${hue}, ${55 + t * 20}%, ${52 + (1 - t) * 6}%)`;
}

export default function RLAgent() {
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

      <p className="chart-caption">
        The agent rediscovers <b style={{ color: "var(--positive)" }}>revenue management</b> on its own: hold cheap fares
        when the plane is empty and far out, escalate hard as seats fill and departure nears. Final policy earns{" "}
        <b style={{ color: "var(--accent)" }}>{d ? `+${d.uplift_pct}%` : "…"}</b> over the discount-to-fill instinct.
      </p>
      <div className="assume">
        Stylised fixed-inventory demand model — it shows RL <i>rediscovers</i> revenue management, not a booking forecast.
      </div>
    </div>
  );
}
