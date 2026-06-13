import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getShadow, fmtINR, crToEUR } from "../api.js";
import { ChartTip, useCountUp } from "./ui.jsx";

export default function ShadowPrices() {
  const [d, setD] = useState(null);
  useEffect(() => { getShadow().then(setD).catch(() => {}); }, []);

  const perHour = useCountUp(d?.shadow_price_per_block_hour ?? 0, { duration: 800, format: (v) => Math.round(v) });

  return (
    <div className="panel">
      <h3 className="panel-h">Shadow prices — what one more aircraft-hour is worth</h3>
      <p className="panel-sub">
        The integer program says <i>what</i> to fly; its LP relaxation says <i>what capacity is worth</i>. The dual of
        the fleet block-hour budget is the <b>shadow price</b>: the extra weekly contribution unlocked by one more hour
        of flying — the exact &ldquo;should we lease another jet?&rdquo; number.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">Value of 1 block-hour</div>
          <div className="v" style={{ color: "var(--accent)" }}>{fmtINR(perHour)}</div>
        </div>
        <div className="readout">
          <div className="l">Value of 1 more aircraft / wk</div>
          <div className="v">{d ? `${d.value_per_aircraft_cr} cr` : "—"}</div>
          {d && <div className="reur">≈ {crToEUR(d.value_per_aircraft_cr)} · @ {d.assumed_aircraft_weekly_hours} h/wk</div>}
        </div>
        <div className="readout">
          <div className="l">Routes starved at the cap</div>
          <div className="v" style={{ color: "var(--brand-gold)" }}>{d ? d.routes_at_cap.length : "—"}</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 300, marginTop: 18 }}>
        <ResponsiveContainer>
          <AreaChart data={d?.sweep || []} margin={{ top: 12, right: 18, bottom: 26, left: 8 }}>
            <defs>
              <linearGradient id="capFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="hours" stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `${Math.round(v)}h`}
              label={{ value: "Fleet block-hours available  →", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${v}cr`} />
            <Tooltip content={<ChartTip render={(p) => (
              <div>
                <div className="muted">{Math.round(p[0]?.payload.hours)} block-hours</div>
                <div className="muted">Weekly contribution{" "}
                  <b style={{ color: "var(--data-blue-bright)" }}>₹{p[0]?.payload.contrib_cr} cr</b></div>
              </div>
            )} />} />
            <Area dataKey="contrib_cr" type="monotone" stroke="var(--data-blue-bright)" strokeWidth={3}
              fill="url(#capFill)" isAnimationActive animationDuration={700} />
            {d && <ReferenceLine x={d.block_hours} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4"
              label={{ value: "current fleet", position: "top", fill: "var(--accent)", fontSize: 12 }} />}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Contribution rises steeply with capacity, then flattens once every route hits its frequency cap. The slope at
        the current fleet line <i>is</i> the shadow price — while it&rsquo;s steep, more aircraft pay for themselves;
        where it flattens, growth must come from new routes, not more frequency.
      </p>
      <div className="assume">
        LP relaxation of the integer fleet program; the budget is set in the scarce regime (it binds) so the dual is
        informative. Contribution = fare revenue minus modelled fuel cost — directional, not a full P&amp;L.
      </div>
    </div>
  );
}
