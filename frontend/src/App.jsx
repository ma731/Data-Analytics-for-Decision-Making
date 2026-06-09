import { useEffect, useState } from "react";
import { getFindings, getContext } from "./api.js";
import { Section } from "./components/ui.jsx";
import KpiBand from "./components/KpiBand.jsx";
import Frontier from "./components/Frontier.jsx";
import PanicTax from "./components/PanicTax.jsx";
import StopsCrime from "./components/StopsCrime.jsx";
import BusinessWhitespace from "./components/BusinessWhitespace.jsx";
import RouteExplorer from "./components/RouteExplorer.jsx";
import Recommendations from "./components/Recommendations.jsx";
import "./components/components.css";

function CommandBar() {
  return (
    <header className="cmdbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          AI
        </span>
        <span>
          Air India <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>· War Room</span>
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
      <CommandBar />
      <main className="shell">
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

        <Section eyebrow="Finding 03 — Premium" title="The whitespace only Tata can hold" delay={60}>
          <BusinessWhitespace airlines={f.airlines} business={f.business} />
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
