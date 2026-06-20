import { useEffect, useState } from "react";
import { getMcdm } from "../api.js";

// 1 (poor) -> red, 5 (great) -> green
function scoreColor(s) {
  const hue = 8 + ((s - 1) / 4) * 130;
  return `hsl(${hue}, 70%, 48%)`;
}

export default function McdmRanking() {
  const [d, setD] = useState(null);
  useEffect(() => { getMcdm().then(setD).catch(() => {}); }, []);

  const ranking = d?.ranking || [];
  const criteria = d?.criteria || [];
  // columns in move order (1,2,3) for the score matrix
  const cols = [...ranking].sort((a, b) => a.move.localeCompare(b.move));
  const maxCi = Math.max(...ranking.map((r) => r.closeness), 0.001);

  return (
    <div className="panel">
      <h3 className="panel-h">Which move first — multi-criteria decision (TOPSIS)</h3>
      <p className="panel-sub">
        Three good moves, six competing criteria, no single winner on all of them. TOPSIS scores each move by how close
        it sits to the <b>ideal</b> solution and how far from the <b>worst</b> — collapsing the trade-off into one
        ranked answer, cross-checked against a simple weighted sum.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">Do this first</div>
          <div className="v" style={{ color: "var(--positive)", fontSize: 19 }}>
            {ranking[0] ? ranking[0].move.replace(/^\d+\s*-\s*/, "") : "—"}
          </div>
        </div>
        <div className="readout">
          <div className="l">#1 stable across weightings</div>
          <div className="v" style={{ color: "var(--positive)" }}>
            {d ? `${d.weight_stability_pct}%` : "—"}
          </div>
          {d && <div className="reur">of {d.n_weight_draws.toLocaleString("en-US")} perturbed weight sets</div>}
        </div>
        <div className="readout">
          <div className="l">Methods agree?</div>
          <div className="v" style={{ color: d?.methods_agree ? "var(--positive)" : "var(--accent)" }}>
            {d ? (d.methods_agree ? "Yes" : "No") : "—"}
          </div>
          {d && <div className="reur">TOPSIS = weighted-sum #1</div>}
        </div>
      </div>

      {/* ranked closeness bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18 }}>
        {ranking.map((r) => (
          <div key={r.move} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", width: 24 }}>
              #{r.rank}
            </span>
            <span style={{ width: 200, fontSize: 14, fontWeight: r.rank === 1 ? 700 : 500 }}>{r.move}</span>
            <div style={{ flex: 1, height: 14, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${(r.closeness / maxCi) * 100}%`, height: "100%",
                background: r.rank === 1 ? "var(--positive)" : "var(--data-blue-bright)",
                borderRadius: 999, transition: "width 0.8s ease-out",
                boxShadow: r.rank === 1 ? "0 0 16px rgba(27,164,124,0.55)" : "none",
              }} />
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, minWidth: 42, textAlign: "right" }}>
              {r.closeness.toFixed(3)}
            </span>
          </div>
        ))}
      </div>

      {/* criteria score matrix */}
      <div style={{ overflowX: "auto", marginTop: 20 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Criterion</th>
              <th className="num">Weight</th>
              {cols.map((c) => (
                <th key={c.move} className="num" title={c.move}>
                  {c.move.match(/^\d+/)?.[0] ? `Move ${c.move.match(/^\d+/)[0]}` : c.move}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((cr) => (
              <tr key={cr.key}>
                <td>{cr.label}</td>
                <td className="num" style={{ color: "var(--text-muted)" }}>{Math.round(cr.weight * 100)}%</td>
                {cols.map((c) => {
                  const s = c.scores[cr.key];
                  return (
                    <td key={c.move} className="num">
                      <span style={{
                        display: "inline-block", minWidth: 26, padding: "2px 6px", borderRadius: 6,
                        color: "#fff", fontWeight: 600, background: scoreColor(s),
                      }}>{s}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="chart-caption">
        The pricing move wins because it scores well on the heaviest criteria (revenue, speed, low capex, reversibility)
        without being worst anywhere. The premium cabin is the long-game #2 — top revenue and moat, but capex-heavy and
        slow. A ranking is only a finding if it survives the weights: we re-ran TOPSIS across{" "}
        {d ? d.n_weight_draws.toLocaleString("en-US") : "4,000"} randomly perturbed weightings and the #1 move holds{" "}
        {d ? `${d.weight_stability_pct}%` : ""} of the time — not just an opinion about weights.
      </p>
      <div className="assume">
        Criteria scored 1–5 (calibrated to the findings); weights a labelled judgement. TOPSIS, cross-checked vs weighted sum.
      </div>
    </div>
  );
}
