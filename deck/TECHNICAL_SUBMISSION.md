# Air India War Room — Technical Submission

**Team 3 · IE MBDS** · Dataset 3 (Flight Price) · *"Head of data for an airline: decide the best path to optimize fuel consumption and flight price."*

---

## 1. Executive framing

We adopt the persona of the **newly-appointed Chief Data Officer of Air India**, in the weeks
following Tata's acquisition of the airline on **27 January 2022**. The dataset was scraped in
**February–March 2022** — so this analysis is, in effect, the new owner's opening diagnostic.

The business question has two halves: **fuel** and **price**. The dataset directly supports the
price half. It contains **no fuel data at all** — so we engineered a defensible fuel-estimation
layer (Section 4) to answer the fuel half rather than skip it.

---

## 2. The dataset

| Property | Value |
|---|---|
| Source | EaseMyTrip scrape (public Kaggle "Flight Price Prediction" dataset) |
| Records | **300,153** flights |
| Period | February–March 2022 |
| Geography | India's six metros: Delhi, Mumbai, Bangalore, Kolkata, Hyderabad, Chennai |
| Carriers | Vistara, Air India, IndiGo, GO FIRST, AirAsia, SpiceJet |
| Fields | airline, flight no., source/destination city, departure/arrival time bucket, stops, class, duration, days-left, price (INR) |

### 2.1 Quality validation
- **0 nulls, 0 duplicate rows.**
- **Internally coherent** in ways synthetic data is not. The decisive tell: **business class is
  sold only by Vistara and Air India** — and by no one else. This exactly matches the real 2022
  Indian market, where those two were the only full-service carriers; IndiGo, SpiceJet, AirAsia
  and GO FIRST were pure low-cost. A random generator would never reproduce this.
- Economically sensible price structure throughout (nonstop < 1-stop < 2+ stops; late-night
  cheapest; fares rise as departure approaches).
- **Conclusion:** the data is **real and high quality**. The only quirk is a bimodal price
  distribution (mean ₹20,890 vs median ₹7,425), explained entirely by business-class fares
  pulling the mean up.

---

## 3. External data (real, cited)

To satisfy the brief's call to "research the current status," we layered in verified context,
stored in `data/market_context.json`:

| Fact | Value | Source |
|---|---|---|
| Tata acquires 100% of Air India | ₹18,000 cr, 27 Jan 2022 | Tata Group newsroom |
| IndiGo domestic market share | 55.7% (Nov 2022) | DGCA / Zee News |
| Air India + Vistara combined share | 18.4% (the #2 bloc) | DGCA / finology |
| India domestic passengers 2022 | 110M+, +52% YoY | DGCA |
| Delhi ATF price, Feb→Mar 2022 | ₹90,519 → ₹110,666 / kL | IndianOil |
| Jet fuel as share of airline cost | ~40% | IATA / CAPA |

---

## 4. The engineered fuel model

The dataset has no fuel field, and `duration` is a poor proxy (a connecting flight's gate-to-gate
time is dominated by layover time, not flight time). We therefore estimate fuel from **first
principles**. The two true drivers of jet fuel burn are **distance flown** and **number of
takeoffs** (takeoff/climb is the most fuel-intensive phase) — both derivable from the data.

```
total_fuel_kg = LTO_FUEL_PER_CYCLE × (stops + 1)
              + CRUISE_BURN_KG_PER_HR × airborne_hours

airborne_hours = (great_circle_km × routing_factor) / cruise_speed
```

| Constant | Value | Basis |
|---|---|---|
| Cruise burn | 2,400 kg/hr | A320-family (neo ≈ 2,300; ceo higher) — AI/Vistara domestic fleet |
| LTO cycle fuel / takeoff | 825 kg | ICAO landing-takeoff cycle (taxi+takeoff+climb+approach+land) |
| Cruise speed | 800 km/h | typical average incl. climb/descent |
| Routing factor (0/1/2+ stops) | 1.00 / 1.30 / 1.60 | detour penalty for non-direct routing |
| CO₂ per kg fuel | 3.16× | ICAO standard combustion factor |
| Jet-A density | 0.80 kg/L | standard |
| ATF price | ₹100 / L | Delhi, Feb–Mar 2022 period average |
| Seats (narrowbody) | 180 | A320 single-class equivalent, for per-seat figures |

Great-circle distances are computed by haversine from published airport coordinates for the six
cities. **Every fuel, cost and CO₂ figure is a labelled estimate**, not invented data. The model
is implemented in `backend/fuel_model.py` and runs live in the app — any route can be recomputed
on demand during Q&A.

### 4.1 External validation (multi-anchor envelope check)
No per-flight fuel ground truth exists in this dataset, so we cannot *calibrate*. Instead we check
the engineered nonstop estimate against **published A320-family trip-fuel envelopes at four stage
lengths** (`/api/fuel_validation`, enforced by a unit test):

| Sector | Stage (km) | Model | Published band | In band? |
|---|---|---|---|---|
| Bangalore→Chennai | 268 | 1.63 t | 1.4–2.2 t | ✓ |
| Hyderabad→Mumbai | 623 | 2.69 t | 2.2–3.2 t | ✓ |
| Delhi→Mumbai | 1,137 | 4.24 t | 3.5–4.5 t | ✓ |
| Delhi→Bangalore | 1,709 | 5.95 t | 5.0–6.5 t | ✓ |

All four land inside band; **mean absolute deviation from band midpoint is 4.8%** (max 9.5% on the
shortest, LTO-dominated hop). Bands are consistent with published Airbus / ICAO-EEA fuel-vs-distance
performance; short sectors carry wider bands because the LTO cycle dominates. This upgrades the old
single Delhi–Mumbai anchor into a four-sector envelope check across the full stage-length range.

### 4.2 Known limitations (for honest defense)
- Single fleet assumption (A320 narrowbody) — correct for these domestic metro routes, but Air
  India flies widebodies on some sectors. We deliberately keep one transparent assumption rather
  than fabricate per-flight aircraft types.
- No measured load-factor or payload data. We now report fuel per **passenger** as well as per
  available seat, using a **labelled 80% load-factor assumption** (DGCA 2022 domestic ran ~80–87%);
  e.g. Delhi–Mumbai is 23.5 kg/available-seat → 29.4 kg/passenger.
- `price_minus_fuel` is a **directional** "what's left after fuel" lens, **not** a true margin
  (it excludes crew, ownership, airport and overhead costs).

---

## 5. Findings (all computed live from the data)

### Finding 0 — Efficiency Frontier (the synthesis)
Plotting every route by fuel/seat (x) against revenue/seat (y) shows **price does not reflect
fuel cost**. Best: **Bangalore→Chennai** earns ₹7,106 on **14.9 kg/seat**. Worst:
**Delhi→Chennai** earns *less* (₹6,102) on **47.5 kg** — a **3.7× worse** revenue-per-fuel ratio,
yet priced almost identically. Fuel and price are the same decision.

### Finding 1 — The Panic Tax (revenue)
Economy fares are flat and cheap until ~20 days out, then climb steeply. Last-minute (T-1–2)
averages **₹14,226** vs **₹5,037** for early bookings — a **2.8× swing with no change in cost**.
Yet **62.6%** of economy seats sell in that cheapest early window — the most under-priced segment.

### Finding 2 — The Double-Crime of connections (fuel + cost)
As stops increase, **both** fare and fuel rise:

| Routing | Avg fare | Fuel/seat | Share |
|---|---|---|---|
| Nonstop | ₹4,013 | 24.2 kg | 13.5% |
| 1 stop | ₹6,813 | 34.8 kg | 80.6% |
| 2+ stops | ₹9,142 | 44.7 kg | 5.9% |

Cutting inefficient connections is a rare **win-win-win**: lower fare, lower fuel bill, lower CO₂.

### Finding 3 — The Premium Whitespace
Business class commands an **8× premium** (₹52,540 vs ₹6,572) and is sold by **only 2 of 6**
carriers — Air India (₹47,131 avg) and Vistara (₹55,477). The merged Tata group owns India's
premium-cabin supply outright.

---

## 6. Recommendations & quantified impact

| Move | Action | Conservative impact |
|---|---|---|
| **1 · Re-time the revenue curve** | Dynamic-pricing floor lifting early fares | **+₹1,378 (≈ €15) / seat** at 15% capture, across 129,271 far-out bookings |
| **2 · Kill inefficient connections** | Re-route 2+ stop traffic to nonstop/1-stop | **−9.9 kg fuel & −31.3 kg CO₂ / seat** (≈ ₹1,238 / €14 fuel saved) |
| **3 · Own the premium cabin** | Protect & grow business class pre-merger | Defends an **8×** segment (**€584 vs €73** / seat) |

*Currency note: ₹90 ≈ €1 throughout; 1 crore = ₹10M ≈ €110K.*

**The ask:** a 90-day pilot across all three moves.

---

## 6b. Operations Research engine (prescriptive layer)

The findings above are *descriptive*. We add an OR layer that turns each into a
*prescribed, optimal* decision — every module runs live in `backend/optimize.py`.
It covers the full decision-analytics toolkit: linear & integer programming, LP
duality, multi-objective optimisation, simulation, risk modelling, reinforcement
learning, machine learning, exact revenue management, and efficiency analysis.

| Module | Method | What it answers |
|---|---|---|
| **Monte Carlo fuel-risk** | Simulate the annual fuel bill under lognormal ATF price shocks (~6,000 draws) → P10/P50/P90 + 95% Value-at-Risk | "How exposed are we to a fuel-price spike, and how big a hedge do the efficiency moves buy?" |
| **Dynamic price optimiser** | Per booking-window linear-demand revenue maximisation with elasticity rising over the horizon (early leisure elastic, late business inelastic). The demand gradient is **estimated from the data with a bootstrap CI** and that uncertainty is **propagated** to a revenue-uplift *band* (`/api/pricing_uncertainty`) | "What fare should we charge in each window — and how much does the elasticity uncertainty move the answer?" |
| **NSGA-II Pareto** | Multi-objective genetic algorithm over capacity-share vectors; non-dominated sorting + crowding distance, 40 generations | "What is the *provably* best set of fuel-vs-revenue network trade-offs?" |
| **Fleet MILP** | Integer program (`scipy.optimize.milp`): maximise contribution s.t. a fleet block-hour budget and service bounds | "Exactly how many flights should we fly on each route?" |
| **RL pricing agent** | Tabular Q-learning; state = (days-left, seats-left), reward = realised fare revenue, 4,000 episodes | "Can an agent *learn* the optimal pricing ladder from scratch?" (it rediscovers revenue management) |
| **ML demand engine** | Gradient-boosted fare model on 40k flights, leakage-proof flight-grouped split. Accuracy reported as **mean ± SD over 3 folds** (R² 0.96 ± 0.001, MAPE 15.8 ± 0.5%); P10–P90 intervals **recalibrated with split-conformal (CQR)** so coverage moves 73.6% → 77.8% toward the 80% nominal; skill vs baseline + permutation importance | "What drives the fare, how accurately (with an error bar) can we predict it, and are the intervals trustworthy?" |
| **EMSR seat protection** | Littlewood's rule — the exact two-class fare protection level (the optimum the RL agent only approximates) | "How many seats should we protect for Business instead of selling cheap early?" |
| **LP shadow prices** | LP relaxation of the fleet program; the dual of the block-hour budget prices capacity | "What is one more aircraft-hour — or one more jet — actually worth?" |
| **DEA route efficiency** | Input-oriented CCR data envelopment analysis, one linear program per route | "Which routes are on the efficiency frontier, and exactly which peer should each laggard copy?" |

We also **stress-test the fuel model itself**: every engineered constant is swung
±20% and the conclusions are recomputed (`/api/sensitivity`). The route efficiency
ranking holds at Spearman ≈ 0.997 and the nonstop-vs-2-stop fuel gap stays in a tight
band — the findings do not depend on the exact value of any single constant.

Note on the demand "elasticity": the log-log OLS slope is reported as a *descriptive
fare/volume gradient along the booking horizon*, not a causal price elasticity (price
and volume both move with days-to-departure, so it is confounded) — labelled as such
throughout.

All optimisers are seeded (reproducible) and return per-generation / per-episode
snapshots so the dashboard animates the optimiser working. The RL agent and NSGA-II
are the showpieces: one *learns* the panic-tax curve, the other *evolves* the
efficiency frontier into its provably-optimal form — and EMSR/LP/DEA add the
exact-optimal, marginal-value, and efficiency-scoring lenses alongside them.

**On method appropriateness.** We use the technique that fits the data, not the fanciest one.
Two deliberate exclusions: (1) **queuing theory** is the right tool for airport/runway congestion
and taxi-and-hold fuel burn, but the fares dataset has no operational timing data, so applying it
here would be the wrong instrument — it is logged as a future unlock once a runway/taxi-timing feed
exists (§6d data-readiness). (2) **Deep learning** was not used for demand: on ~300k tabular rows,
gradient boosting is stronger and interpretable, and it lets us *rank the levers* a revenue team can
pull — a neural net would add opacity without accuracy at this scale.

## 6c. Decision analysis & business case (`backend/business.py`)

The OR engine finds what's optimal; a thin decision-analysis layer turns it into a
board-level call — all computed live from the findings:

| Module | Method | What it answers |
|---|---|---|
| **Decision tree** | Expected monetary value across demand-response states, with EVPI, the probability flip-point, and a **5,000-draw Monte Carlo over all the labelled knobs** (P(hold), capture, both soften-keeps) | "How aggressively do we roll out dynamic pricing?" EMV favours the aggressive rollout (~₹651 cr/yr vs ₹405 cr); EVPI is small (~₹53 cr); the call flips only if demand softens >75% of the time (P(hold) < 0.248); and **Aggressive stays the EMV-max act in 97.7% of the Monte-Carlo draws** — robust, not an artefact of the assumed numbers. |
| **MCDM (TOPSIS)** | Six weighted criteria ranked by closeness to the ideal, cross-checked with a weighted sum, a 4,000-draw **weight**-stability test **and a 4,000-draw score-stability test** (perturbing the 1–5 scores, not just the weights) | "Which move first?" Re-time pricing ranks #1, stable in **66% of perturbed weightings and 72% of perturbed score matrices** (mean rank 1.4), premium #2, connections #3. |
| **Market sizing** | TAM / SAM / SOM funnel from one cited macro figure + labelled assumptions | "How big is the prize?" ≈ €7.3B domestic → €2.2B six-metro → €405M Tata served base the moves grow. |

The live app is organised as four acts — **Diagnosis** (descriptive), **Operations
Research** (prescriptive), **Business Strategy** (the decision), and **the Operating Model**
(the capability, §6d) — ending on the money number.

---

## 6d. From analysis to a data-driven department (Act IV)

A finding is a project; a repeatable decision is a department. The brief is *head of data*, so the
final act turns the analysis into an operating capability — the "executive thinking" dimension.

- **One finding, three audiences.** The Panic Tax is reframed for the **board** (decision + money),
  the **data scientist** (model + uncertainty), and the **data engineer** (pipeline + data contract),
  each with the expectation that keeps them aligned — the same insight communicated differently to
  each owner.
- **Data → decision flywheel + RACI.** Ingest → model → frame → decide → measure, with a named owner
  on every hop and an explicit Responsible/Accountable/Consulted/Informed matrix for the three moves.
- **Data-readiness ledger.** Each input is labelled *have* (fares), *proxy* (fuel, cost) or *gap*
  (live booking curve, competitor fares) with the owner who closes it — making the limits of the
  current analysis explicit rather than hidden.
- **Analytics maturity ladder.** The work climbs descriptive → diagnostic → predictive →
  prescriptive; the stated organisational task is to *stay* at prescriptive by automating ingest,
  monitoring and re-training.
- **90-day activation.** Prove (pilot the price floor + stand up the booking feed) → scale (roll out
  + replace the fuel proxy with telemetry) → automate (RL in shadow mode, weekly war-room, drift
  monitoring).

---

## 6e. Threats to validity (what a skeptic should attack first)

We hold the project to a research standard: a limitation you **scope and own** is
defensible; one you hide is a finding waiting to be demolished. The honest threats:

1. **Listings ≠ bookings ≠ demand (the load-bearing threat).** The EaseMyTrip data
   is *quoted fares*, not transactions. Row counts are listing frequency, not
   passengers; `far_out_flights` is itineraries, not confirmed bookings. Every
   revenue figure inherits this. We therefore frame the panic-tax and market-sizing
   numbers as **directional opportunity estimates on a demand proxy**, not a P&L. The
   *structural* findings (fuel rises with stops; only Tata sells business; price ≠
   fuel cost) do not depend on volume and are unaffected.
2. **No causal identification of the pricing uplift.** "Raise early fares to capture
   the gap" is a causal claim resting on a cross-sectional pattern, and the booking
   curve confounds it (price and volume both move with days-to-departure — which is
   exactly why we relabel the demand "elasticity" as a *descriptive gradient*, not a
   causal one). We do **not** claim the uplift is identified. We now also **estimate
   that gradient from the data with a 1,000-sample bootstrap 95% CI** (−0.36, CI
   [−0.54, −0.17]) and **propagate that uncertainty through the pricing optimiser** to
   a revenue-uplift *band* rather than a point — but the gradient is still descriptive,
   so this is an uncertainty band, not a causal estimate. A clean causal test would
   need an A/B fare experiment or a natural experiment we don't have.
3. **Assumption-driven decision modules — mitigated by sensitivity, not eliminated.**
   The decision tree's state probabilities and the MCDM's 1–5 scores and weights are
   *labelled judgements*, not estimates. We attack each with tornado discipline: the
   decision tree ships its EMV-vs-probability sweep, flip-point, **and a 5,000-draw
   Monte Carlo over *all* its knobs (P(hold), capture, both soften-keeps) — Aggressive
   stays optimal in 97.7%**; the MCDM ships **both a weight-stability check and a
   score-stability check** (re-ranking across 4,000 perturbed weightings *and* 4,000
   perturbed 1–5 score matrices — #1 holds in 66% and 72% respectively). A ranking
   that survives both axes is a finding; one that flips is an opinion. We report which.
4. **The fuel model is robust, with a four-anchor external check.** The ±20%
   sensitivity (Spearman ≈ 0.997) shows the conclusions don't depend on any single
   constant — but note it holds great-circle distance *fixed* (distance is geometric,
   not assumed), so it stress-tests the engineered constants, not the dominant
   distance driver. There is no per-flight fuel ground truth in the dataset; instead
   the model is checked against **published A320 trip-fuel envelopes at four stage
   lengths (270–1,709 km) — all inside band, mean absolute deviation 4.8%**
   (`/api/fuel_validation`, §4.1, enforced by a unit test). This is a multi-anchor
   envelope check, not a full calibration. Every figure is still a labelled estimate.
5. **Staleness & seasonality.** Data is Feb–Mar 2022; annual figures scale the
   two-month sample ×6, which ignores seasonality. The Vistara merger (completed 2024)
   post-dates the data, so "pre-merger" framing is a narrative device for the 2022
   persona, not a 2026 operational claim.
6. **Competitive response unmodeled.** We do not model IndiGo reacting to an Air India
   fare move (no game-theoretic equilibrium). The "demand softens" branch is a
   reduced-form proxy for defection, not a strategic best-response.

---

## 7. Reproducibility

Full-stack application; nothing is pre-baked.

```
backend/fuel_model.py   # engineered fuel model (documented constants)
backend/analysis.py     # applies model across 300k flights -> findings
backend/app.py          # FastAPI: /api/findings, /api/route/{s}/{d}/{stops}, /api/context
frontend/               # React + Vite dashboard (Recharts)
data/                   # Flight_price.csv, market_context.json, findings.json
```

Run: `python backend/app.py` + `npm --prefix frontend run dev` → open `http://localhost:5173`.
The dashboard's **Live Fuel Calculator** and **RL euro fare desk** run the model on any route in real time.

### Deliverables
- This technical submission (`deck/TECHNICAL_SUBMISSION.md`).
- Executive deck — `deck/AirIndia_WarRoom.pdf` (+ `exec-summary.html`, `AirIndia_ExecSummary.pdf`).
- `deck/RUN_OF_SHOW.md` — the 10-minute executive run-of-show.
- `deck/QA_DEFENSE.md` — Q&A defense sheet.
- The live application (`backend/` + `frontend/`), the analytical core of this submission.
