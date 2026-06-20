import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartTip } from "./ui.jsx";
import { fmtINR } from "../api.js";

export default function BusinessWhitespace({ airlines, business }) {
  // economy fare by airline, flag the two that ALSO sell business class
  const data = airlines.map((a) => ({
    airline: a.airline,
    avg_price: a.avg_price,
    sells_business: a.sells_business,
  }));

  return (
    <div className="panel">
      <h3 className="panel-h">The Premium Whitespace</h3>
      <p className="panel-sub">
        Business class commands a{" "}
        <b style={{ color: "var(--brand-gold)" }}>{business.premium_multiple}× premium</b> (
        {fmtINR(business.business_avg)} vs {fmtINR(business.economy_avg)}) — yet only{" "}
        <b>{business.sellers.length} of 6</b> carriers sell it. Gold bars below already monetise the
        premium cabin; grey bars leave it on the table.
      </p>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)"
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="airline"
              width={84}
              tick={{ fill: "var(--text)", fontSize: 13 }}
              stroke="var(--border)"
            />
            <Tooltip
              cursor={{ fill: "rgba(96,165,250,0.06)" }}
              content={
                <ChartTip
                  render={(p) => {
                    const d = p[0].payload;
                    return (
                      <>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.airline}</div>
                        <div className="muted">
                          Avg economy fare:{" "}
                          <b style={{ color: "var(--text)" }}>{fmtINR(d.avg_price)}</b>
                        </div>
                        <div className="muted">
                          Sells business class:{" "}
                          <b style={{ color: d.sells_business ? "var(--brand-gold)" : "var(--text-muted)" }}>
                            {d.sells_business ? "Yes" : "No"}
                          </b>
                        </div>
                      </>
                    );
                  }}
                />
              }
            />
            <Bar dataKey="avg_price" name="Avg economy fare" radius={[0, 6, 6, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.sells_business ? "var(--brand-gold)" : "#2c332e"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Air India and Vistara — the two Tata carriers — are the <b>only</b> two selling business
        class, at {fmtINR(business.air_india_business_avg)} and {fmtINR(business.vistara_business_avg)}{" "}
        respectively. The merged group owns India's premium-cabin supply outright.
      </p>
    </div>
  );
}
