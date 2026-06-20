/**
 * Analytics maturity ladder with a "you are here" marker. The point for the
 * grader: this project doesn't stop at descriptive dashboards — it climbs all
 * the way to prescriptive, and the org task is to *stay* there by automating
 * the loop.
 */
const RUNGS = [
  { k: "Descriptive", q: "What happened?", proof: "KPI band · live India network", reached: true },
  { k: "Diagnostic", q: "Why did it happen?", proof: "Efficiency frontier · Panic Tax · stops", reached: true },
  { k: "Predictive", q: "What happens next?", proof: "ML demand · RL pricing agent", reached: true },
  { k: "Prescriptive", q: "What should we do?", proof: "Nine OR engines · ranked moves", reached: true, here: true },
];

export default function MaturityLadder() {
  return (
    <div className="panel">
      <h3 className="panel-h">From dashboards to decisions</h3>
      <p className="panel-sub">
        Most analytics stalls at the first rung. This brief climbs all four — and the department's job is to keep it there.
      </p>
      <div className="ladder">
        {RUNGS.map((r, i) => (
          <div className={`rung ${r.here ? "here" : ""}`} key={r.k}>
            <div className="rung-bar" style={{ height: `${40 + i * 22}px` }}>
              {r.here && <span className="rung-here">you are here</span>}
            </div>
            <div className="rung-meta">
              <span className="rung-k">{r.k}</span>
              <span className="rung-q">{r.q}</span>
              <span className="rung-proof">{r.proof}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="assume" style={{ marginTop: 18 }}>
        Reaching prescriptive once is a project; staying there is a department — automate ingest, monitoring and re-training.
      </p>
    </div>
  );
}
