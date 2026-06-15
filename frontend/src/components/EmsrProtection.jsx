import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getEmsr, fmtINR } from "../api.js";
import { ChartTip, useCountUp } from "./ui.jsx";

export default function EmsrProtection() {
  const [d, setD] = useState(null);
  useEffect(() => { getEmsr().then(setD).catch(() => {}); }, []);

  const protect = useCountUp(d?.protection_optimal ?? 0, { duration: 700, format: (v) => Math.round(v) });
  const uplift = useCountUp(d?.uplift_pct ?? 0, { duration: 700, format: (v) => v.toFixed(0) });

  return (
    <div className="panel">
      <h3 className="panel-h">Seat protection — Littlewood&rsquo;s rule, solved exactly</h3>
      <p className="panel-sub">
        One cabin, two fares. Economy books early and cheap; Business books late and pays{" "}
        <b style={{ color: "var(--brand-gold)" }}>{d?.fare_ratio ?? "—"}×</b> more. How many seats should we
        <i> protect</i> for Business instead of selling them off early? Littlewood gives the exact answer — the
        optimum the RL agent only learns toward.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">Protect for Business</div>
          <div className="v" style={{ color: "var(--brand-gold)" }}>{protect} seats</div>
        </div>
        <div className="readout">
          <div className="l">Economy booking limit</div>
          <div className="v">{d?.booking_limit_economy ?? "—"}</div>
        </div>
        <div className="readout">
          <div className="l">Revenue vs no protection</div>
          <div className="v" style={{ color: "var(--positive)" }}>+{uplift}%</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 300, marginTop: 18 }}>
        <ResponsiveContainer>
          <AreaChart data={d?.curve || []} margin={{ top: 12, right: 18, bottom: 26, left: 8 }}>
            <defs>
              <linearGradient id="emsrFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c99a3b" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#c99a3b" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="protection" stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              label={{ value: "Seats protected for Business  →", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} domain={["auto", "auto"]} />
            <Tooltip content={<ChartTip render={(p) => (
              <div>
                <div className="muted">{p[0]?.payload.protection} seats protected</div>
                <div className="muted">Exp. revenue/departure{" "}
                  <b style={{ color: "var(--brand-gold)" }}>{fmtINR(p[0]?.payload.revenue)}</b></div>
              </div>
            )} />} />
            <Area dataKey="revenue" type="monotone" stroke="#c99a3b" strokeWidth={3}
              fill="url(#emsrFill)" isAnimationActive animationDuration={700} />
            {d && <ReferenceLine x={d.protection_optimal} stroke="var(--positive)" strokeWidth={2}
              strokeDasharray="5 4"
              label={{ value: `optimum · ${d.protection_optimal}`, position: "top", fill: "var(--positive)", fontSize: 12 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Revenue per departure is concave in the protection level: protect too few and we give premium seats
        away cheap; protect too many and they fly empty. The peak is the exact Littlewood optimum.
      </p>
      <div className="assume">
        Fares from the data; premium demand assumed (~{d ? Math.round(d.premium_share * 100) : 12}% of cabin, CV{" "}
        {d?.cv ?? 0.4}). Listings aren&rsquo;t bookings — demand is assumed, not counted.
      </div>
    </div>
  );
}
