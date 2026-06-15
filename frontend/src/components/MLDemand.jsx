import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDemand } from "../api.js";
import { ChartTip } from "./ui.jsx";

const NICE = {
  class: "Cabin class", duration: "Flight duration", days_left: "Days before departure",
  airline: "Airline", stops: "Stops", gc_km: "Route distance", source_city: "Origin city",
  destination_city: "Destination city", departure_time: "Departure time", arrival_time: "Arrival time",
};

export default function MLDemand() {
  const [d, setD] = useState(null);
  useEffect(() => { getDemand().then(setD).catch(() => {}); }, []);
  const data = (d?.importance || []).map((r) => ({ ...r, label: NICE[r.feature] || r.feature })).slice(0, 8);
  const max = Math.max(...data.map((r) => r.importance), 0.0001);

  return (
    <div className="panel">
      <h3 className="panel-h">ML demand engine — what actually drives the fare</h3>
      <p className="panel-sub">
        A gradient-boosted model predicts the fare, validated on a held-out{" "}
        {d ? `${d.reliability?.split}` : "flight-grouped"} split ({d ? `out-of-sample R² = ${d.r2}` : "training…"}). The
        bars rank what moves price most — the levers a revenue team can actually pull.
      </p>
      {d?.reliability && (
        <div className="readouts" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 0, marginBottom: 4 }}>
          <div className="readout">
            <div className="l">Test error · MAPE</div>
            <div className="v" style={{ fontSize: 22 }}>{d.reliability.mape_pct}%</div>
          </div>
          <div className="readout">
            <div className="l">Skill vs baseline</div>
            <div className="v" style={{ fontSize: 22, color: "var(--positive)" }}>+{Math.round(d.reliability.skill_score * 100)}%</div>
          </div>
          <div className="readout">
            <div className="l">P10–P90 coverage</div>
            <div className="v" style={{ fontSize: 22 }}>{d.reliability.interval_coverage_pct}%</div>
          </div>
          <div className="readout">
            <div className="l">Overfit gap</div>
            <div className="v" style={{ fontSize: 22 }}>{(d.reliability.train_r2 - d.reliability.test_r2).toFixed(3)}</div>
          </div>
        </div>
      )}
      <div style={{ width: "100%", height: 330 }}>
        <ResponsiveContainer>
          <BarChart layout="vertical" data={data} margin={{ top: 6, right: 24, bottom: 6, left: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }} />
            <YAxis type="category" dataKey="label" width={150} stroke="var(--border)" tick={{ fill: "var(--text)", fontSize: 13 }} />
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">{p[0].payload.label}: <b style={{ color: "var(--text)" }}>{p[0].payload.importance}</b> importance</div>
            )} />} cursor={{ fill: "rgba(96,165,250,0.06)" }} />
            <Bar dataKey="importance" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={900}>
              {data.map((r, i) => (
                <Cell key={i} fill={`hsl(${210 - (r.importance / max) * 170}, 75%, 58%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        {d && <>Cabin class and timing dominate. The fare/volume gradient along the booking curve is{" "}
        <b style={{ color: "var(--accent)" }}>{Math.abs(d.elasticity)}</b> (log-log OLS, descriptive — not a
        causal elasticity), confirming fares climb steeply as departure nears: exactly the panic-tax curve the
        price optimiser exploits.</>}
      </p>
    </div>
  );
}
