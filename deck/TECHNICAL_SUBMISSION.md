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

### 4.1 Known limitations (for honest defense)
- Single fleet assumption (A320 narrowbody) — correct for these domestic metro routes, but Air
  India flies widebodies on some sectors. We deliberately keep one transparent assumption rather
  than fabricate per-flight aircraft types.
- No load-factor or payload weight data; per-seat figures assume a full 180-seat cabin.
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
| **1 · Re-time the revenue curve** | Dynamic-pricing floor lifting early fares | **+₹1,378 / seat** at 15% capture, across 129,271 far-out bookings |
| **2 · Kill inefficient connections** | Re-route 2+ stop traffic to nonstop/1-stop | **−9.9 kg fuel & −31.3 kg CO₂ / seat** |
| **3 · Own the premium cabin** | Protect & grow business class pre-merger | Defends an **8×** revenue-per-seat segment |

**The ask:** a 90-day pilot across all three moves.

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
The dashboard's **Live Fuel Calculator** runs the model on any route in real time.
