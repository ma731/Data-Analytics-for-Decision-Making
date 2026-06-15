import { fmtINR, fmtNum1, inrToEUR } from "../api.js";

// The business case behind each of the three moves, in plain board-memo language:
// what we're wagering, the upside, the honest downside, and how we de-risk it.
// Numbers are pulled live from the same findings the recommendations use.
export default function StrategicRationale({ f }) {
  const pc = f.opportunity.panic_capture;
  const sf = f.opportunity.stops_fuel;
  const fuelSaveInr = Math.round((sf.fuel_save_kg_per_seat / 0.8) * 100);

  const moves = [
    {
      cls: "s1",
      num: "01",
      title: "Re-time the revenue curve",
      bet: "Raise the floor on the cheapest early seats with disciplined dynamic pricing — capture value we give away today, without the punishing last-minute spike.",
      edge: "Pure software. No new aircraft, no capex, fully reversible — and it pays back in weeks, not years.",
      catch:
        "Push too hard and price-sensitive leisure flyers defect to IndiGo; early load factors can soften, and “Air India got expensive” is a real optic.",
      hedge:
        "Segment by corridor: raise only where Air India has pricing power, hold the line where IndiGo (55.7%) dominates. Pilot at 15% capture, A/B by route, and set a tripwire — roll back any corridor a rival matches within two weeks.",
      chips: ["Software-only", "Fully reversible", "Cash in weeks"],
      payoff: (
        <>
          + {fmtINR(pc.uplift_per_far_seat_inr)} ({inrToEUR(pc.uplift_per_far_seat_inr)}) / seat across{" "}
          {pc.far_out_flights.toLocaleString("en-US")} far-out bookings
        </>
      ),
    },
    {
      cls: "s2",
      num: "02",
      title: "Kill the inefficient connections",
      bet: "Re-route 2+ stop traffic onto nonstop and single-connection metal — the rare move that cuts fare, fuel and carbon at once.",
      edge: "Structural, not tactical: it lowers unit cost permanently and hands us an ESG story the low-cost carriers can’t match.",
      catch:
        "Only ~6% of traffic flies 2+ stops, so the absolute prize is modest; slots, schedule and hub-feed constraints make it harder to run than a price change.",
      hedge:
        "Attack the worst routes first — the DEA model names each laggard and its efficient peer — and phase the re-banking over schedule seasons.",
      chips: ["Structural", "ESG + cost", "Phased rollout"],
      payoff: (
        <>
          − {fmtNum1(sf.fuel_save_kg_per_seat)} kg fuel & {fmtNum1(sf.co2_save_kg_per_seat)} kg CO₂ / seat
          {" "}(≈ {fmtINR(fuelSaveInr)} / {inrToEUR(fuelSaveInr)} saved)
        </>
      ),
    },
    {
      cls: "s3",
      num: "03",
      title: "Own the premium cabin",
      bet: "Protect and grow business class — the merged Tata group’s profit engine — before any rival can build the fleet and product to copy it.",
      edge: `An ${f.business.premium_multiple}× revenue-per-seat segment that only two of six carriers can even sell. A structural moat, not a promotion.`,
      catch:
        "Cabins, lounges and service are capex-heavy with a longer payback, and premium demand is exposed if corporate travel softens or we over-supply.",
      hedge:
        "Bank the win with zero capex first — EMSR seat protection optimises the inventory we already fly — then grow the hard assets selectively.",
      chips: ["Capex-heavy", "Hard to copy", "Long payback"],
      payoff: (
        <>
          {f.business.premium_multiple}× per premium seat — {inrToEUR(f.business.business_avg)} vs{" "}
          {inrToEUR(f.business.economy_avg)}
        </>
      ),
    },
  ];

  return (
    <div className="grid strat-grid">
      {moves.map((m) => (
        <article key={m.cls} className={`panel strat ${m.cls}`}>
          <div className="strat-head">
            <span className="strat-num">{m.num}</span>
            <h3 className="strat-title">{m.title}</h3>
          </div>

          <p className="strat-bet">{m.bet}</p>

          <div className="strat-ledger">
            <div className="strat-row edge">
              <span className="strat-k">The edge</span>
              <p>{m.edge}</p>
            </div>
            <div className="strat-row catch">
              <span className="strat-k">The catch</span>
              <p>{m.catch}</p>
            </div>
            <div className="strat-row hedge">
              <span className="strat-k">The hedge</span>
              <p>{m.hedge}</p>
            </div>
          </div>

          <div className="strat-chips">
            {m.chips.map((c) => (
              <span key={c} className="strat-chip">
                {c}
              </span>
            ))}
          </div>

          <div className="strat-payoff">{m.payoff}</div>
        </article>
      ))}
    </div>
  );
}
