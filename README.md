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
backend/      FastAPI — serves the fuel model + findings LIVE from 300,153 flights
  fuel_model.py   engineered, documented, citable fuel/CO2 model
  analysis.py     applies the model across the dataset -> strategic findings
  app.py          API: /api/findings, /api/route/{src}/{dst}/{stops}, /api/context
frontend/     React + Vite dashboard (Recharts). Dark "Bloomberg-meets-aviation" UI.
data/         Flight_price.csv (real), market_context.json (real, cited), findings.json
deck/         Executive presentation
```

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
