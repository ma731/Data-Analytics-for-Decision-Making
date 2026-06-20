import { useEffect, useState } from "react";
import { getFindings, getContext } from "./api.js";
import { Section, useReveal } from "./components/ui.jsx";
import KpiBand from "./components/KpiBand.jsx";
import Frontier from "./components/Frontier.jsx";
import PanicTax from "./components/PanicTax.jsx";
import StopsCrime from "./components/StopsCrime.jsx";
import BusinessWhitespace from "./components/BusinessWhitespace.jsx";
import RouteExplorer from "./components/RouteExplorer.jsx";
import Recommendations from "./components/Recommendations.jsx";
import StrategicRationale from "./components/StrategicRationale.jsx";
import DecisionTree from "./components/DecisionTree.jsx";
import McdmRanking from "./components/McdmRanking.jsx";
import MarketSizing from "./components/MarketSizing.jsx";
import FlightBackground from "./components/FlightBackground.jsx";
import Hero from "./components/Hero.jsx";
import LiveMap from "./components/LiveMap.jsx";
import SplitFlap from "./components/SplitFlap.jsx";
import Banner from "./components/Banner.jsx";
import Finale from "./components/Finale.jsx";
import GuidedTour from "./components/GuidedTour.jsx";
import MonteCarlo from "./components/MonteCarlo.jsx";
import ParetoEvolution from "./components/ParetoEvolution.jsx";
import FleetMap from "./components/FleetMap.jsx";
import RLAgent from "./components/RLAgent.jsx";
import PriceOptimizer from "./components/PriceOptimizer.jsx";
import MLDemand from "./components/MLDemand.jsx";
import EmsrProtection from "./components/EmsrProtection.jsx";
import ShadowPrices from "./components/ShadowPrices.jsx";
import DeaEfficiency from "./components/DeaEfficiency.jsx";
import SensitivityTornado from "./components/SensitivityTornado.jsx";
import EngineRack from "./components/EngineRack.jsx";
import StakeholderLenses from "./components/StakeholderLenses.jsx";
import OperatingModel from "./components/OperatingModel.jsx";
import MaturityLadder from "./components/MaturityLadder.jsx";
import DataReadiness from "./components/DataReadiness.jsx";
import ActivationRoadmap from "./components/ActivationRoadmap.jsx";
import Conclusion from "./components/Conclusion.jsx";
import "./components/components.css";

function Reveal({ children }) {
  const ref = useReveal();
  return <div ref={ref}>{children}</div>;
}

// Top-level act divider — the three movements of the story (Diagnosis → OR → Strategy).
function ActHero({ num, kicker, title, sub, id }) {
  return (
    <div className="or-hero act-hero" id={id}>
      <div className="act-num" aria-hidden="true">{num}</div>
      <div className="kicker">{kicker}</div>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function CommandBar() {
  return (
    <header className="cmdbar">
      <div className="brand">
        <img src="/airindia-logo.svg" alt="Air India" style={{ height: 26 }} />
        <span style={{ color: "var(--text-muted)", fontWeight: 500, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.12em" }}>
          WAR ROOM
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span className="tag" style={{ color: "var(--brand-gold)", borderColor: "rgba(91,227,173,0.4)" }}>
          ₹90 ≈ €1 · 1 crore = 10M
        </span>
        <span className="tag">CDO BRIEFING</span>
        <span className="tag">DATA: FEB–MAR 2022</span>
      </div>
    </header>
  );
}

export default function App() {
  const [f, setF] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getFindings(), getContext()])
      .then(([findings, context]) => {
        setF(findings);
        setCtx(context);
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <>
        <CommandBar />
        <div className="state">
          Backend unreachable. Start it: <code>&nbsp;python backend/app.py</code>
        </div>
      </>
    );
  }
  if (!f) {
    return (
      <>
        <CommandBar />
        <div className="state">
          <span className="dots">Computing the fuel model across 300,153 flights</span>
        </div>
      </>
    );
  }

  return (
    <>
      {/* cinematic scroll journey: exterior aircraft → into the cabin → the airport */}
      <div className="cinematic-bg" aria-hidden="true">
        <div className="cine-layer cine-1" />
        <div className="cine-layer cine-2" />
        <div className="cine-layer cine-3" />
        <div className="cine-scrim" />
      </div>
      <FlightBackground />
      <div className="scroll-progress" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <GuidedTour />
      <Hero />
      <CommandBar />
      <main className="shell" id="war-room">
        <div className="act act--diagnosis">
        <ActHero
          num="I"
          kicker="Act I · The Diagnosis"
          title="What the data reveals"
          sub="Descriptive analytics: read 300,153 flights and the engineered fuel model to find where the money and the carbon are leaking — before prescribing anything."
        />

        <Section
          eyebrow="The opening diagnostic · January 2022, Tata takes the controls"
          title="A national carrier, just privatised. Two levers nobody is pulling: fuel and price."
          sub="This is the new owner's first look at the data — every domestic metro fare scraped in the first weeks under Tata. The dataset has no fuel field, so we engineered one from physics. What it reveals is worth crores."
          delay={0}
        >
          <KpiBand f={f} />
        </Section>

        <Section
          id="tour-frontier"
          eyebrow="The hero view"
          title="Fuel and price are the same decision"
          sub="Plot every route by what it burns and what it earns, and the fleet sorts itself into winners and bleeders."
          delay={60}
        >
          <Frontier frontier={f.frontier} />
        </Section>

        <Section id="tour-panic" eyebrow="Finding 01 — Revenue" title="The Panic Tax" delay={60}>
          <div className="grid row-2">
            <PanicTax panic={f.panic_tax} />
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="callout">
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>We are giving seats away early, then gouging late.</b> The same seat swings{" "}
                  {f.panic_tax.multiplier}× in price with zero change in cost. That's not pricing —
                  it's leaving money on the runway in both directions.
                </div>
              </div>
              <p className="muted" style={{ lineHeight: 1.6, margin: 0 }}>
                A disciplined dynamic-pricing curve lifts the floor on early bookings — where{" "}
                <b style={{ color: "var(--text)" }}>{f.panic_tax.far_out_share}%</b> of demand sits —
                without needing the punishing last-minute spike that erodes trust.
              </p>
              <div className="aside-stats">
                <div className="aside-stat">
                  <div className="v">{f.panic_tax.multiplier}×</div>
                  <div className="l">fare swing, early → last-minute (same seat, same cost)</div>
                </div>
                <div className="aside-stat">
                  <div className="v" style={{ color: "var(--brand-gold)" }}>{f.panic_tax.far_out_share}%</div>
                  <div className="l">of seats sell in the cheapest, most under-priced window</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section eyebrow="Finding 02 — Fuel & cost" title="Connections cost twice" delay={60}>
          <div className="grid row-2 flip">
            <StopsCrime stops={f.stops} />
            <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="callout">
                <span className="dot" aria-hidden="true" />
                <div>
                  <b>The rare win-win-win.</b> Cutting wasteful connections lowers the fare, the fuel
                  bill, and the carbon footprint at the same time. Customer, CFO, and ESG officer all
                  cheer.
                </div>
              </div>
              <p className="muted" style={{ lineHeight: 1.6, margin: 0 }}>
                Takeoff and climb are the thirstiest phases of any flight. Every avoided stop is a
                takeoff cycle of fuel saved — which is why our model penalises stops directly rather
                than trusting gate-to-gate duration.
              </p>
              <div className="aside-stats">
                <div className="aside-stat">
                  <div className="v" style={{ color: "var(--data-blue-bright)" }}>
                    {(f.stops[2].avg_price / f.stops[0].avg_price).toFixed(1)}×
                  </div>
                  <div className="l">the fare of a nonstop, for a 2+ stop itinerary</div>
                </div>
                <div className="aside-stat">
                  <div className="v">
                    {(f.stops[2].avg_fuel_kg_per_seat / f.stops[0].avg_fuel_kg_per_seat).toFixed(1)}×
                  </div>
                  <div className="l">the fuel per seat, for the same 2+ stop trip</div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Banner
          img="/cabin-business.jpg"
          kicker="Finding 03 · Premium"
          title="The cabin that prints money"
          sub="Business class commands an 8× premium — and only Tata's two carriers sell it."
        />
        <Section eyebrow="Finding 03 — Premium" title="The whitespace only Tata can hold" delay={60}>
          <div className="premium-stage">
            <BusinessWhitespace airlines={f.airlines} business={f.business} />
          </div>
        </Section>

        <Section
          eyebrow="Prove it live"
          title="The model, on demand"
          sub="No pre-baked numbers. Pick a route and the server runs the fuel physics in real time — the same engine behind every chart."
          delay={60}
        >
          <RouteExplorer />
        </Section>

        <Banner
          img="/airindia-poster.jpg"
          kicker="The network"
          title="One country. Six metros. Always moving."
          align="right"
        />
        <Section
          id="tour-live"
          eyebrow="The network"
          title="India, live"
          sub="Every route Air India flies between the six metros — animated by real traffic, with live aircraft pulled from the open skies."
          delay={50}
        >
          <Reveal><SplitFlap /></Reveal>
          <div style={{ height: 18 }} />
          <Reveal><LiveMap /></Reveal>
        </Section>

        </div>{/* /act--diagnosis */}

        {/* ===================== ACT II · OPERATIONS RESEARCH ===================== */}
        <div className="act act--or">
        <div className="or-hero act-hero" id="or">
          <div className="act-num" aria-hidden="true">II</div>
          <div className="kicker">Act II · Operations Research</div>
          <h2>We don&rsquo;t just see the problem. We compute the answer.</h2>
          <p>
            Descriptive analytics tells you what happened. Operations research tells you exactly what to do. Nine live
            engines — simulation, genetic optimisation, integer &amp; linear programming, LP duality, reinforcement
            learning, machine learning, exact revenue management and data envelopment analysis — turn every finding above
            into a prescribed, optimal decision. Everything below runs live on the server.
          </p>
        </div>

        <EngineRack />

        <div className="sim-stage mc-stage">
          <div className="sim-stage-inner">
            <Section id="or-sim" bank="Bank I · Risk & the frontier" eyebrow="OR 01 · Simulation" title="How risky is the fuel bill?" sub="In plain terms: we ran thousands of 'what-if' years. Even in a bad one, this is the most the fuel bill could realistically reach — so we can budget for it with confidence." method={<><b>Monte Carlo simulation</b> runs the model thousands of times with random variation, turning one guess into a full range of outcomes. <b>Why it matters:</b> you plan for a bad year, not just the average.</>} delay={40}>
              <Reveal><MonteCarlo /></Reveal>
            </Section>
          </div>
        </div>

        <div className="sim-stage">
          <div className="sim-stage-inner">
            <Section id="or-pareto" eyebrow="OR 02 · Genetic optimisation" title="The provably-best fuel–revenue trade-offs" sub="In plain terms: there's no single best answer, only trade-offs between burning less fuel and earning more. Each point is a smart option; the marked one is the sweet spot." method={<><b>Genetic optimisation</b> evolves thousands of candidate plans, keeping the fittest each round. <b>Why it matters:</b> it finds the best balance when two goals compete and no single answer wins.</>} delay={40}>
              <Reveal><ParetoEvolution /></Reveal>
            </Section>
          </div>
        </div>

        <Section id="or-fleet" bank="Bank II · The network" eyebrow="OR 03 · Integer programming" title="The optimal route network" sub="In plain terms: given the aircraft and flying hours we have, this is the mix of routes that earns the most." method={<><b>Integer programming</b> picks the best whole-number combination under hard limits. <b>Why it matters:</b> it finds the provably optimal plan no person could compute by hand.</>} delay={40}>
          <Reveal><FleetMap /></Reveal>
        </Section>

        <Section id="or-rl" bank="Bank III · Pricing & demand" eyebrow="OR 04 · Reinforcement learning" title="An agent that teaches itself to price" sub="In plain terms: we let an AI learn pricing by trial and error. With no rules given, it taught itself to stop over-discounting and charge more as the plane fills — try it on any route below." method={<><b>Reinforcement learning</b> learns by trial and error, rewarded only for results. <b>Why it matters:</b> it discovers strategies on its own, adapting to patterns fixed rules miss.</>} delay={40}>
          <Reveal><RLAgent f={f} /></Reveal>
        </Section>

        <Section id="or-rev" eyebrow="OR 05 · Revenue management" title="The fare curve we should actually fly" sub="In plain terms: the green line is the fare we could charge; the blue line is what we charge today. The gap between them is money left on the table." method={<><b>Revenue management</b> models how demand reacts to price, then solves for the revenue-maximising fare. <b>Why it matters:</b> it replaces gut-feel discounting with the mathematically best price.</>} delay={40}>
          <div className="revenue-stage">
            <div className="grid row-2" style={{ maxWidth: 1240, margin: "0 auto" }}>
              <Reveal><PriceOptimizer /></Reveal>
              <Reveal><MLDemand /></Reveal>
            </div>
          </div>
        </Section>

        <Section
          id="or-emsr"
          eyebrow="OR 06 · Revenue management, solved exactly"
          title="How many seats to protect for Business"
          sub="In plain terms: don't sell every business seat early. Hold back about this many — late business buyers pay far more than discount leisure."
          method={<><b>Expected Marginal Seat Revenue (EMSR)</b> sets how many seats to hold back for higher-paying buyers. <b>Why it matters:</b> it stops you selling cheap the seats you could have sold dear.</>}
          delay={40}
        >
          <Reveal><EmsrProtection /></Reveal>
        </Section>

        <Section
          id="or-shadow"
          bank="Bank IV · Capacity & efficiency"
          eyebrow="OR 07 · Linear programming & duality"
          title="What one more aircraft is worth"
          sub="In plain terms: on the routes where we're turning customers away, this is what adding one more aircraft would earn us a year."
          method={<><b>Linear-programming duality</b> reveals the "shadow price" — the worth of one more unit of a scarce resource. <b>Why it matters:</b> it tells you exactly what an extra aircraft is worth before you buy one.</>}
          delay={40}
        >
          <Reveal><ShadowPrices /></Reveal>
        </Section>

        <Section
          id="or-dea"
          eyebrow="OR 08 · Data envelopment analysis"
          title="Every route scored, every laggard given a target"
          sub="In plain terms: we graded every route against the best performer, so each laggard gets a concrete, reachable target — not a vague 'do better'."
          method={<><b>Data envelopment analysis</b> scores each route against the best performers to draw an efficiency frontier. <b>Why it matters:</b> it benchmarks fairly and gives every laggard a reachable target.</>}
          delay={40}
        >
          <Reveal><DeaEfficiency /></Reveal>
        </Section>

        <Section
          id="or-sens"
          bank="Bank V · Defensibility"
          eyebrow="Defensibility · pressure-testing the model"
          title="The findings survive being wrong about the numbers"
          sub="In plain terms: we deliberately tried to break our own conclusions. Even if our key assumptions are off by 20%, the recommendation still holds."
          method={<><b>Sensitivity analysis</b> re-runs the conclusion while flexing each assumption. <b>Why it matters:</b> it shows whether a finding is robust or fragile — the test before betting money on it.</>}
          delay={40}
        >
          <Reveal><SensitivityTornado /></Reveal>
        </Section>

        </div>{/* /act--or */}

        {/* ===================== ACT III · BUSINESS STRATEGY ===================== */}
        <div className="act act--strategy">
        <ActHero
          num="III"
          kicker="Act III · Business Strategy"
          title="From the optimum to the boardroom"
          sub="The maths is settled. Now the decision: what to do, what we trade away, which move comes first, how hard to push under uncertainty — and how big the prize really is."
        />

        <Section
          eyebrow="The decision"
          title="Three moves, quantified"
          method={<><b>From analysis to action.</b> Every model output collapses into one ranked set of moves, each with an owner and a number. <b>Why it matters:</b> analytics only creates value when it ends in a decision.</>}
          delay={60}
        >
          <Recommendations f={f} />
        </Section>

        <Section
          eyebrow="The business case"
          title="Why these are the right bets — and what we give up"
          method={<><b>Trade-off analysis</b> makes the cost of each bet explicit, not just the upside. <b>Why it matters:</b> leaders decide with eyes open and can defend the call.</>}
          delay={60}
        >
          <StrategicRationale f={f} />
        </Section>

        <Section
          eyebrow="Decision analysis · under uncertainty"
          title="How hard to push — and what certainty is worth"
          sub="In plain terms: even allowing for what could go wrong, pushing the pricing discipline harder pays more on average — and this shows what better data would be worth."
          method={<><b>Decision analysis</b> weighs each option by payoff × probability (expected value) and prices the value of more certainty (EVPI). <b>Why it matters:</b> it picks what pays best on average and shows what better data is worth.</>}
          delay={40}
        >
          <Reveal><DecisionTree /></Reveal>
        </Section>

        <Section
          eyebrow="Multi-criteria decision · what comes first"
          title="Three good moves, one running order"
          sub="In plain terms: weighing everything we care about at once, this is the order to make the three moves — pricing first."
          method={<><b>Multi-criteria decision analysis (TOPSIS)</b> scores options on several weighted criteria at once and ranks them by closeness to the ideal. <b>Why it matters:</b> it turns competing priorities into one defensible order.</>}
          delay={40}
        >
          <Reveal><McdmRanking /></Reveal>
        </Section>

        <Section
          eyebrow="Market sizing · the prize"
          title="How big is the opportunity, really?"
          sub="In plain terms: from the whole market down to what we could realistically win — the prize worth chasing, in plain euros."
          method={<><b>TAM / SAM / SOM</b> sizes the total market, the slice you can serve, and the share you can realistically win. <b>Why it matters:</b> it grounds the opportunity in a credible number, not hype.</>}
          delay={40}
        >
          <Reveal><MarketSizing /></Reveal>
        </Section>
        </div>{/* /act--strategy */}

        {/* ===================== ACT IV · THE OPERATING MODEL ===================== */}
        <div className="act act--operate">
        <ActHero
          num="IV"
          kicker="Act IV · The Operating Model"
          title="From an analysis to a data-driven department"
          sub="A finding only creates value when it reaches each owner on their own terms — and when the loop that produced it keeps turning. This is the capability behind the charts."
        />

        <Section
          eyebrow="Sharing insight · one finding, three audiences"
          title="The same number, told three ways"
          sub="The Panic Tax reframed for the boardroom, the data scientist and the data engineer — each with the expectation that keeps them aligned."
          delay={40}
        >
          <StakeholderLenses f={f} />
        </Section>

        <Section
          eyebrow="The capability · how the department runs"
          title="Insight only counts when the loop closes"
          delay={40}
        >
          <OperatingModel />
        </Section>

        <Section
          eyebrow="Managing expectations · data readiness"
          title="What we have, and what we still owe the model"
          delay={40}
        >
          <DataReadiness />
        </Section>

        <Section
          eyebrow="Maturity · where we sit on the curve"
          title="All the way to prescriptive — and staying there"
          delay={40}
        >
          <MaturityLadder />
        </Section>

        <Section
          eyebrow="Execution · the first 90 days"
          title="From analysis to a running capability"
          sub="The plan that turns one good diagnosis into a department that keeps deciding: prove it, scale it, automate it."
          delay={40}
        >
          <ActivationRoadmap />
        </Section>
        </div>{/* /act--operate */}

        <Finale />

        {ctx && (
          <Section eyebrow="Appendix · method & credibility" title="Why this holds up" delay={60}>
            <div className="grid row-2">
              <div className="panel">
                <h3 className="panel-h">The moment</h3>
                <p className="muted" style={{ lineHeight: 1.65 }}>
                  Tata acquired 100% of Air India on{" "}
                  <b style={{ color: "var(--text)" }}>27 January 2022</b> for ₹
                  {ctx.acquisition.enterprise_value_inr_crore.toLocaleString("en-US")} crore (≈&nbsp;€2B). This
                  data was scraped weeks later — the literal opening diagnostic. In 2022 IndiGo held{" "}
                  <b style={{ color: "var(--text)" }}>{ctx.market_share_2022.indigo_pct}%</b> of the
                  market; Air India + Vistara combined{" "}
                  <b style={{ color: "var(--text)" }}>{ctx.market_share_2022.tata_combined_pct}%</b> —
                  the clear #2 bloc that later merged. India flew{" "}
                  {ctx.market_growth.domestic_pax_2022_million}M domestic passengers that year, up{" "}
                  {ctx.market_growth.yoy_growth_pct}%.
                </p>
              </div>
              <div className="panel">
                <h3 className="panel-h">The fuel model</h3>
                <p className="muted" style={{ lineHeight: 1.65 }}>
                  The dataset has no fuel field. We derive it from physics: great-circle distance
                  between the six metros, a routing detour penalty per stop, A320-family cruise burn
                  (~{f.assumptions.cruise_burn_kg_per_hr} kg/hr) and an{" "}
                  {f.assumptions.lto_fuel_per_cycle_kg} kg takeoff-cycle penalty, converted to CO₂ at{" "}
                  {f.assumptions.co2_per_kg_fuel}× and costed at ₹{f.assumptions.atf_price_inr_per_l}/L
                  (Delhi ATF, the scrape window). Every constant is a published benchmark, and the
                  estimate is labelled as a model — not invented data.
                </p>
              </div>
            </div>
          </Section>
        )}

        <Section eyebrow="In conclusion" title="The brief, closed" delay={40}>
          <Conclusion f={f} />
        </Section>

        <footer className="muted" style={{ marginTop: 64, fontSize: 12, lineHeight: 1.6 }}>
          Air India War Room · Team 3 · Source: EaseMyTrip flight dataset (300,153 records,
          Feb–Mar 2022). Fuel, cost and CO₂ figures are modeled estimates from published aviation
          benchmarks. Market context independently sourced &amp; cited.
        </footer>
      </main>
    </>
  );
}
