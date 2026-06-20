/**
 * The control rack: an at-a-glance, navigable index of all nine OR engines,
 * grouped into banks. Turns the long chart-by-chart stretch into a console you
 * can survey and jump around — and lands the "nine live systems" breadth fast.
 */
const BANKS = [
  {
    bank: "Bank I · Risk & the frontier",
    items: [
      { id: "or-sim", tag: "Simulation", name: "Monte Carlo", decides: "how much fuel-cost risk we carry" },
      { id: "or-pareto", tag: "Genetic", name: "NSGA-II Pareto", decides: "the best fuel ↔ revenue trade-offs" },
    ],
  },
  {
    bank: "Bank II · The network",
    items: [
      { id: "or-fleet", tag: "Integer prog.", name: "Fleet MILP", decides: "which routes to fly" },
    ],
  },
  {
    bank: "Bank III · Pricing & demand",
    items: [
      { id: "or-rl", tag: "Reinforcement", name: "Q-learning agent", decides: "a self-learned pricing policy" },
      { id: "or-rev", tag: "Revenue mgmt", name: "Price optimiser", decides: "the fare curve to fly" },
      { id: "or-emsr", tag: "Exact RM", name: "EMSR protection", decides: "seats to hold for Business" },
    ],
  },
  {
    bank: "Bank IV · Capacity & efficiency",
    items: [
      { id: "or-shadow", tag: "LP duality", name: "Shadow prices", decides: "what one more aircraft is worth" },
      { id: "or-dea", tag: "DEA", name: "Efficiency frontier", decides: "each route's improvement target" },
    ],
  },
  {
    bank: "Bank V · Defensibility",
    items: [
      { id: "or-sens", tag: "Sensitivity", name: "Tornado test", decides: "whether the findings hold" },
    ],
  },
];

export default function EngineRack() {
  const jump = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="engine-rack">
      <div className="rack-head">
        <span className="rack-k">The control rack · nine live engines</span>
        <span className="rack-sub">Each runs on the server. Jump to any — or read straight through.</span>
      </div>
      <div className="rack-banks">
        {BANKS.map((b) => (
          <div className="rack-bank" key={b.bank}>
            <div className="rack-bank-label">{b.bank}</div>
            <div className="rack-chips">
              {b.items.map((it) => (
                <a className="rack-chip" key={it.id} href={`#${it.id}`} onClick={jump(it.id)}>
                  <span className="rack-live" aria-hidden="true" />
                  <span className="rack-tag">{it.tag}</span>
                  <span className="rack-name">{it.name}</span>
                  <span className="rack-decides">{it.decides}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
