/**
 * The capability, not just the analysis: how a data-driven department actually
 * runs. A data→decision flywheel (who owns each hop), a RACI for the three
 * moves so expectations are explicit, and the principles the team lives by.
 */

const FLYWHEEL = [
  { step: "Ingest", owner: "Data Engineering", desc: "Fares, schedules, fuel telemetry into one trusted store." },
  { step: "Model", owner: "Data Science", desc: "Physics, OR and ML turn rows into options — with stated uncertainty." },
  { step: "Frame", owner: "Analytics Translator", desc: "Each result retold for its audience; every assumption labelled." },
  { step: "Decide", owner: "Revenue & Exec", desc: "One move chosen, owned and scheduled — not a dashboard admired." },
  { step: "Measure", owner: "Whole loop", desc: "Outcome tracked weekly; the result feeds the next ingest." },
];

const ROLES = ["Data Eng", "Data Sci", "Revenue", "CFO / Exec"];
const MOVES = [
  { move: "Dynamic price floor", raci: ["C", "R", "A", "I"] },
  { move: "Cut wasteful connections", raci: ["R", "C", "I", "A"] },
  { move: "Grow the Business cabin", raci: ["C", "C", "R", "A"] },
];
const RACI_LABEL = { R: "Responsible", A: "Accountable", C: "Consulted", I: "Informed" };

const PRINCIPLES = [
  ["Decisions over dashboards", "A chart that doesn't change a decision is overhead."],
  ["Estimates wear a label", "Every modelled number is marked an estimate, with its assumption shown."],
  ["One source of truth", "The same engine serves every chart — no forked spreadsheets."],
  ["Defensibility before precision", "A finding that survives being wrong beats a precise guess."],
  ["Ship, measure, learn", "A weekly war-room and a decision log keep the loop turning."],
];

export default function OperatingModel() {
  return (
    <div className="grid" style={{ gap: 22 }}>
      {/* the flywheel */}
      <div className="panel">
        <h3 className="panel-h">The data → decision flywheel</h3>
        <p className="panel-sub">Insight only counts when the loop closes. Each hop has a clear owner.</p>
        <div className="flywheel">
          {FLYWHEEL.map((s, i) => (
            <div className="flow-step" key={s.step}>
              <div className="flow-card">
                <span className="flow-owner">{s.owner}</span>
                <span className="flow-name">{s.step}</span>
                <span className="flow-desc">{s.desc}</span>
              </div>
              <span className="flow-arrow" aria-hidden="true">{i === FLYWHEEL.length - 1 ? "↺" : "→"}</span>
            </div>
          ))}
        </div>
        <p className="assume" style={{ marginTop: 16 }}>Last hop loops back: the measured outcome becomes next week's input.</p>
      </div>

      {/* RACI — expectations made explicit */}
      <div className="panel">
        <h3 className="panel-h">Who owns what — the three moves</h3>
        <p className="panel-sub">Expectations set before work starts: one Accountable, one Responsible per move.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl raci">
            <thead>
              <tr>
                <th>Move</th>
                {ROLES.map((r) => <th key={r} className="num">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {MOVES.map((m) => (
                <tr key={m.move}>
                  <td>{m.move}</td>
                  {m.raci.map((c, i) => (
                    <td key={i} className="num">
                      <span className={`raci-pill r-${c}`} title={RACI_LABEL[c]}>{c}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="raci-legend">
          {Object.entries(RACI_LABEL).map(([k, v]) => (
            <span key={k}><b className={`raci-pill r-${k}`}>{k}</b> {v}</span>
          ))}
        </div>
      </div>

      {/* the mindset */}
      <div className="panel">
        <h3 className="panel-h">The mindset we run on</h3>
        <div className="principles">
          {PRINCIPLES.map(([t, d], i) => (
            <div className="principle" key={t}>
              <span className="principle-n mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
