import { useEffect, useRef, useState } from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { getPricing } from "../api.js";
import { ChartTip, useCountUp } from "./ui.jsx";

export default function PriceOptimizer() {
  const [e, setE] = useState(1.4);
  const [d, setD] = useState(null);
  const timer = useRef(0);

  function run(v) { getPricing(v).then(setD).catch(() => {}); }
  useEffect(() => { run(1.4); }, []);
  function onSlide(v) { setE(v); clearTimeout(timer.current); timer.current = setTimeout(() => run(v), 150); }

  const uplift = useCountUp(d?.revenue_uplift_pct ?? 0, { duration: 600, format: (v) => v.toFixed(1) });
  // elasticity 1.1 (business / inelastic) .. 2.6 (leisure / elastic)
  const mix = Math.min(1, Math.max(0, (e - 1.1) / (2.6 - 1.1)));

  return (
    <div className="panel">
      <h3 className="panel-h">Dynamic price optimiser — the fare curve we should fly</h3>
      <p className="panel-sub">
        Given a price-elasticity of demand, we solve for the revenue-maximising fare at every point in the booking window.
        Drag elasticity and watch the optimal fare envelope — and the upside — move.
      </p>

      <div className="controls-row">
        <div className="slider" style={{ flex: 1 }}>
          <div className="lab"><span>Price elasticity of demand</span><b>{e.toFixed(2)}</b></div>
          <input type="range" min="1.1" max="2.6" step="0.05" value={e} aria-label="Price elasticity"
            onChange={(ev) => onSlide(+ev.target.value)} />
          <div className="mix-bar" aria-hidden="true">
            <span className="mix-end left">BUSINESS · pays anything</span>
            <span className="mix-end right">LEISURE · price-shops</span>
            <span className="mix-marker" style={{ left: `${mix * 100}%` }} />
          </div>
        </div>
        <div className="readout uplift-big">
          <div className="l">Modelled revenue uplift</div>
          <div className="v" style={{ color: (d?.revenue_uplift_pct ?? 0) >= 0 ? "var(--positive)" : "var(--negative)" }}>
            +{uplift}%
          </div>
        </div>
      </div>

      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <ComposedChart data={d?.curve || []} margin={{ top: 12, right: 18, bottom: 28, left: 8 }}>
            <defs>
              <linearGradient id="optFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="days_left" reversed stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Days before departure  →  closer in", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip render={(p) => (
              <div>
                <div className="muted">{p[0]?.payload.days_left} days out</div>
                <div className="muted">Current <b style={{ color: "var(--data-blue-bright)" }}>₹{p[0]?.payload.current_price?.toLocaleString("en-IN")}</b></div>
                <div className="muted">Optimal <b style={{ color: "var(--accent)" }}>₹{p[0]?.payload.optimal_price?.toLocaleString("en-IN")}</b></div>
              </div>
            )} />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Area className="glow-gold" dataKey="optimal_price" name="Optimal fare" type="monotone"
              stroke="#fbbf24" strokeWidth={3} fill="url(#optFill)" isAnimationActive animationDuration={500} />
            <Line className="glow-blue" dataKey="current_price" name="Current fare" type="monotone"
              stroke="var(--data-blue-bright)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        The gold envelope is the revenue-maximising fare; the dashed blue line is what we charge today. Where today&rsquo;s
        fare sits <i>below</i> the envelope, we&rsquo;re leaving money on the table — most of it in the inelastic last-minute window.
      </p>
    </div>
  );
}
