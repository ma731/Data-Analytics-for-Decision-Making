import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { getSensitivity } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function SensitivityTornado() {
  const [d, setD] = useState(null);
  useEffect(() => { getSensitivity().then(setD).catch(() => {}); }, []);

  const data = (d?.bars || []).map((b) => {
    const lo = Math.min(b.low, b.high);
    const hi = Math.max(b.low, b.high);
    return { param: b.param, low: b.low, high: b.high, range: [lo, hi] };
  });
  // axis padding around the swing
  const all = data.flatMap((r) => r.range);
  const dmin = all.length ? Math.min(...all, d.baseline_value) - 0.2 : 0;
  const dmax = all.length ? Math.max(...all, d.baseline_value) + 0.2 : 5;

  return (
    <div className="panel">
      <h3 className="panel-h">Stress test — does the story survive wrong assumptions?</h3>
      <p className="panel-sub">
        Every fuel number is an engineered estimate, so we attack our own model: swing each constant{" "}
        <b>±{d?.pct ?? 20}%</b> and recompute the conclusions. If the findings barely move, the exact constants
        don&rsquo;t matter — the story is real.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">Frontier ranking stability</div>
          <div className="v" style={{ color: "var(--positive)" }}>
            {d ? d.rank_stability.min_spearman : "—"}
          </div>
          <div className="reur">min Spearman, {d?.rank_stability.scenarios ?? 0} scenarios</div>
        </div>
        <div className="readout">
          <div className="l">Efficiency spread (baseline)</div>
          <div className="v">{d ? `${d.baseline_value}×` : "—"}</div>
        </div>
        <div className="readout">
          <div className="l">2-stop fuel penalty</div>
          <div className="v" style={{ color: "var(--accent)" }}>
            {d ? `${d.stops_gap.min}–${d.stops_gap.max}×` : "—"}
          </div>
          <div className="reur">holds across all swings</div>
        </div>
      </div>

      <div style={{ width: "100%", height: 260, marginTop: 18 }}>
        <ResponsiveContainer>
          <BarChart layout="vertical" data={data} margin={{ top: 8, right: 24, bottom: 24, left: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[dmin, dmax]} stroke="var(--border)"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickFormatter={(v) => `${v.toFixed(1)}×`}
              label={{ value: d?.metric_label || "", position: "bottom", offset: 10, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis type="category" dataKey="param" width={185} stroke="var(--border)"
              tick={{ fill: "var(--text)", fontSize: 12 }} />
            <Tooltip cursor={{ fill: "rgba(96,165,250,0.06)" }} content={<ChartTip render={(p) => {
              const r = p[0]?.payload;
              return (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.param}</div>
                  <div className="muted">spread ranges <b style={{ color: "var(--text)" }}>{r.low}× → {r.high}×</b></div>
                </div>
              );
            }} />} />
            {d && <ReferenceLine x={d.baseline_value} stroke="var(--brand-gold)" strokeWidth={2}
              label={{ value: `baseline ${d.baseline_value}×`, position: "top", fill: "var(--brand-gold)", fontSize: 12 }} />}
            <Bar dataKey="range" radius={4} isAnimationActive animationDuration={700}>
              {data.map((_, i) => <Cell key={i} fill="var(--data-blue)" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-caption">
        Each bar is how far the best-vs-worst route efficiency moves when that constant is off by 20%. The gold line is
        our baseline. The bars are short and the ranking holds (Spearman {d?.rank_stability.min_spearman ?? "≈1"}) — so the
        conclusion isn&rsquo;t an artifact of any single guessed number.
      </p>
    </div>
  );
}
