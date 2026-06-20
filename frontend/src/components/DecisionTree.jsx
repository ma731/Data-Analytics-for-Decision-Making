import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getDecision, crToEUR } from "../api.js";
import { ChartTip, useCountUp } from "./ui.jsx";

const ACT_COLOR = {
  Aggressive: "var(--brand-red)",
  Conservative: "var(--data-blue-bright)",
  "Do nothing": "var(--text-muted)",
};

export default function DecisionTree() {
  const [d, setD] = useState(null);
  useEffect(() => { getDecision().then(setD).catch(() => {}); }, []);

  const bestEmv = useCountUp(d?.best_emv_cr ?? 0, { duration: 800, format: (v) => v.toFixed(0) });
  const acts = d?.acts || [];

  return (
    <div className="panel">
      <h3 className="panel-h">Decision tree — how hard to push dynamic pricing</h3>
      <p className="panel-sub">
        A decision under uncertainty. We don&rsquo;t know how price-sensitive demand will react, so we weigh each option
        by its <b>expected monetary value</b> (EMV) across both futures — then ask how confident we&rsquo;d need to be
        for the answer to change.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">Best decision (max EMV)</div>
          <div className="v" style={{ color: "var(--brand-red)", fontSize: 22 }}>{d ? d.best_act : "—"}</div>
          {d && <div className="reur">₹{bestEmv} cr / yr ≈ {crToEUR(d.best_emv_cr)}</div>}
        </div>
        <div className="readout">
          <div className="l">EVPI — value of perfect research</div>
          <div className="v" style={{ color: "var(--accent)" }}>{d ? `₹${d.evpi_cr} cr` : "—"}</div>
          {d && <div className="reur">≈ {crToEUR(d.evpi_cr)} — the most to pay to remove the doubt</div>}
        </div>
        <div className="readout">
          <div className="l">Decision flips below</div>
          <div className="v">{d && d.flip_probability != null ? `${Math.round(d.flip_probability * 100)}%` : "—"}</div>
          {d && <div className="reur">we believe {Math.round(d.current_p_hold * 100)}% — comfortably clear</div>}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Decision</th>
              <th className="num">Demand holds</th>
              <th className="num">Demand softens</th>
              <th className="num">EMV (₹cr/yr)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {acts.map((a) => (
              <tr key={a.act} style={a.recommended ? { background: "rgba(91,227,173,0.09)" } : undefined}>
                <td style={{ color: ACT_COLOR[a.act], fontWeight: 600 }}>{a.act}</td>
                <td className="num">{a.payoff_hold_cr}</td>
                <td className="num">{a.payoff_soften_cr}</td>
                <td className="num" style={{ fontWeight: 700 }}>{a.emv_cr}</td>
                <td>{a.recommended && <span className="pill yes">pick</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ width: "100%", height: 280, marginTop: 18 }}>
        <ResponsiveContainer>
          <LineChart data={d?.sweep || []} margin={{ top: 16, right: 18, bottom: 26, left: 8 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="p_hold" type="number" domain={[0, 1]} stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              label={{ value: "P(demand holds)  →", position: "bottom", offset: 12, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis stroke="var(--border)" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `₹${v}cr`} />
            <Tooltip content={<ChartTip render={(p) => (
              <div>
                <div className="muted">P(holds) = {Math.round((p[0]?.payload.p_hold ?? 0) * 100)}%</div>
                {p.map((s) => (
                  <div key={s.name} style={{ color: s.color }}>{s.name}: ₹{s.value} cr</div>
                ))}
              </div>
            )} />} />
            <Line dataKey="Aggressive" type="monotone" stroke="var(--brand-red)" strokeWidth={3} dot={false} isAnimationActive animationDuration={700} />
            <Line dataKey="Conservative" type="monotone" stroke="var(--data-blue-bright)" strokeWidth={3} dot={false} isAnimationActive animationDuration={700} />
            <Line dataKey="Do nothing" type="monotone" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive animationDuration={700} />
            {d && <ReferenceLine x={d.flip_probability} stroke="var(--accent)" strokeWidth={2} strokeDasharray="5 4"
              label={{ value: "flip", position: "top", fill: "var(--accent)", fontSize: 11 }} />}
            {d && <ReferenceLine x={d.current_p_hold} stroke="#fff" strokeWidth={1.5}
              label={{ value: "our belief", position: "top", fill: "#fff", fontSize: 11 }} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Above the amber <b>flip</b> line, pushing aggressively wins; below it, the gentle pilot is safer. Our belief
        (white line) sits far to the right of the flip — so the recommendation is robust, and the small EVPI confirms
        more research wouldn&rsquo;t change much.
      </p>
      <div className="assume">
        Payoffs = capture × gap × the far-out economy <b style={{ color: "var(--text-muted)" }}>passenger</b> base
        ({d ? `~${d.far_out_eco_pax_m}M` : "~3.3M"}, anchored to the cited 110M DGCA pax — not scrape rows). Probabilities
        and capture rates are labelled assumptions; the flip-line shows how little the conclusion depends on them.
      </div>
    </div>
  );
}
