import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartTip } from "./ui.jsx";
import { fmtINR, fmtNum1 } from "../api.js";

export default function StopsCrime({ stops }) {
  return (
    <div className="panel">
      <h3 className="panel-h">The Double-Crime of Connections</h3>
      <p className="panel-sub">
        More stops charge the passenger more <b>and</b> burn more fuel per seat — every extra
        takeoff is the thirstiest phase of flight. Cost and price move together.
      </p>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={stops} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="stops"
              tick={{ fill: "var(--text-muted)", fontSize: 13 }}
              stroke="var(--border)"
            />
            <YAxis
              yAxisId="price"
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="fuel"
              orientation="right"
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              tickFormatter={(v) => `${v}kg`}
            />
            <Tooltip
              cursor={{ fill: "rgba(96,165,250,0.06)" }}
              content={
                <ChartTip
                  render={(p) => {
                    const d = p[0].payload;
                    return (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.stops}</div>
                        <div className="muted">
                          Avg fare:{" "}
                          <b style={{ color: "var(--data-blue-bright)" }}>{fmtINR(d.avg_price)}</b>
                        </div>
                        <div className="muted">
                          Fuel/seat:{" "}
                          <b style={{ color: "var(--accent)" }}>
                            {fmtNum1(d.avg_fuel_kg_per_seat)} kg
                          </b>
                        </div>
                        <div className="muted">CO₂/seat: {fmtNum1(d.avg_co2_kg_per_seat)} kg</div>
                        <div className="muted">{d.share}% of economy seats</div>
                      </>
                    );
                  }}
                />
              }
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar
              yAxisId="price"
              dataKey="avg_price"
              name="Avg fare (₹)"
              fill="var(--data-blue)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              yAxisId="fuel"
              dataKey="avg_fuel_kg_per_seat"
              name="Fuel/seat (kg)"
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
