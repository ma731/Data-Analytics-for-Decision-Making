/**
 * The honesty exhibit: half a prescriptive engine runs on data we don't fully
 * have yet. Naming the gap — and who closes it — is exactly the expectation
 * management a data-driven department lives or dies on.
 */
const STATUS = {
  have: { label: "Have", cls: "rs-have" },
  proxy: { label: "Proxy", cls: "rs-proxy" },
  gap: { label: "Gap", cls: "rs-gap" },
};

const ROWS = [
  { asset: "Fares & seats sold", status: "have", unlocks: "Every chart in this room, today", owner: "Data Eng" },
  { asset: "Fuel burn per flight", status: "proxy", unlocks: "The efficiency frontier — modelled from physics", owner: "Data Sci + Ops" },
  { asset: "Live booking curve", status: "gap", unlocks: "Real-time dynamic pricing", owner: "Data Eng" },
  { asset: "Competitor fares", status: "gap", unlocks: "Price positioning vs IndiGo", owner: "Data Eng" },
  { asset: "Cost ledger (ATF, crew, lease)", status: "proxy", unlocks: "True margin per route, not proxy revenue", owner: "Finance + DE" },
];

export default function DataReadiness() {
  return (
    <div className="panel">
      <h3 className="panel-h">What&rsquo;s real, what&rsquo;s still a gap</h3>
      <p className="panel-sub">
        We label every input. The findings are sound on what we have; the prize gets bigger as the gaps close — and each gap has a named owner.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl readiness">
          <thead>
            <tr>
              <th>Data asset</th>
              <th>Status</th>
              <th>What it unlocks</th>
              <th>Owner to close it</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.asset}>
                <td>{r.asset}</td>
                <td><span className={`rs-pill ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span></td>
                <td className="muted">{r.unlocks}</td>
                <td className="mono" style={{ fontSize: 12.5, color: "var(--accent)" }}>{r.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="assume" style={{ marginTop: 16 }}>
        Nothing here is invented data — proxies are labelled as models, gaps are named as gaps.
      </p>
    </div>
  );
}
