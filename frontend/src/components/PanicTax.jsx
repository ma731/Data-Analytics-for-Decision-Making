import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartTip } from "./ui.jsx";
import { fmtINR } from "../api.js";

export default function PanicTax({ panic }) {
  // daily: [{days_left, price}] — reverse so x reads 49 -> 1 (time to departure)
  const data = [...panic.daily].sort((a, b) => b.days_left - a.days_left);

  return (
    <div className="panel">
      <h3 className="panel-h">The Panic Tax</h3>
      <p className="panel-sub">
        Average economy fare by days before departure. The fare is flat and cheap until ~20 days
        out, then climbs steeply as seats run low.
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 28, left: 4 }}>
            <defs>
              <linearGradient id="panicFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="days_left"
              reversed
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              label={{
                value: "Days before departure  →  closer in",
                position: "bottom",
                offset: 12,
                fill: "var(--text-muted)",
                fontSize: 12,
              }}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <ReferenceLine x={20} stroke="var(--data-blue)" strokeDasharray="4 4" />
            <Tooltip
              content={
                <ChartTip
                  render={(p) => {
                    const d = p[0].payload;
                    return (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          {d.days_left} days out
                        </div>
                        <div className="muted">
                          Avg fare: <b style={{ color: "var(--accent)" }}>{fmtINR(d.price)}</b>
                        </div>
                      </>
                    );
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fill="url(#panicFill)"
              isAnimationActive
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        The blue line marks where the cliff begins — about 20 days out.
      </p>
    </div>
  );
}
