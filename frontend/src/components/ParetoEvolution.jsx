import { useEffect, useRef, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart,
} from "recharts";
import { getPareto } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function ParetoEvolution() {
  const [d, setD] = useState(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => { getPareto().then(setD).catch(() => {}); }, []);

  useEffect(() => {
    if (!playing || !d) return;
    let last = 0;
    const step = (ts) => {
      if (ts - last > 320) {
        last = ts;
        setFrame((f) => {
          if (f >= d.snapshots.length - 1) { setPlaying(false); return f; }
          return f + 1;
        });
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
  const pct = d ? Math.round((frame / (d.snapshots.length - 1)) * 100) : 0;

  return (
    <div className="panel">
      <h3 className="panel-h">NSGA-II — evolving the optimal fuel ↔ revenue frontier</h3>
      <p className="panel-sub">
        A genetic algorithm breeds {d ? d.pop_size : 60} candidate network plans across {d ? d.generations : 40} generations,
        keeping only the non-dominated ones. Press play and watch the cloud collapse onto the true Pareto frontier —
        the menu of "best possible" trade-offs no plan can beat.
      </p>

      <div className="controls-row">
        <button className="btn-play" onClick={playing ? () => setPlaying(false) : play} disabled={!d}>
          {playing ? "❚❚ Pause" : "▶ Evolve"}
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <span className="gen-tag">GENERATION {snap?.gen ?? 0} / {d?.generations ?? 40}</span>
          <div className="gen-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div style={{ width: "100%", height: 380 }}>
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 12, right: 20, bottom: 36, left: 16 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="fuel" name="Fuel cost" stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              domain={["auto", "auto"]}
              label={{ value: "Total fuel cost (₹ cr)  →  more fuel", position: "bottom", offset: 18, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis type="number" dataKey="revenue" name="Revenue" stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              domain={["auto", "auto"]}
              label={{ value: "Revenue (₹ cr)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 12 }} />
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">Fuel ₹{p[0].payload.fuel} cr · Revenue <b style={{ color: "var(--text)" }}>₹{p[0].payload.revenue} cr</b></div>
            )} />} />
            <Scatter data={pop} isAnimationActive={false}>
              {pop.map((pt, i) => (
                <Cell key={i} fill={pt.front === 0 ? "var(--accent)" : "rgba(96,165,250,0.45)"} r={pt.front === 0 ? 5 : 3} />
              ))}
            </Scatter>
            <Line data={front} dataKey="revenue" type="monotone" stroke="var(--accent)" strokeWidth={2}
              dot={false} isAnimationActive={false} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="chart-caption">
        Amber = the current Pareto-optimal plans; blue = dominated candidates still being bred out. The knee of the final
        curve {d?.knee && <>— <b style={{ color: "var(--accent)" }}>₹{d.knee.revenue} cr revenue at ₹{d.knee.fuel} cr fuel</b> —</>} is the
        single best revenue-per-fuel network plan the algorithm can find.
      </p>
    </div>
  );
}
