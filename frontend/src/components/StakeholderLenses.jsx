import { fmtINR } from "../api.js";

/**
 * The same finding (the Panic Tax) retold for three audiences. This is the
 * "I know each point of view" exhibit: a CDO doesn't just find an insight,
 * they package it for the boardroom, the data scientist and the data engineer
 * — and set the right expectation with each.
 */
export default function StakeholderLenses({ f }) {
  const pt = f.panic_tax;
  const lenses = [
    {
      key: "board",
      role: "Boardroom",
      who: "CDO · CFO · CEO",
      cares: "The decision and the money — in one line.",
      give: [
        <>Lift the early-booking floor where <b>{pt.far_out_share}%</b> of demand sits; stop the {pt.multiplier}× last-minute swing.</>,
        <>Low capex, reversible inside a quarter — a slice of the recoverable upside, not a fare hike.</>,
      ],
      expect: "We frame it as pricing discipline, so brand trust is protected. The number is upside, owned by Revenue.",
    },
    {
      key: "ds",
      role: "Data Scientist",
      who: "modelling · uncertainty",
      cares: "Is the model sound, and how wrong could it be?",
      give: [
        <>Per-window linear-demand revenue model; the <b>{pt.multiplier}×</b> swing is measured, not assumed.</>,
        <>Stress-tested: the finding survives ±20% on every constant (the sensitivity tornado).</>,
      ],
      expect: "Set the expectation: it's directional on two months of fares — treat the rupee figure as a range, not a point.",
    },
    {
      key: "de",
      role: "Data Engineer",
      who: "pipeline · data contracts",
      cares: "What does it take to run this for real?",
      give: [
        <>Today it runs on a static export + a <b>physics fuel proxy</b> (no fuel field in the source).</>,
        <>To productionise: a live booking-curve feed, a data contract on fare/seat fields, real fuel telemetry.</>,
      ],
      expect: "No real-time pricing until the feed and an SLA exist — we agree that boundary up front.",
    },
  ];

  return (
    <div className="grid lenses">
      {lenses.map((l) => (
        <div className={`panel lens lens-${l.key}`} key={l.key}>
          <div className="lens-head">
            <span className="lens-role">{l.role}</span>
            <span className="lens-who">{l.who}</span>
          </div>
          <p className="lens-cares">{l.cares}</p>
          <div className="lens-give">
            <span className="lens-k">What we hand them</span>
            <ul>
              {l.give.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </div>
          <p className="lens-expect">
            <span className="lens-expect-k">Expectation set</span>
            {l.expect}
          </p>
        </div>
      ))}
    </div>
  );
}
