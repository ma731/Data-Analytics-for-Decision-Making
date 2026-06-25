# Air India · War Room

A full-stack executive analytics "command center" for IE MBDS Team Projects (Team 3).
**Dataset 3 — Flight Price.** Persona: the newly-appointed CDO of Air India, weeks after
Tata's January 2022 acquisition, deciding how to optimize **fuel consumption and flight price**.

## The thesis
The brief asks to optimize *fuel and price*, but the EaseMyTrip dataset has **no fuel field**.
Instead of hand-waving, we **engineered a fuel model from physics** (great-circle distance +
takeoff-cycle penalty per stop, calibrated to real A320-family burn rates and Feb–Mar 2022
Delhi jet-fuel prices). That lets us answer the half of the brief the raw data cannot — and
put fuel and revenue on the same chart, the **Efficiency Frontier**.

## What's inside
```
backend/      FastAPI — serves the fuel model, findings, AND a live OR engine
  fuel_model.py   engineered, documented, citable fuel/CO2 model
  analysis.py     applies the model across the dataset -> strategic findings
  optimize.py     operations-research engine (9 modules, see below)
  business.py     decision analysis + business case (decision tree, MCDM, TAM/SAM/SOM)
  app.py          API: /api/findings, /api/route, /api/context + 9 OR + 3 decision endpoints
frontend/     React + Vite dashboard (Recharts). Dark, near-monochrome theme with a
              single mint accent (Hanken Grotesk + DM Mono). Four acts: Diagnosis ->
              Operations Research -> Business Strategy -> the Operating Model, over a
              cinematic scroll journey (exterior aircraft -> cabin -> airport), ending
              on the money number.
data/         Flight_price.csv (real), market_context.json (real, cited), findings.json
deck/         Academic write-up (PhD-style THESIS.md + an IEEE-format paper:
              AirIndia_IEEE.pdf / .tex / .html), executive deck (HTML + PDF),
              technical submission, Q&A defense sheet, and the 10-minute run-of-show
```

## Operations Research engine (`backend/optimize.py`)
Turns the descriptive findings into prescriptive, optimal decisions — all computed live:

| Module | Technique | Endpoint |
|---|---|---|
| Monte Carlo fuel-risk | Simulation (lognormal ATF shocks → P10/P50/P90, VaR-95) | `/api/sim/fuel` |
| Dynamic price optimiser | Per-window linear-demand revenue maximisation | `/api/optimize/pricing` |
| NSGA-II Pareto | Multi-objective genetic algorithm (fuel vs revenue) | `/api/pareto` |
| Fleet MILP | Integer program — frequency allocation (scipy.milp) | `/api/fleet` |
| RL pricing agent | Tabular Q-learning over the booking horizon | `/api/rl` |
| ML demand engine | Gradient boosting + permutation importance + OLS gradient | `/api/demand` |
| EMSR seat protection | Littlewood's rule — exact fare-class protection level | `/api/emsr` |
| LP shadow prices | LP relaxation + duality — marginal value of a block-hour | `/api/shadow` |
| DEA route efficiency | Data envelopment analysis — one CCR linear program per route | `/api/dea` |

Covers the full decision-analytics toolkit: linear & integer programming, LP
duality, multi-objective optimisation, simulation, risk modelling, reinforcement
learning, machine learning, exact revenue management, and efficiency analysis.

## Decision analysis & business case (`backend/business.py`)
The OR engine says what's optimal; this layer turns it into a boardroom decision — also live:

| Module | Technique | Endpoint |
|---|---|---|
| Decision tree | Expected monetary value, **EVPI**, and the probability flip-point for the pricing rollout under demand uncertainty | `/api/decision` |
| MCDM ranking | **TOPSIS** over six weighted criteria (+ weighted-sum cross-check + a weight-stability test) — what to do first | `/api/mcdm` |
| Market sizing | **TAM / SAM / SOM** funnel from cited macro figures + labelled assumptions | `/api/market` |

**The decision, quantified (live):** the decision tree backs the *aggressive* pricing rollout —
EMV **₹651 cr/yr** vs ₹405 cr for the gentle pilot — and its **EVPI is only ₹53 cr**, so the call
is robust (it flips only if you believe demand softens >75% of the time). It survives a **5,000-draw
Monte Carlo over every assumption in 97.7%** of draws. TOPSIS ranks *re-time pricing* **#1**, stable
in **66%** of perturbed weightings and **72%** of perturbed scores. Headline impact, reconciled
top-down and bottom-up: **~₹1,164 cr (~€129M)/yr**.

**Rigor & robustness (all live, unit-tested):** the engineered fuel model is checked against
**published A320 trip-fuel bands at four stage lengths** (all in-band, 4.8% mean deviation —
`/api/fuel_validation`); the demand gradient is estimated with a **bootstrap 95% CI** and that
uncertainty is **propagated** to a revenue-uplift band (`/api/pricing_uncertainty`); the ML model
reports **R² 0.96 ± 0.001 over 3 folds** with **split-conformal (CQR)** intervals (coverage
73.6% → 77.8%); and fuel is now reported **per passenger** (labelled 80% load factor) as well as
per available seat.

## Academic write-up
For readers who want the full methodology rather than the slides, `deck/` carries two long-form papers:
- **`THESIS.md`** — a PhD-style technical report: research questions, a literature framing, the full
  fuel-model derivation, formal statements of all nine OR methods, the decision analysis, a dedicated
  **threats-to-validity** section, and an honest read on what would (and wouldn't) make it a doctoral
  contribution.
- **An IEEE-format paper** — the same work as a conference paper: **`AirIndia_IEEE.pdf`** (rendered,
  two-column), **`AirIndia_IEEE.tex`** (genuine IEEEtran source — drop into Overleaf and compile), and
  **`AirIndia_IEEE.html`** (the source the PDF renders from), with equations, IEEE tables, an
  Efficiency-Frontier figure, and IEEE-style references.

## Act IV — the operating model (turning analysis into a capability)
The brief is *head of data*, not analyst-for-a-day — so the story closes on how a data-driven
department actually runs:
- **One finding, three ways** — the Panic Tax reframed for the board, the data scientist and the
  data engineer, each with the expectation that keeps them aligned.
- **Data → decision flywheel + RACI** — named owners on every hop and every move.
- **Data-readiness ledger** — what's solid (fares), modelled (fuel), and still a gap (live booking
  curve / competitor fares), each with an owner to close it.
- **Analytics maturity ladder** — the work reaches *prescriptive*; the org task is to stay there.
- **90-day activation plan** — prove → scale → automate.

Plus a live, interactive **euro fare desk** (the RL agent's learned policy quoting a fare on any
route) and a navigable **engine rack** indexing the nine OR engines.

## Presenting it
- `deck/RUN_OF_SHOW.md` — a 10-minute, beat-by-beat executive run-of-show (what to show vs skip, speaker split, tech failsafe).
- `deck/QA_DEFENSE.md` — the questions a sharp examiner will ask, with tight answers.
- Present live from the app; `deck/AirIndia_WarRoom.pdf` is the failsafe. If the projector
  stutters, enable the OS "Reduce motion" setting — the app drops to a static, lightweight render.

## Run it
```powershell
# one command (Windows)
./run.ps1
```
or manually:
```powershell
# terminal 1 — backend
cd backend; pip install -r requirements.txt; python app.py
# terminal 2 — frontend
cd frontend; npm install; npm run dev
# open http://localhost:5173
```

## Key findings (all computed live)
| Finding | Number |
|---|---|
| Panic-tax multiple (last-minute vs far-out economy fare) | **2.8×** |
| Share of economy seats in the cheapest booking window | **62.6%** |
| Business-class premium over economy | **8×** (only 2 of 6 carriers sell it) |
| Fuel/seat: nonstop vs 2+ stops | **24 kg → 45 kg** |
| Efficiency spread: best vs worst route (revenue per fuel-kg) | **~3.7×**, priced near-identically |

## Honesty / defensibility
Fuel, cost and CO₂ are **modeled estimates** from published benchmarks, clearly labelled as
such throughout. The flight data is real (EaseMyTrip, Feb–Mar 2022). Market context (Tata
acquisition, market shares, ATF prices) is independently sourced and cited in
`data/market_context.json`.

We hold it to a research standard. A **Threats to Validity** section
(`deck/TECHNICAL_SUBMISSION.md`) names what a skeptic should attack first — listings are not
bookings, the pricing uplift is not causally identified, and the decision/MCDM modules rest on
labelled assumptions. Where those assumptions bite, we stress-test them: the fuel model is
swung ±20% (route rankings hold at Spearman ≈ 0.997), the MCDM ranking is re-run across 4,000
perturbed weightings, and the decision tree reports the exact probability at which its
recommendation flips.
