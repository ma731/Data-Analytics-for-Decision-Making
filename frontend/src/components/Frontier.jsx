import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartTip } from "./ui.jsx";
import { fmtINR, fmtNum1 } from "../api.js";

// Efficiency by revenue-per-fuel-kg, encoded on a single warm hue via LIGHTNESS
// (dark = bleeder, bright gold = winner). A lightness ramp is colour-blind-safe —
// red->green hue alone fails for ~8% of men. Position on the chart + the tooltip
// carry the value too, so the encoding is never colour-only.
function colorFor(rev, min, max) {
  const t = (rev - min) / (max - min || 1); // 0 worst .. 1 best
  const light = 30 + t * 38; // 30% (bleeder) -> 68% (winner)
  const sat = 38 + t * 44; // muted when low, saturated when high
  return `hsl(43, ${sat}%, ${light}%)`;
}

export default function Frontier({ frontier }) {
  const revs = frontier.map((d) => d.rev_per_fuel_kg);
  const min = Math.min(...revs);
  const max = Math.max(...revs);
  const data = frontier.map((d) => ({ ...d, fill: colorFor(d.rev_per_fuel_kg, min, max) }));

  const best = data[0];
  const worst = data[data.length - 1];

  return (
    <div className="panel">
      <h3 className="panel-h">The Fuel–Revenue Efficiency Frontier</h3>
      <p className="panel-sub">
        Every route: modeled fuel burned per seat (x) against revenue per seat (y). Bubble
        size = booking volume. Green earns the most revenue per kilogram of fuel; red earns
        the least.
      </p>
      <div style={{ width: "100%", height: 420 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 24, bottom: 48, left: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="fuel_kg_per_seat"
              name="Fuel per seat"
              unit=" kg"
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              label={{
                value: "Fuel burned per seat (kg)  →  more fuel",
                position: "bottom",
                offset: 24,
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="avg_price"
              name="Revenue per seat"
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              label={{
                value: "Revenue / seat",
                angle: -90,
                position: "insideLeft",
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <ZAxis type="number" dataKey="volume" range={[60, 900]} name="Volume" />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "var(--data-blue)" }}
              content={
                <ChartTip
                  render={(p) => {
                    const d = p[0].payload;
                    return (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.route}</div>
                        <div className="muted">
                          Revenue/seat: <b style={{ color: "var(--text)" }}>{fmtINR(d.avg_price)}</b>
                        </div>
                        <div className="muted">
                          Fuel/seat:{" "}
                          <b style={{ color: "var(--text)" }}>{fmtNum1(d.fuel_kg_per_seat)} kg</b>
                        </div>
                        <div className="muted">
                          Revenue per fuel-kg:{" "}
                          <b style={{ color: d.fill }}>{fmtNum1(d.rev_per_fuel_kg)}</b>
                        </div>
                        <div className="muted">CO₂/seat: {fmtNum1(d.co2_kg_per_seat)} kg</div>
                      </>
                    );
                  }}
                />
              }
            />
            <Scatter data={data} fillOpacity={0.78}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} stroke="#0a0e1a" strokeWidth={1} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Most efficient: <b style={{ color: "var(--positive)" }}>{best.route}</b> earns{" "}
        {fmtINR(best.avg_price)} on just {fmtNum1(best.fuel_kg_per_seat)} kg/seat. Least efficient:{" "}
        <b style={{ color: "var(--negative)" }}>{worst.route}</b> earns less ({fmtINR(worst.avg_price)})
        on {fmtNum1(worst.fuel_kg_per_seat)} kg — {fmtNum1(best.rev_per_fuel_kg / worst.rev_per_fuel_kg)}×
        worse revenue-per-fuel, priced almost identically. Price does not reflect fuel cost.
      </p>
    </div>
  );
}
