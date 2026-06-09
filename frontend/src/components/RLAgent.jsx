import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getRL } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function RLAgent() {
  const [d, setD] = useState(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => { getRL().then(setD).catch(() => {}); }, []);
  useEffect(() => {
    if (!playing || !d) return;
    let last = 0;
    const step = (ts) => {
      if (ts - last > 110) {
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
  const policy = (snap?.policy || []).map((p) => ({ days_left: p.days_left, learned: p.price }));
  const ep = snap?.episode ?? 0;
  const pct = d ? Math.round((frame / (d.history.length - 1)) * 100) : 0;

  return (
    <div className="panel">
      <h3 className="panel-h">Reinforcement learning — an agent that learns to price</h3>
      <p className="panel-sub">
        A Q-learning agent sets a fare each day of the 20-day booking window for a fixed-inventory flight, rewarded only
        when seats sell. With no rules given, watch it discover the "hold low, then climb" curve — the panic tax,
        learned from scratch.
      </p>
      <div className="controls-row">
        <button className="btn-play" onClick={playing ? () => setPlaying(false) : play} disabled={!d}>
          {playing ? "❚❚ Pause" : "▶ Train agent"}
        </button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <span className="gen-tag">EPISODE {ep.toLocaleString("en-IN")} / {d ? d.episodes.toLocaleString("en-IN") : "—"}</span>
          <div className="gen-bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
      </div>
      <div style={{ width: "100%", height: 330 }}>
        <ResponsiveContainer>
          <LineChart data={policy} margin={{ top: 10, right: 18, bottom: 28, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="days_left" reversed stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Days before departure  →  closer in", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" domain={[3000, 16000]}
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">{p[0].payload.days_left} days out · learned fare <b style={{ color: "var(--accent)" }}>₹{p[0].payload.learned.toLocaleString("en-IN")}</b></div>
            )} />} />
            <Line dataKey="learned" type="stepAfter" stroke="var(--accent)" strokeWidth={3}
              dot={{ r: 3, fill: "var(--accent)" }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        The learned policy is a <b style={{ color: "var(--accent)" }}>step-up fare ladder</b> — cheap far out, escalating
        as the plane fills and departure nears. The agent rediscovers airline revenue management on its own.
      </p>
    </div>
  );
}
