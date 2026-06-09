import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getPricing } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function PriceOptimizer() {
  const [e, setE] = useState(1.4);
  const [d, setD] = useState(null);
  const timer = useRef(0);

  function run(v) { getPricing(v).then(setD).catch(() => {}); }
  useEffect(() => { run(1.4); }, []);
  function onSlide(v) { setE(v); clearTimeout(timer.current); timer.current = setTimeout(() => run(v), 160); }

  return (
    <div className="panel">
      <h3 className="panel-h">Dynamic price optimiser — the fare curve we should fly</h3>
      <p className="panel-sub">
        Given a price-elasticity of demand, we solve for the revenue-maximising fare at every point in the booking window.
        Drag elasticity (how price-sensitive flyers are) and watch the optimal curve — and the revenue upside — move.
      </p>
      <div className="controls-row">
        <div className="slider">
          <div className="lab"><span>Price elasticity of demand</span><b>{e.toFixed(2)}</b></div>
          <input type="range" min="1.1" max="2.6" step="0.05" value={e} aria-label="Price elasticity"
            onChange={(ev) => onSlide(+ev.target.value)} />
        </div>
        {d && (
          <div className="readout" style={{ minWidth: 180 }}>
            <div className="l">Modelled revenue uplift</div>
            <div className="v" style={{ color: d.revenue_uplift_pct >= 0 ? "var(--positive)" : "var(--negative)" }}>
              {d.revenue_uplift_pct >= 0 ? "+" : ""}{d.revenue_uplift_pct}%
            </div>
          </div>
        )}
      </div>
      <div style={{ width: "100%", height: 330 }}>
        <ResponsiveContainer>
          <LineChart data={d?.curve || []} margin={{ top: 10, right: 18, bottom: 28, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="days_left" reversed stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Days before departure  →  closer in", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip render={(p) => (
              <div>
                <div className="muted">{p[0]?.payload.days_left} days out</div>
                <div className="muted">Current <b style={{ color: "var(--text)" }}>₹{p[0]?.payload.current_price?.toLocaleString("en-IN")}</b></div>
                <div className="muted">Optimal <b style={{ color: "var(--accent)" }}>₹{p[0]?.payload.optimal_price?.toLocaleString("en-IN")}</b></div>
              </div>
            )} />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line dataKey="current_price" name="Current fare" type="monotone" stroke="var(--data-blue)" strokeWidth={2.5} dot={false} isAnimationActive />
            <Line dataKey="optimal_price" name="Optimal fare" type="monotone" stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        The optimiser sharpens the price-discrimination curve — easing fares for price-sensitive early leisure demand and
        capturing the inelastic late business demand — lifting revenue without losing load.
      </p>
    </div>
  );
}
