/**
 * The execution close: the first 90 days that turn this analysis into a running
 * capability. Prove it, scale it, automate it.
 */
const PHASES = [
  {
    tag: "Days 0–30",
    title: "Prove & instrument",
    owner: "Revenue + Data Eng",
    points: [
      "Ship the early-booking price floor as a pilot on the top 5 metro routes.",
      "Stand up the live booking-curve feed with a data contract.",
    ],
    out: "First recovered rupees, measured.",
  },
  {
    tag: "Days 31–60",
    title: "Scale & connect",
    owner: "Data Sci + Data Eng",
    points: [
      "Roll pricing discipline across all metro routes.",
      "Integrate fuel telemetry to replace the physics proxy; add a competitor feed.",
    ],
    out: "True margin per route, live.",
  },
  {
    tag: "Days 61–90",
    title: "Automate & institutionalise",
    owner: "Whole department",
    points: [
      "Run the RL pricing agent in shadow mode beside human pricing.",
      "Weekly war-room + decision log + model-drift monitoring become routine.",
    ],
    out: "A loop that runs itself.",
  },
];

export default function ActivationRoadmap() {
  return (
    <div className="roadmap">
      {PHASES.map((p, i) => (
        <div className="rm-phase" key={p.tag}>
          <div className="rm-rail" aria-hidden="true">
            <span className="rm-dot" />
            {i < PHASES.length - 1 && <span className="rm-line" />}
          </div>
          <div className="panel rm-card">
            <span className="rm-tag">{p.tag}</span>
            <h3 className="rm-title">{p.title}</h3>
            <ul className="rm-points">
              {p.points.map((pt, j) => <li key={j}>{pt}</li>)}
            </ul>
            <div className="rm-foot">
              <span className="rm-owner">{p.owner}</span>
              <span className="rm-out">{p.out}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
