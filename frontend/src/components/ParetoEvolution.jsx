import { useEffect, useRef, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart,
} from "recharts";
import { getPareto } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function ParetoEvolution() {
  const [d, setD] = useState(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => { getPareto().then((data) => { setD(data); setPlaying(true); }).catch(() => {}); }, []);

  useEffect(() => {
    if (!playing || !d) return;
    let last = 0;
    const step = (ts) => {
      if (ts - last > 300) {
        last = ts;
        setFrame((f) => { if (f >= d.snapshots.length - 1) { setPlaying(false); return f; } return f + 1; });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, d]);

  function play() {
    if (frame >= (d?.snapshots.length || 1) - 1) setFrame(0);
    setPlaying(true);
  }

  const snap = d?.snapshots[frame];
  const pop = snap?.points || [];
  const front = (snap?.pareto || []).map((p) => ({ fuel: p.fuel, revenue: p.revenue }));
  const gen0 = (d?.snapshots[0]?.pareto || []).map((p) => ({ fuel: p.fuel, revenue: p.revenue }));
  // knee of the current front = best revenue-per-fuel
  const knee = front.length ? front.reduce((a, b) => (b.revenue / b.fuel > a.revenue / a.fuel ? b : a)) : null;
  const pct = d ? Math.round((frame / (d.snapshots.length - 1)) * 100) : 0;

  return (
    <div className="panel">
      <h3 className="panel-h">NSGA-II — evolving the optimal fuel ↔ revenue frontier</h3>
      <p className="panel-sub">
        A genetic algorithm breeds {d ? d.pop_size : 60} candidate network plans across {d ? d.generations : 40} generations,
        keeping only the non-dominated ones. Watch the cloud collapse from its starting front (faint) onto the true Pareto
        frontier — the menu of best-possible trade-offs no plan can beat.
      </p>

      <div className="controls-row">
        <button className="btn-play" onClick={playing ? () => setPlaying(false) : play} disabled={!d}>
          {playing ? "❚❚ Pause" : frame >= (d?.snapshots.length || 1) - 1 ? "↻ Replay" : "▶ Evolve"}
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <span className="gen-tag">GENERATION {snap?.gen ?? 0} / {d?.generations ?? 40}</span>
          <div className="gen-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
        {knee && (
          <div className="readout" style={{ minWidth: 180 }}>
            <div className="l">Best plan (knee)</div>
            <div className="v" style={{ fontSize: 19, color: "var(--accent)" }}>₹{knee.revenue} cr</div>
          </div>
        )}
      </div>

      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 12, right: 20, bottom: 36, left: 16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="fuel" name="Fuel cost" stroke="var(--border)" domain={["auto", "auto"]}
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Total fuel cost (₹ cr)  →  more fuel", position: "bottom", offset: 18, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis type="number" dataKey="revenue" name="Revenue" stroke="var(--border)" domain={["auto", "auto"]}
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Revenue (₹ cr)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 12 }} />
            <ZAxis range={[40, 40]} />
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">Fuel ₹{p[0].payload.fuel} cr · Revenue <b style={{ color: "var(--text)" }}>₹{p[0].payload.revenue} cr</b></div>
            )} />} />
            {/* gen-0 ghost front */}
            <Line data={gen0} dataKey="revenue" type="monotone" stroke="rgba(148,163,184,0.35)" strokeWidth={1.5}
              strokeDasharray="5 5" dot={false} isAnimationActive={false} legendType="none" />
            {/* population */}
            <Scatter data={pop} isAnimationActive={false}>
              {pop.map((pt, i) => (
                <Cell key={i} fill={pt.front === 0 ? "var(--accent)" : "rgba(96,165,250,0.4)"} r={pt.front === 0 ? 5 : 3} />
              ))}
            </Scatter>
            {/* glowing current front */}
            <Line className="glow-gold" data={front} dataKey="revenue" type="monotone" stroke="var(--accent)"
              strokeWidth={2.5} dot={false} isAnimationActive={false} legendType="none" />
            {/* knee marker */}
            {knee && (
              <Scatter className="knee-pulse" data={[knee]} isAnimationActive={false}>
                <Cell fill="#fff" />
              </Scatter>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="chart-caption">
        The dashed grey line is generation 0; amber is the live Pareto front; the white pulse is the{" "}
        <b style={{ color: "#fff" }}>knee</b> — the single best revenue-per-fuel plan
        {d?.knee && <> at <b style={{ color: "var(--accent)" }}>₹{d.knee.revenue} cr on ₹{d.knee.fuel} cr of fuel</b></>}.
      </p>
      <div className="assume">
        Candidate plans are capacity-share vectors across the 30 routes; revenue and fuel are modeled totals over a fixed
        weekly frequency budget. Shows the trade-off frontier, not a committed schedule.
      </div>
    </div>
  );
}
