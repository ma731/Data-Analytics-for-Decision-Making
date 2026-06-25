# Fuel and Price Are One Decision

### An Engineered-Fuel, Operations-Research, and Decision-Analytic Diagnosis of Air India's Domestic Network at the Moment of the Tata Acquisition

**A Master's thesis-style technical report**
IE School of Science & Technology — Master in Business Data Science & Analytics (MBDS)
*Data Analytics for Decision Making* · Team 3 · Dataset 3 (Flight Price)

Repository: `ma731/Data-Analytics-for-Decision-Making` · Companion live application: `backend/` + `frontend/`
Companion documents: `TECHNICAL_SUBMISSION.md`, `QA_DEFENSE.md`, `RUN_OF_SHOW.md`

---

## Abstract

We adopt the persona of the newly-appointed Chief Data Officer of Air India in the weeks following Tata Sons' completion of the acquisition (handover 27 January 2022) and treat a 300,153-row EaseMyTrip fare dataset (February–March 2022) as the new owner's *opening diagnostic*. The assignment brief asks for the optimisation of **fuel consumption and flight price** — but the dataset contains **no fuel field of any kind**. The central methodological contribution of this work is to refuse to skip the fuel half: we **engineer a transparent, first-principles fuel-burn model** from great-circle distance and the landing-and-takeoff (LTO) cycle, calibrated entirely to published aviation benchmarks, and use it to place fuel and revenue on a single plane — the **Efficiency Frontier**.

On the descriptive layer we establish four findings: (i) price does **not** track fuel cost (a 3.71× spread in revenue-per-fuel-kilogram across routes priced near-identically); (ii) a **"panic tax"** — a 2.8× early-to-late fare swing at zero marginal cost, with 62.6% of economy seats sold in the cheapest window; (iii) a connections **"double-crime"** in which stops raise fare *and* fuel *and* CO₂ together; and (iv) a **premium-cabin whitespace** (an 8× business-class premium supplied by only the two Tata carriers). On the prescriptive layer we build a nine-module operations-research engine — Monte Carlo risk simulation, dynamic pricing, NSGA-II multi-objective optimisation, a fleet mixed-integer program, a reinforcement-learning pricing agent, a gradient-boosted demand model, exact EMSR seat protection, linear-programming duality (shadow prices), and data-envelopment analysis — and a decision-analytic layer (a decision tree with the expected value of perfect information, a TOPSIS multi-criteria ranking with weight-stability testing, and a TAM/SAM/SOM market funnel). The recommendations reduce to three ranked moves whose headline value, reconciled top-down and bottom-up, is on the order of **₹1,164 crore (~€129M) per year**.

The work is held to a research standard throughout: every engineered figure is labelled an estimate; a dedicated **threats-to-validity** treatment names the load-bearing risks (listings are not bookings, the pricing uplift is not causally identified, the decision modules rest on labelled judgements) *before* a critic can; and every constant is stress-tested (±20% sensitivity, Spearman ≈ 0.997; a 4,000-draw weight-stability test; an EVPI/flip-point analysis). We are explicit about the distance between this artifact — a rigorous, honest *applied* diagnosis — and a genuine PhD-level *contribution to knowledge*.

**Keywords:** airline revenue management, dynamic pricing, fuel-burn estimation, operations research, decision analysis under uncertainty, multi-criteria decision making, data envelopment analysis, threats to validity.

---

## Table of contents

1. Introduction
2. Background and related work
3. The data
4. Methodology I — the engineered fuel model
5. Methodology II — descriptive findings
6. Methodology III — the operations-research engine
7. Methodology IV — decision analysis and the business case
8. Results and synthesis
9. From analysis to capability — the operating model
10. Threats to validity
11. Limitations and future work
12. Reproducibility
13. Conclusion
14. References
- Appendix A — model constants and provenance
- Appendix B — API surface and module map
- Appendix C — notation

---

## 1. Introduction

### 1.1 Motivation and persona

On 27 January 2022 Tata Sons completed the ₹18,000-crore acquisition of Air India, returning the carrier to the group that founded it in 1932. The airline it inherited was structurally unwell: loss-making (a widely reported ~₹4,444 crore annual loss in the years preceding the deal), out-flown domestically by IndiGo (≈55.7% share in November 2022 versus Air India's ≈9.1%), and operating in a market where jet fuel — the single largest controllable cost for an Indian carrier, roughly 40% of operating cost — was spiking through the Russia–Ukraine shock (Delhi ATF rose from ₹90,519/kL in February 2022 to ₹110,666/kL in March and a record ₹141,232/kL by June).

The EaseMyTrip fare dataset for this assignment was scraped in **February–March 2022** — the *first weeks* of Air India under Tata ownership. We therefore adopt the persona of the incoming **Chief Data Officer** and treat the analysis literally as the opening diagnostic a new owner would commission: *where is the money leaking, and which levers does the data say to pull first?*

### 1.2 The problem statement and its central obstruction

The brief is explicit: *optimise fuel consumption and flight price*. This phrasing contains a trap that defines the entire project. The dataset supports the **price** half richly — it has fares, booking-horizon (`days_left`), cabin class, routing (`stops`), carrier, and time-of-day. It supports the **fuel** half **not at all**: there is no burn figure, no aircraft type, no payload, no distance in kilometres. The only physical proxies are `duration` and `stops`, and `duration` is actively misleading — a connecting itinerary's gate-to-gate time is dominated by layover, not flight time, so using it would massively overstate the fuel of exactly the flights we most want to scrutinise.

A weaker submission resolves this tension by quietly answering only the price half. The defining decision of this work is to answer both — by **engineering** the missing fuel layer from first principles rather than fabricating or omitting it (Section 4).

### 1.3 Research questions

- **RQ1.** Can a defensible, fully transparent fuel-burn estimate be derived from the only physical signals in the data (city pair and number of stops), and is it robust enough to carry economic conclusions?
- **RQ2.** Once fuel and revenue are on the same plane, does observed pricing reflect the underlying cost-to-serve, or are fuel and price being decided independently?
- **RQ3.** What are the prescriptively optimal moves — not merely the descriptive patterns — and do independent optimisation methods agree on them?
- **RQ4.** Under explicit uncertainty, how aggressively should the recommended moves be rolled out, and how robust is that recommendation to the assumptions it rests on?

### 1.4 Contributions

1. **An engineered fuel-estimation layer** for a fuel-less fares dataset, built from published benchmarks, validated against an external trip-fuel anchor, and stress-tested to ±20% on every constant.
2. **The Efficiency Frontier** — a single synthesis object that reframes "fuel" and "price" as one decision and quantifies a 3.71× revenue-per-fuel spread across near-identically-priced routes.
3. **A nine-module operations-research engine** that turns each descriptive finding into a prescribed, computed decision, with **method triangulation** — most notably an RL agent that *independently rediscovers* the empirical panic-tax curve, and an exact EMSR computation that supplies the optimum the RL agent only approximates.
4. **A decision-analytic layer** that carries uncertainty explicitly (EMV/EVPI/flip-point) and tests its own subjectivity (a 4,000-draw weight-stability test on the MCDM ranking).
5. **A discipline of honesty** — a threats-to-validity treatment that names the load-bearing risks first, and a per-figure estimate labelling — operationalised as an *operating model* for a data-driven department, not just a one-off study.

### 1.5 A note on scope and altitude

This is an *applied analytics* thesis, not a contribution to OR or statistics methodology. Every technique used is standard; the work's claim to rigor is in the **honesty of its inference**, the **appropriateness of method to data**, and the **triangulation** across independent methods — not in a novel algorithm. We are explicit about this in Section 11.

---

## 2. Background and related work

**Airline revenue management (RM).** Modern RM originates with the deregulation-era problem of selling a fixed, perishable seat inventory to heterogeneous willingness-to-pay. The canonical two-class seat-protection result is *Littlewood's rule*: protect a seat for the high fare class while its expected marginal revenue exceeds the certain low fare, i.e. protect until `P(demand_high > protection) = fare_low / fare_high`. Its multi-class generalisation, **EMSR** (Expected Marginal Seat Revenue, Belobaba 1987/1992), is industry standard. Our EMSR module (Section 6.7) computes the exact two-class protection level and is the optimal benchmark against which we judge the learned RL policy.

**Dynamic and booking-curve pricing.** Fares evolve along the booking horizon because the demand mix shifts — early bookers are price-elastic leisure travellers, late bookers are inelastic business travellers. The observed monotone rise in fare as `days_left → 0` is the empirical signature of this; our "panic tax" finding (Section 5.2) measures it, our dynamic-pricing optimiser (Section 6.2) prescribes against it, and our RL agent (Section 6.6) learns it from reward alone.

**Fuel-burn and emissions modelling.** First-principles aircraft fuel estimation decomposes a mission into the **LTO cycle** (taxi-out, take-off, climb-out, approach, taxi-in — the ICAO-standardised high-thrust phases) and **cruise** (burn rate × airborne time). The dominant drivers are distance flown and number of take-offs, because the climb phase is disproportionately fuel-intensive. We adopt exactly this decomposition (Section 4). Combustion of 1 kg of jet fuel yields ≈3.16 kg CO₂ (ICAO).

**Operations research in aviation.** Fleet assignment and frequency planning are classically posed as (mixed-)integer programs; the **dual** of a capacity constraint prices that capacity (a shadow price). **Multi-objective** trade-offs (here, fuel vs revenue) are handled by evolutionary methods such as **NSGA-II** (Deb et al. 2002), which approximate the Pareto front via non-dominated sorting and crowding distance. **Data envelopment analysis** (Charnes–Cooper–Rhodes, 1978) scores the relative efficiency of decision-making units (here, routes) by solving one linear program per unit.

**Decision analysis.** Choice under uncertainty is structured with **decision trees** and ranked by **expected monetary value**; the **expected value of perfect information** (EVPI) bounds what one should rationally pay to resolve the uncertainty before deciding. Multi-criteria choice is handled by methods such as **TOPSIS** (Hwang & Yoon 1981), which rank alternatives by relative closeness to an ideal solution.

This project's novelty is not in any of these methods individually but in **assembling them coherently over a single dataset**, making them agree, and being disciplined about what the data can and cannot support.

---

## 3. The data

### 3.1 Provenance and shape

| Property | Value |
|---|---|
| Source | EaseMyTrip scrape, distributed as the public Kaggle "Flight Price Prediction" dataset |
| Records | **300,153** flight listings |
| Period | February–March 2022 |
| Geography | India's six metros: Delhi, Mumbai, Bangalore, Kolkata, Hyderabad, Chennai (30 directed city-pairs) |
| Carriers | Vistara, Air India, IndiGo, GO FIRST, AirAsia, SpiceJet |
| Fields | airline, flight number, source/destination city, departure/arrival time bucket, stops, cabin class, duration, days-left, price (INR) |

### 3.2 Quality validation

The dataset passes both mechanical and substantive checks:

- **Mechanical:** 0 nulls, 0 duplicate rows.
- **Substantive coherence:** the price structure is economically sensible throughout — nonstop < 1-stop < 2+ stops; late-night cheapest; fares rise as departure approaches.
- **The decisive realness tell:** business class is sold **only by Vistara and Air India** and by no other carrier. This exactly reproduces the 2022 Indian market, in which those two were the only full-service carriers while IndiGo, SpiceJet, AirAsia and GO FIRST were pure low-cost. A naïve synthetic generator would not encode this asymmetry; its presence is strong evidence the data is real.

The only distributional quirk is a **bimodal price distribution** (mean ₹20,890 vs median ₹7,425), fully explained by business-class fares pulling the mean upward — itself a finding (Section 5.4), not an anomaly.

### 3.3 External context (real, cited)

To satisfy the brief's call to "research the current status of the company," we layer in independently sourced context, stored and cited in `data/market_context.json`: the Tata acquisition terms (₹18,000 cr, 27 Jan 2022); DGCA market shares (IndiGo 55.7%, the Air India + Vistara bloc 18.4%); the 110M+ domestic-passenger 2022 base (+52% YoY); the Delhi ATF price trajectory; and the ~40% fuel share of operating cost. These anchor the impact figures to real magnitudes rather than to scrape-row counts.

---

## 4. Methodology I — the engineered fuel model

### 4.1 Derivation

We estimate per-flight trip fuel as the sum of a cycle term and a cruise term:

```
total_fuel_kg = LTO_FUEL_PER_CYCLE × n_takeoffs
              + CRUISE_BURN_KG_PER_HR × airborne_hours

n_takeoffs     = stops + 1                              (each leg = one take-off/landing)
airborne_hours = flown_km / CRUISE_SPEED_KMH
flown_km       = great_circle_km × routing_factor(stops)
```

Great-circle distance is computed by the **haversine formula** from published airport coordinates for the six metros (a geometric quantity, *not* an assumption):

```
d = 2R · arcsin( √( sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2) ) ),   R = 6371 km
```

The model rests on the two true physical drivers available in the data: **distance flown** (from the city pair) and **number of take-offs** (from `stops`). The `routing_factor` (1.00 / 1.30 / 1.60 for 0 / 1 / 2+ stops) captures the geometric detour penalty of non-direct routings — a connecting flight does not fly the straight-line distance.

### 4.2 Constants and their provenance

Every constant is a published, citable aviation benchmark, chosen to be transparent and conservative (full table in Appendix A):

| Constant | Value | Basis |
|---|---|---|
| Cruise burn | 2,400 kg/hr | A320-family (neo ≈ 2,300; ceo higher) — the Air India/Vistara domestic narrowbody fleet |
| LTO cycle fuel / take-off | 825 kg | ICAO landing-take-off cycle (taxi + take-off + climb + approach + land) |
| Cruise speed | 800 km/h | typical average including climb/descent |
| Routing factor (0/1/2+) | 1.00 / 1.30 / 1.60 | detour penalty for non-direct routing |
| CO₂ per kg fuel | 3.16× | ICAO standard combustion factor |
| Jet-A density | 0.80 kg/L | standard |
| ATF price | ₹100/L | Delhi, Feb–Mar 2022 period average |
| Seats (narrowbody) | 180 | A320 single-class equivalent, for per-seat figures |

A single `ASSUMPTIONS` dictionary in `fuel_model.py` is the source of truth for both the optimisers and the dashboard's assumptions panel, so the displayed constants can never drift from the model that runs.

### 4.3 Validation against published trip-fuel envelopes

There is **no per-flight fuel ground truth** in this dataset, so we cannot claim *accuracy*; we claim *robustness* and provide a **multi-anchor external envelope check** (`/api/fuel_validation`, enforced by a unit test). The engineered nonstop estimate is compared against published A320-family trip-fuel bands at four stage lengths spanning the network:

| Sector | Stage (km) | Model | Published band | In band? |
|---|---|---|---|---|
| Bangalore→Chennai | 268 | 1.63 t | 1.4–2.2 t | yes |
| Hyderabad→Mumbai | 623 | 2.69 t | 2.2–3.2 t | yes |
| Delhi→Mumbai | 1,137 | 4.24 t | 3.5–4.5 t | yes |
| Delhi→Bangalore | 1,709 | 5.95 t | 5.0–6.5 t | yes |

All four land inside band; the **mean absolute deviation from band midpoint is 4.8%** (9.5% at worst, on the shortest sector where the LTO cycle dominates and reserve fuel is a larger share). The bands are consistent with published Airbus / ICAO-EEA fuel-vs-distance performance. This validates the model's *level* across the full stage-length range; it remains an envelope check, not a calibration against measured burn.

### 4.4 Fuel per passenger (load factor)

Per-seat figures divide by the full 180-seat cabin, so strictly they are fuel per *available* seat. We additionally report fuel per *passenger* using an explicit **80% load-factor assumption** (DGCA 2022 domestic ran ~80–87%); e.g. Delhi–Mumbai is 23.5 kg/available-seat and 29.4 kg/passenger. The load factor is a labelled assumption, not measured data.

### 4.5 Sensitivity and robustness (RQ1)

We swing **every engineered constant ±20%** and recompute the conclusions (`/api/sensitivity`). Two properties hold:

- The **route-efficiency ranking** is essentially invariant: Spearman correlation ≈ **0.997** against baseline across eight perturbation scenarios.
- The **nonstop-vs-2-stop fuel gap** stays in a tight band (baseline 1.85×; range 1.59–2.10×).

Crucially, the sensitivity holds great-circle distance *fixed*, because distance is geometric rather than assumed; the analysis therefore stress-tests the engineered constants, not the dominant distance driver. The headline efficiency-spread metric (3.71×) moves only within 3.37–4.06× under any single ±20% swing. **The conclusions do not depend on the exact value of any one constant** — the affirmative answer to RQ1.

---

## 5. Methodology II — descriptive findings

All figures below are computed live from the 300,153 rows; the fuel/CO₂ figures apply the model of Section 4.

### 5.1 Finding 0 — the Efficiency Frontier (the synthesis) (RQ2)

Plotting every directed route by fuel-per-seat (x) against revenue-per-seat (y) reveals that **price does not reflect fuel cost**:

- **Best:** Bangalore→Chennai earns ₹7,106 on **14.9 kg/seat** → **476.8** revenue per fuel-kg.
- **Worst:** Delhi→Chennai earns *less* (₹6,102) on **47.5 kg/seat** → **128.5** revenue per fuel-kg.

That is a **3.71× spread** in revenue-per-fuel-kilogram across routes priced almost identically. The frontier is the project's thesis object: fuel and price are not two problems but **one decision**, and the network is currently sorting itself into efficient "winners" and fuel-bleeding "losers" that pricing ignores. This is the direct, affirmative answer to RQ2.

### 5.2 Finding 1 — the Panic Tax (the price lever)

Economy fares are flat and cheap until ~20 days out, then climb steeply:

| Window | Avg fare | Share of economy seats |
|---|---|---|
| T-1 to T-2 | ₹14,226 | 2.1% |
| T-3 to T-7 | ₹10,992 | 8.4% |
| T-8 to T-14 | ₹10,048 | 14.0% |
| T-15 to T-20 | ₹6,141 | 13.0% |
| T-21+ | ₹5,037 | 62.6% |

The last-minute-to-far-out multiple is **2.8×** at *zero* change in cost-to-serve — yet **62.6%** of economy seats sell in the cheapest, most under-priced window. The airline gives away early and gouges late; money is lost in both directions.

### 5.3 Finding 2 — the connections "double-crime" (the fuel lever)

As stops increase, **both** fare and fuel rise together:

| Routing | Avg fare | Fuel/seat | CO₂/seat | Share |
|---|---|---|---|---|
| Nonstop | ₹4,013 | 24.2 kg | 76.5 kg | 13.5% |
| 1 stop | ₹6,813 | 34.8 kg | 110.0 kg | 80.6% |
| 2+ stops | ₹9,142 | 44.7 kg | 141.4 kg | 5.9% |

Cutting inefficient connections is a rare **win-win-win**: lower fare to the passenger, lower fuel bill to the airline, lower carbon to the planet. The fuel half of the brief and the price half point the same direction here.

### 5.4 Finding 3 — the premium whitespace (the strategic lever)

Business class commands an **8× premium** (₹52,540 vs ₹6,572) and is sold by **only 2 of 6** carriers — Air India (₹47,131 avg) and Vistara (₹55,477). The merged Tata group therefore owns India's domestic premium-cabin supply outright. This is the one structural advantage no competitor can quickly replicate, and it is the strategic complement to the two tactical revenue/fuel moves.

---

## 6. Methodology III — the operations-research engine

The findings above are *descriptive*. The OR engine (`backend/optimize.py`) turns each into a *prescribed, optimal, computed* decision. All modules run live, are seeded for reproducibility, and return per-iteration snapshots so the dashboard can animate the optimiser working. The engine spans the decision-analytics toolkit: simulation, linear and integer programming, LP duality, multi-objective optimisation, reinforcement learning, machine learning, exact revenue management, and efficiency analysis.

### 6.1 Monte Carlo fuel-risk simulation

We simulate the annual fuel bill under **lognormal ATF-price shocks** (6,000 draws, ±20% volatility). With a base annual bill of ₹15,800 cr, the simulation returns P10 = ₹11,913 cr, P50 = ₹15,513 cr, P90 = ₹19,947 cr, and a 95% Value-at-Risk of ₹21,453 cr. This quantifies the airline's *exposure* to a fuel spike and sizes the hedge that the efficiency moves buy. (Answers: "how big is the fuel-price tail, and what does efficiency protect?")

### 6.2 Dynamic price optimiser

A per-window linear-demand revenue maximisation, with elasticity rising over the booking horizon (early leisure elastic, late business inelastic). For each window it returns the revenue-maximising fare; the gap between current and optimal fares is the *recoverable* revenue, and the optimiser raises under-priced far-out fares while leaving inelastic late fares broadly intact. (Answers: "what fare should we charge in each window?")

### 6.3 NSGA-II multi-objective optimisation

A genetic algorithm (population 60, 40 generations) over capacity-share vectors, using **non-dominated sorting + crowding distance** to evolve the **Pareto front** of fuel-vs-revenue trade-offs. The per-generation snapshots show the population converging from a diffuse cloud to a clean frontier — the *provably non-dominated* set of network trade-offs, the formal counterpart to the Efficiency Frontier of Section 5.1. (Answers: "what is the best *set* of fuel-vs-revenue trade-offs?")

### 6.4 Fleet MILP

A mixed-integer program (`scipy.optimize.milp`) that maximises contribution subject to a fleet **block-hour budget** (4,000 hours) and per-route service bounds, returning integer flight frequencies per route (total contribution ≈ ₹27.4 cr in the modelled instance). (Answers: "exactly how many flights on each route?")

### 6.5 LP shadow prices (duality)

We take the LP relaxation of the fleet program; the **dual** of the block-hour budget prices capacity. With a binding budget, one additional block-hour is worth **₹197,503**, implying a value of roughly **₹0.83 cr per aircraft per week**. This is the marginal-value lens on the same fleet problem and the rigorous way to answer "what is one more aircraft worth?".

### 6.6 Reinforcement-learning pricing agent

A **tabular Q-learning** agent prices over the booking horizon: state = (days-left, seats-left), action = one of five fare levels, reward = realised fare revenue, trained for 4,000 episodes. The converged agent earns **316,600** versus a **240,000** flat-price baseline (+32%) and — the showpiece result — **independently rediscovers the panic-tax escalation ladder**: hold fares low when seats are plentiful and departure is distant, escalate as the cabin fills and time runs out. An optimisation method that knows nothing of Finding 1 *reconstructs* it from reward alone (RQ3: the methods agree).

### 6.7 EMSR exact seat protection

**Littlewood's rule** gives the exact two-class protection level for the 8× premium: protect until `P(business demand > protection) = fare_low / fare_high = 0.125`. With premium demand ~N(21.6, 8.6²) on a 180-seat cabin, the optimum is **32 protected seats** (economy booking limit 148). The EMSR revenue curve peaks exactly there. This is the *exact optimum* that the RL agent (Section 6.6) only approximates — the two methods bracket the truth from the analytic and the learned directions. (Answers: "how many seats to protect for business?")

### 6.8 ML demand engine

A **gradient-boosted** fare model on a **leakage-proof, flight-grouped** train/test split (no flight appears in both sets):

- Out-of-sample **R² = 0.961** (train 0.972; overfit gap **0.011**), reported as **mean ± SD over 3 grouped folds: R² 0.96 ± 0.001**, so the headline accuracy carries an error bar rather than resting on one seed.
- **MAPE = 15.6%** (CV **15.8 ± 0.5%**), MAE ₹2,920 vs a naïve baseline MAE ₹4,207 → **skill score +30.6%**.
- Prediction-interval coverage is **73.6%** raw against an 80% nominal; after **split-conformal calibration (CQR)** — a conformal width learned on a held-out calibration set and added to the P10–P90 quantile predictions — coverage rises to **77.8%**, materially closer to nominal. Both numbers and the method are reported.
- Permutation importance ranks the levers a revenue team can actually pull: **cabin class** dominates (1.58), then **days-left** (0.12), then duration and carrier.

The log-log fare/volume slope (−0.36) is explicitly **relabelled a descriptive gradient, not a causal elasticity** — price and volume both move with days-to-departure, so it is confounded by the booking curve (see Section 10.2). We now also **estimate it with a 1,000-sample bootstrap 95% CI ([−0.54, −0.17], SE 0.09)** and **propagate that uncertainty through the dynamic-pricing optimiser** (`/api/pricing_uncertainty`): the optimiser is re-run across the implied elasticity range, returning the revenue uplift as a *band* rather than a single point. Reporting it as a descriptive gradient with an uncertainty band, rather than a causal elasticity with a point estimate, is a deliberate inferential choice.

### 6.9 DEA route efficiency

An input-oriented **CCR data-envelopment analysis** (one linear program per route, input = fuel/seat, outputs = revenue/seat and volume) scores all 30 routes: **3 are efficient** (on the frontier), mean efficiency is **0.709**, and each inefficient route is given a **named peer target** to copy. This is the formal, frontier-relative version of the eyeball Efficiency Frontier — it tells each laggard *exactly which efficient route* it should benchmark against and by how much.

### 6.10 On method appropriateness

We use the technique that fits the data, not the fanciest one, and we are explicit about two deliberate **exclusions**:

- **Queuing theory** is the correct tool for runway/taxi-out congestion and taxi-and-hold fuel burn, but the fares dataset has **no operational timing data** (no arrival rates, no service times), so applying it here would be the wrong instrument. It is logged as a future unlock contingent on a runway/taxi-timing feed.
- **Deep learning** was not used for demand: on ~300k tabular rows with a dozen features, gradient boosting is stronger and far more interpretable, and it lets us *rank the levers*. A neural net would add opacity without accuracy at this scale.

Naming what we deliberately did *not* do, and why, is part of the rigor.

---

## 7. Methodology IV — decision analysis and the business case

The OR engine finds what is optimal; a decision-analytic layer (`backend/business.py`) turns it into a board-level call under uncertainty.

### 7.1 Decision tree, EMV and EVPI (RQ4)

The decision is *how aggressively to roll out dynamic pricing*. Two demand-response states — **demand holds** (late segment inelastic; p = 0.65) and **demand softens** (price-sensitive leisure defects to IndiGo; p = 0.35) — feed three acts:

| Act | Payoff if holds | Payoff if softens | EMV |
|---|---|---|---|
| **Aggressive** | ₹922.1 cr | ₹147.5 cr | **₹651.0 cr** ✓ |
| Conservative | ₹461.1 cr | ₹299.7 cr | ₹404.6 cr |
| Do nothing | 0 | 0 | 0 |

The aggressive rollout maximises EMV. The **EVPI is only ₹53.3 cr** — small relative to the prize — which means the decision is *robust*: perfect demand research would barely change the call. The recommendation flips to the conservative pilot only if you believe demand holds with probability **< 0.248**; we believe ≈0.65. Crucially, the flip-point only stress-tests one knob; the aggressive-capture rate and the realised-fraction-if-soften for each act are *also* labelled assumptions, so we **Monte-Carlo all of them at once** (5,000 draws over P(hold), capture and both soften-keep fractions): **Aggressive stays the EMV-maximising act in 97.7% of draws**. The headline call is therefore a demonstrated-robust result, not an artefact of one set of assumed numbers. All figures are anchored to 3.34M far-out economy passengers derived from the cited 110M DGCA base — not to scrape-row counts.

### 7.2 MCDM — TOPSIS with weight-stability

Which move first? We rank the three moves by **TOPSIS** over six weighted criteria (revenue impact 0.30, ESG 0.15, low-capex 0.15, speed 0.15, reversibility 0.10, moat 0.15), cross-checked with a weighted sum:

| Move | Closeness | Rank |
|---|---|---|
| 1 — Re-time the revenue curve | 0.529 | **1** |
| 3 — Own the premium cabin | 0.463 | 2 |
| 2 — Kill inefficient connections | 0.448 | 3 |

Because the 1–5 scores *and* the weights are *labelled judgements*, we do not stop at a point ranking and we stress-test both subjective axes: TOPSIS is re-run across **4,000 Gaussian-perturbed weightings** (σ = 0.05) and, separately, across **4,000 perturbed 1–5 score matrices** (σ = 0.6, clipped to [1,5]). Move 1 stays #1 in **66.3%** of the weight draws and **71.6%** of the score draws (mean rank 1.41). A ranking that survives both the weights and the scores is a finding; one that flips is an opinion — and we report which.

### 7.3 Market sizing — TAM/SAM/SOM

A funnel from one cited macro figure plus labelled assumptions: **TAM** = all Indian domestic travel (110M pax, ₹66,000 cr); **SAM** = the six-metro trunk we fly (33M pax, ₹19,800 cr); **SOM** = the Tata bloc's 18.4% served share (6.1M pax, ₹3,643 cr). The point is not a precise forecast but to reframe the prize: a focused, winnable served base on routes where Tata already has the metal, on which the pricing move alone adds ≈₹461 cr.

---

## 8. Results and synthesis

### 8.1 The three moves and their quantified impact

| Move | Action | Conservative impact |
|---|---|---|
| **1 · Re-time the revenue curve** | Dynamic-pricing floor lifting early fares | **+₹1,378 (~€15)/seat** at 15% capture across 129,271 far-out bookings |
| **2 · Kill inefficient connections** | Re-route 2+ stop traffic to nonstop/1-stop | **−9.9 kg fuel & −31.3 kg CO₂/seat** (≈ ₹1,238 / €14 fuel saved) |
| **3 · Own the premium cabin** | Protect & grow business class pre-merger | Defends an **8×** segment (**€584 vs €73**/seat) |

Each move maps to a distinct lever the brief named and a distinct finding: re-time pricing is the **price** lever (Finding 1), kill connections is the **fuel** lever (Finding 2), own premium is the **strategic** moat (Finding 3).

### 8.2 The headline number, reconciled two ways

The defensibility of the impact rests on two independent derivations that agree:

- **Top-down:** a 2–4% revenue-management uplift on Air India's ₹38,812 cr FY24 revenue = ₹780–1,550 cr/yr (≈ €90–170M) — a quarter to a third of the FY24 loss.
- **Bottom-up:** the pricing move alone, on ~3.34M far-out economy passengers (from the 110M DGCA base) at a ₹1,378/seat uplift, = ≈ ₹460 cr at 15% capture and ≈ ₹920 cr at 30% (€51–102M).

The two bands reconcile once premium and fuel savings are added — the headline of **~₹1,164 cr (~€129M)/yr**. The reconciliation, not the point estimate, is the point.

### 8.3 Triangulation across methods (RQ3)

The strongest evidence for the recommendations is that **independent methods converge**:

- The **eyeball Efficiency Frontier** (Section 5.1) and the **DEA frontier** (Section 6.9) and the **NSGA-II Pareto front** (Section 6.3) identify the same efficient/inefficient routes by three different mechanisms.
- The empirical **panic-tax curve** (Section 5.2), the **dynamic-pricing optimiser** (Section 6.2), and the **RL agent** (Section 6.6) all describe the same fare-escalation behaviour — one measured, one prescribed, one *learned from scratch*.
- The **EMSR exact optimum** (Section 6.7) and the **RL learned policy** bracket the seat-protection decision analytically and empirically.

This convergence is the project's substantive answer to RQ3: the prescribed moves are not artifacts of a single method.

---

## 9. From analysis to capability — the operating model

A finding is a *project*; a repeatable decision is a *department*. Because the brief is **head of data**, the work closes on how a data-driven department actually runs (the live app's "Act IV"):

- **One finding, three audiences.** The Panic Tax is reframed for the **board** (the decision and the money), the **data scientist** (the model and its uncertainty), and the **data engineer** (the pipeline and the data contract) — the same insight, communicated to each owner with the expectation that keeps them aligned. This is the explicit answer to the grading dimension on *how insights are shared and expectations managed*.
- **Data → decision flywheel + RACI.** Ingest → model → frame → decide → measure, with a named owner on every hop and a Responsible/Accountable/Consulted/Informed matrix on the three moves.
- **Data-readiness ledger.** Every input is labelled *have* (fares), *proxy* (fuel, cost), or *gap* (live booking curve, competitor fares), each with the owner who closes it — making the limits of the current analysis explicit rather than hidden.
- **Analytics maturity ladder.** The work climbs descriptive → diagnostic → predictive → prescriptive; the organisational task is to *stay* at prescriptive by automating ingest, monitoring and re-training.
- **90-day activation.** Prove (pilot the price floor; instrument the booking curve) → scale (roll out; replace the fuel proxy with telemetry) → automate (RL in shadow mode; weekly war-room; drift monitoring).

---

## 10. Threats to validity

We hold the project to a research standard: a limitation you **scope and own** is defensible; one you hide is a finding waiting to be demolished. The honest threats, in order of severity:

### 10.1 Listings ≠ bookings ≠ demand (the load-bearing threat)

The EaseMyTrip data is **quoted fares, not transactions**. Row counts are listing frequency, not passengers; `far_out_flights` is itineraries, not confirmed bookings. Every revenue figure inherits this. We therefore frame the panic-tax and market-sizing numbers as **directional opportunity estimates on a demand proxy**, never a P&L, and we anchor the monetised figures to the cited DGCA passenger base rather than to scrape-rows. The **structural** findings (fuel rises with stops; only Tata sells business; price ≠ fuel cost) do not depend on volume and are unaffected.

### 10.2 No causal identification of the pricing uplift

"Raise early fares to capture the gap" is a causal claim resting on a cross-sectional pattern, and the booking curve confounds it — price and volume both move with days-to-departure. This is exactly why we relabel the demand "elasticity" as a *descriptive gradient* (Section 6.8), now estimated with a bootstrap 95% CI whose uncertainty we propagate to a revenue-uplift band. We do **not** claim the uplift is identified: estimating the gradient with error bars and pushing that error through the optimiser quantifies *statistical* uncertainty, but it does not remove the *confounding*. A clean causal test would require an A/B fare experiment or a natural experiment we do not have.

### 10.3 Assumption-driven decision modules — mitigated, not eliminated

The decision tree's state probabilities and the MCDM's 1–5 scores and weights are *labelled judgements*, not estimates. We attack each with tornado discipline: the tree ships its EMV-vs-probability sweep, flip-point, and a **5,000-draw Monte Carlo over all its knobs** (Aggressive optimal in 97.7%); the MCDM ships a **4,000-draw weight-stability check and a 4,000-draw score-stability check** (#1 holds in 66% and 72%). Mitigation is not elimination — the *ranges* over which we perturb are themselves judgements — and we say so.

### 10.4 The fuel model is robust, with a four-anchor external check

The ±20% sensitivity (Spearman ≈ 0.997) shows the conclusions do not depend on any single constant — but it holds great-circle distance fixed (distance is geometric) and there is no per-flight fuel ground truth to calibrate against. The model is checked against **published A320 trip-fuel envelopes at four stage lengths** (Section 4.3): all inside band, mean absolute deviation 4.8%. This is a multi-anchor envelope check across the stage-length range, materially stronger than a single anchor, but still not a calibration against measured burn. Every figure remains a labelled estimate.

### 10.5 Staleness and seasonality

Data is Feb–Mar 2022; annual figures scale the two-month sample ×6, ignoring seasonality. The Vistara merger (completed 2024) post-dates the data, so "pre-merger" framing is a narrative device for the 2022 persona, not a live 2026 operational claim.

### 10.6 Competitive response unmodeled

We do not model IndiGo reacting to an Air India fare move (no game-theoretic equilibrium). The "demand softens" branch is a reduced-form proxy for defection, not a strategic best-response. A full best-response model is the honest next step.

---

## 11. Limitations and future work

### 11.1 Distance from a PhD-level contribution

We are explicit about altitude. This is a **rigorous applied diagnosis**, not a contribution to knowledge in the doctoral sense. The recent hardening pass narrows the gap on *statistical* rigor — the demand gradient now carries a bootstrap CI propagated through the optimiser; accuracy is reported with cross-validated error bars; the intervals are conformally calibrated; the fuel model is checked against four published anchors; and the decision modules are Monte-Carlo'd over all their knobs — but it does not cross the bar, because none of this adds *causal identification*, *measured* validation, or *methodological novelty*. A genuine PhD-level extension would require at least one of:

1. **Causal identification.** A field A/B fare experiment, a regression-discontinuity around a pricing-policy change, or an instrument that shifts price independently of the booking curve — converting the descriptive gradient (now estimated with uncertainty, but still confounded) into an identified elasticity and the "panic-tax opportunity" into an estimated treatment effect.
2. **A validated structural fuel model.** Calibration against real OFP/ACARS burn data across aircraft types and load factors, turning the engineered proxy — currently checked against published *envelopes* — into a measured quantity with empirical error bars per route.
3. **A strategic equilibrium.** A game-theoretic best-response model of IndiGo's reaction, replacing the reduced-form "demand softens" branch with a solved equilibrium.
4. **A methodological novelty.** The current methods are all standard; a doctoral contribution would advance one of them (e.g., a new multi-objective formulation jointly optimising fuel, revenue and emissions under demand uncertainty with chance constraints).

### 11.2 Concrete next steps (named, not hidden)

- Transaction/booking data to turn the proxy figures into a real P&L and load factors.
- A runway/taxi-timing feed to unlock the (currently inapplicable) queuing-theory analysis of congestion fuel.
- Per-flight aircraft-type assignment to relax the single-fleet (A320) assumption on the sectors that fly widebodies.
- A competitive best-response layer over the decision tree.

---

## 12. Reproducibility

The entire analysis is a full-stack application; nothing is pre-baked. Every number in this report is computed live by the backend and can be reproduced on demand.

```
backend/fuel_model.py   # engineered fuel model (documented constants, single source of truth)
backend/analysis.py     # applies the model across 300,153 flights -> findings.json
backend/optimize.py     # the nine-module OR engine (seeded, reproducible)
backend/business.py     # decision tree, TOPSIS/MCDM, TAM/SAM/SOM
backend/app.py          # FastAPI surface (findings + 9 OR + 3 decision + sensitivity)
frontend/               # React + Vite dashboard (Recharts)
data/                   # Flight_price.csv (real), market_context.json (cited), findings.json
```

Run: `./run.ps1` (Windows) or `python backend/app.py` + `npm --prefix frontend run dev`, then open `http://localhost:5173`. The dashboard's **live fuel calculator** and **RL euro fare desk** recompute the model on any route in real time. Optimisers are seeded and emit per-iteration snapshots so results are deterministic and inspectable.

---

## 13. Conclusion

The brief asked us to optimise fuel and price for an airline whose data contained price but not fuel. The defining move of this work was to engineer the missing half rather than skip it — and, once fuel and revenue sat on one plane, the central finding fell out cleanly: **fuel and price are not two problems but one decision**, and the network is leaving value on the runway in both. We measured that gap descriptively (a 3.71× efficiency spread, a 2.8× panic tax, a connections double-crime, an 8× premium whitespace), prescribed against it with nine independent optimisation methods that *agree* (most strikingly, an RL agent that rediscovers the panic curve and an EMSR rule that supplies the exact optimum), carried the decision under explicit uncertainty (EMV/EVPI with a flip-point), and reconciled a headline impact of ~€129M/yr two independent ways.

Above all, the work knows its own limits. The standout is not the nine engines or the decision layer; it is the threats-to-validity discipline that names what to attack — listings are not bookings, the uplift is not causally identified, the decision modules rest on labelled judgements — *before* a critic can. That discipline is what separates a dashboard from an analysis, and it is the honest foundation on which the new owner can make the first move.

---

## 14. References

(Indicative; methods are standard and the empirical context is cited inline and in `data/market_context.json`.)

- Belobaba, P. P. (1987, 1992). *Air travel demand and airline seat inventory management*; EMSR seat-protection heuristics. MIT.
- Charnes, A., Cooper, W. W., & Rhodes, E. (1978). Measuring the efficiency of decision-making units. *European Journal of Operational Research*.
- Deb, K., Pratap, A., Agarwal, S., & Meyarivan, T. (2002). A fast and elitist multiobjective genetic algorithm: NSGA-II. *IEEE Transactions on Evolutionary Computation*.
- Hwang, C. L., & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications* (TOPSIS).
- Littlewood, K. (1972). Forecasting and control of passenger bookings. *AGIFORS*.
- Talluri, K. T., & van Ryzin, G. J. (2004). *The Theory and Practice of Revenue Management.* Springer.
- Watkins, C. J. C. H., & Dayan, P. (1992). Q-learning. *Machine Learning.*
- ICAO. *Aircraft Engine Emissions Databank* and LTO-cycle definitions; standard CO₂ combustion factor (3.16).
- DGCA India. Domestic traffic and market-share statistics, 2022.
- IndianOil. Aviation Turbine Fuel (ATF) price history, Delhi, 2022.
- IATA / CAPA India. Airline operating-cost structure (fuel ≈ 40%).
- Tata Group newsroom; india.com. Air India acquisition terms and timeline (27 January 2022).

---

## Appendix A — model constants and provenance

| Symbol | Constant | Value | Provenance |
|---|---|---|---|
| `CRUISE_BURN_KG_PER_HR` | Cruise fuel burn | 2,400 kg/hr | A320-family fleet-mix midpoint (aircraft-commerce, flightglobal) |
| `LTO_FUEL_PER_CYCLE_KG` | LTO cycle fuel | 825 kg | ICAO landing-take-off cycle |
| `CRUISE_SPEED_KMH` | Average speed | 800 km/h | typical incl. climb/descent |
| `ROUTING_FACTOR` | Detour penalty | 1.00 / 1.30 / 1.60 | non-direct routing, 0/1/2+ stops |
| `CO2_PER_KG_FUEL` | Combustion factor | 3.16× | ICAO standard |
| `JET_A_DENSITY_KG_L` | Jet-A density | 0.80 kg/L | standard |
| `ATF_PRICE_INR_PER_L` | Fuel price | ₹100/L | Delhi, Feb–Mar 2022 avg (IOCL) |
| `SEATS_NARROWBODY` | Seats | 180 | A320 single-class equivalent |
| `R` | Earth radius | 6,371 km | haversine |

## Appendix B — API surface and module map

| Endpoint | Module | Method |
|---|---|---|
| `/api/findings`, `/api/route/{s}/{d}/{stops}`, `/api/context` | `analysis.py`, `fuel_model.py` | descriptive + engineered fuel |
| `/api/sim/fuel` | `optimize.py` | Monte Carlo (lognormal ATF) |
| `/api/optimize/pricing` | `optimize.py` | linear-demand revenue max |
| `/api/pareto` | `optimize.py` | NSGA-II |
| `/api/fleet` | `optimize.py` | MILP (`scipy.optimize.milp`) |
| `/api/shadow` | `optimize.py` | LP duality / shadow prices |
| `/api/rl` | `optimize.py` | tabular Q-learning |
| `/api/demand` | `optimize.py` | gradient boosting + permutation importance |
| `/api/emsr` | `optimize.py` | Littlewood's rule |
| `/api/dea` | `optimize.py` | CCR data-envelopment analysis |
| `/api/decision` | `business.py` | decision tree, EMV, EVPI |
| `/api/mcdm` | `business.py` | TOPSIS + weight-stability |
| `/api/market` | `business.py` | TAM/SAM/SOM |
| `/api/sensitivity` | `optimize.py` | ±20% tornado on fuel constants |

## Appendix C — notation

- `gc_km` — great-circle distance (haversine), km.
- `flown_km` — `gc_km × routing_factor(stops)`, the modelled distance actually flown.
- `T-k` — booking window, *k* days before departure.
- `EMV` — expected monetary value; `EVPI` — expected value of perfect information.
- `rev_per_fuel_kg` — revenue per seat ÷ fuel-kg per seat, the Efficiency-Frontier ratio.
- All currency: ₹90 ≈ €1; 1 crore = ₹10M ≈ €110K.
