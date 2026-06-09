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
import FlightBackground from "./components/FlightBackground.jsx";
import Hero from "./components/Hero.jsx";
import LiveMap from "./components/LiveMap.jsx";
import SplitFlap from "./components/SplitFlap.jsx";
import Banner from "./components/Banner.jsx";
import MonteCarlo from "./components/MonteCarlo.jsx";
import ParetoEvolution from "./components/ParetoEvolution.jsx";
import FleetMap from "./components/FleetMap.jsx";
import RLAgent from "./components/RLAgent.jsx";
import PriceOptimizer from "./components/PriceOptimizer.jsx";
import MLDemand from "./components/MLDemand.jsx";
import "./components/components.css";

function Reveal({ children }) {
  const ref = useReveal();
  return <div ref={ref}>{children}</div>;
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
      <FlightBackground />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Hero />
      <CommandBar />
      <main className="shell" id="war-room">
        <Section
          eyebrow="The opening diagnostic · January 2022, Tata takes the controls"
          title="A national carrier, just privatised. Two levers nobody is pulling: fuel and price."
          sub="This is the new owner's first look at the data — every domestic metro fare scraped in the first weeks under Tata. The dataset has no fuel field, so we engineered one from physics. What it reveals is worth crores."
          delay={0}
        >
          <KpiBand f={f} />
        </Section>

        <Section
          eyebrow="The hero view"
          title="Fuel and price are the same decision"
          sub="Plot every route by what it burns and what it earns, and the fleet sorts itself into winners and bleeders."
          delay={60}
        >
          <Frontier frontier={f.frontier} />
        </Section>

        <Section eyebrow="Finding 01 — Revenue" title="The Panic Tax" delay={60}>
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
            </div>
          </div>
        </Section>

        <Section eyebrow="Finding 02 — Fuel & cost" title="Connections cost twice" delay={60}>
          <div className="grid row-2">
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

        <Section
          eyebrow="The decision"
          title="Three moves, quantified"
          sub="What the new owner should do on day one — and the upside of acting."
          delay={60}
        >
          <Recommendations f={f} />
        </Section>

        <Banner
          img="/airindia-poster.jpg"
          kicker="The network"
          title="One country. Six metros. Always moving."
          align="right"
        />
        <Section
          eyebrow="The network"
          title="India, live"
          sub="Every route Air India flies between the six metros — animated by real traffic, with live aircraft pulled from the open skies."
          delay={50}
        >
          <Reveal><SplitFlap /></Reveal>
          <div style={{ height: 18 }} />
          <Reveal><LiveMap /></Reveal>
        </Section>

        {/* ===================== OPERATIONS RESEARCH ACT ===================== */}
        <div className="or-hero" id="or">
          <div className="kicker">From insight to action · the optimisation engine</div>
          <h2>We don&rsquo;t just see the problem. We compute the answer.</h2>
          <p>
            Descriptive analytics tells you what happened. Operations research tells you exactly what to do. Six live
            engines — simulation, genetic optimisation, integer programming, reinforcement learning and machine learning —
            turn every finding above into a prescribed, optimal decision. Everything below runs live on the server.
          </p>
        </div>

        <div className="sim-stage">
          <div className="sim-stage-inner">
            <Section eyebrow="OR 01 · Simulation" title="How risky is the fuel bill?" delay={40}>
              <Reveal><MonteCarlo /></Reveal>
            </Section>

            <Section eyebrow="OR 02 · Genetic optimisation" title="The provably-best fuel–revenue trade-offs" delay={40}>
              <Reveal><ParetoEvolution /></Reveal>
            </Section>
          </div>
        </div>

        <Section eyebrow="OR 03 · Integer programming" title="The optimal route network" delay={40}>
          <Reveal><FleetMap /></Reveal>
        </Section>

        <Section eyebrow="OR 04 · Reinforcement learning" title="An agent that teaches itself to price" delay={40}>
          <Reveal><RLAgent /></Reveal>
        </Section>

        <Section eyebrow="OR 05 · Revenue management" title="The fare curve we should actually fly" delay={40}>
          <div className="revenue-stage">
            <div className="grid row-2" style={{ maxWidth: 1240, margin: "0 auto" }}>
              <Reveal><PriceOptimizer /></Reveal>
              <Reveal><MLDemand /></Reveal>
            </div>
          </div>
        </Section>

        {ctx && (
          <Section eyebrow="Context & method" title="Why this is real, and how we built it" delay={60}>
            <div className="grid row-2">
              <div className="panel">
                <h3 className="panel-h">The moment</h3>
                <p className="muted" style={{ lineHeight: 1.65 }}>
                  Tata acquired 100% of Air India on{" "}
                  <b style={{ color: "var(--text)" }}>27 January 2022</b> for ₹
                  {ctx.acquisition.enterprise_value_inr_crore.toLocaleString("en-IN")} crore. This
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

        <footer className="muted" style={{ marginTop: 64, fontSize: 12, lineHeight: 1.6 }}>
          Air India War Room · Team 3 · Source: EaseMyTrip flight dataset (300,153 records,
          Feb–Mar 2022). Fuel, cost and CO₂ figures are modeled estimates from published aviation
          benchmarks. Market context independently sourced &amp; cited.
        </footer>
      </main>
    </>
  );
}
