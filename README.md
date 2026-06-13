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
  app.py          API: /api/findings, /api/route, /api/context + 9 OR endpoints
frontend/     React + Vite dashboard (Recharts). Dark "Bloomberg-meets-aviation" UI,
              animated flight-path background, glassmorphism, live-animating OR sections.
data/         Flight_price.csv (real), market_context.json (real, cited), findings.json
deck/         Executive presentation (HTML + PDF) + technical submission
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
