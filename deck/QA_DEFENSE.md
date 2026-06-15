# Air India War Room — Q&A Defense Sheet

The questions a sharp examiner *will* ask, with tight answers. Read it once before the room; the goal is to never be surprised. Format: **Q** → the short spoken answer → *(backup detail if pressed)*.

---

## 1. Data & validity (the most likely attacks)

**Q: Your data is quoted fares, not bookings — aren't you modeling listings, not demand?**
Yes, and we say so explicitly. Row counts are listing frequency, not passengers. So we frame the panic-tax and market-sizing numbers as *directional opportunity estimates on a demand proxy*, not a P&L. The **structural** findings (fuel rises with stops, only Tata sells business, price ≠ fuel cost) don't depend on volume at all, so they're unaffected.
*(If pressed: it's in §6d Threats to Validity. We'd want transaction data to firm up the revenue numbers; we didn't have it, so we scoped the claims to what listings support.)*

**Q: Is the pricing uplift causally identified?**
No, and we don't claim it is. The booking curve confounds price and volume — both move with days-to-departure. That's exactly why we relabel the demand "elasticity" as a *descriptive gradient*, not a causal one. The decision tree handles the uncertainty explicitly with a "demand softens" state; a clean test would need an A/B fare experiment we don't have.

**Q: Is the data even real?**
Yes — EaseMyTrip, Feb–Mar 2022, 300,153 rows, zero nulls/dupes. The tell that it's real: business class is sold only by Vistara and Air India, exactly matching the 2022 market. A generator wouldn't reproduce that.

**Q: The data is from 2022 — isn't it stale for a 2026 decision?**
The persona is the 2022 CDO doing the opening diagnostic, so the data and the moment match. We're explicit that the Vistara merger (completed 2024) post-dates the data, so "pre-merger" is a narrative device, not a live 2026 claim.

---

## 2. The fuel model

**Q: You invented the fuel numbers.**
We *engineered* them from first principles, every constant a published benchmark — great-circle distance + a takeoff-cycle penalty per stop, A320 cruise burn, ICAO CO₂ factor, Delhi ATF. Every figure is labelled an estimate, never presented as measured.

**Q: How do you know the model is right?**
We don't claim accuracy — we claim *robustness*. There's no fuel ground truth in this dataset to validate against, so instead we swung every constant ±20% and the conclusions barely move (route rankings hold at Spearman ≈ 0.997). The findings don't depend on any single guessed number.

**Q: Why A320 when your hero shows an A350?**
The A320 family flies essentially all domestic metro routes in India — that's what these flights are, so it's the correct modeling choice. The A350 in the cover is the new flagship, used for brand imagery; it only flies long-haul international. The model is A320 on purpose.

**Q: Single-fleet assumption?**
Yes — one transparent assumption beats fabricating per-flight aircraft types. Correct for these domestic narrowbody sectors; we flag it as a limitation.

---

## 3. The recommendations

**Q: Why exactly these three moves?**
Each maps to a distinct lever the brief asked about and a distinct finding: re-time pricing (the *price* lever, panic-tax), kill connections (the *fuel* lever, the double-crime), own premium (the *strategic* moat). That covers fuel and price plus the one structural advantage only Tata holds.

**Q: Why not a fourth?**
A fourth would either duplicate one of these or stray into something the data can't support (network/hub redesign, loyalty, ancillaries). Three quantified, defensible moves beat five where two are guesses.

**Q: "Own the premium cabin" needs capex — where's the ROI?**
Fair — we don't size the cabin investment, that's a limitation. But the first step is zero-capex: EMSR seat protection optimises the inventory we already fly. Grow the hard assets only after that banks the easy win.

**Q: Justify the headline money number.**
A 2–4% revenue-management uplift on Air India's ₹38,812 cr FY24 revenue is ₹780–1,550 cr/yr (≈ €90–170M) — a quarter to a third of the FY24 loss, from pricing discipline alone. The uplift band is conservative and modelled; we slide it live in the app.

---

## 4. OR / methodology

**Q: Isn't the OR engine overkill / for show?**
It's there to prove the recommendations are *computed*, not asserted — and to cover the full decision-analytics toolkit the course teaches (LP/MILP, duality, simulation, RL, ML, DEA, exact revenue management). The RL agent independently *rediscovers* the panic-tax curve, which validates the finding from a second direction.

**Q: Your ML model — how do you know it's not overfit?**
Leakage-proof split: we group by flight so no flight is in both train and test. We report *out-of-sample* R² (0.96), MAPE (15.6%), skill vs a naive baseline (+31%), and prediction-interval coverage (73.6% vs 80% nominal — slightly under, and we say so). The overfit gap is 0.011.

**Q: The MCDM scores are subjective.**
The 1–5 criterion scores and weights are labelled judgement, yes. That's why we don't stop at a point ranking — we re-run TOPSIS across 4,000 perturbed weightings. The #1 move (re-time pricing) holds in ~66% of them with mean rank 1.4. A ranking that survives the weights is a finding; one that flips is an opinion, and we report which.

**Q: What's EVPI and why does it matter?**
Expected Value of Perfect Information — the most you'd rationally pay for perfect demand research before deciding. Ours is small (~₹12 cr), which means the decision is robust: more research wouldn't change the call. The flip-point confirms it — you'd only switch to the gentle pilot if you believed demand softens >75% of the time, and we believe ~35%.

---

## 5. Business / market sizing

**Q: Defend the ₹6,000 fare and 30% trunk-share assumptions in TAM/SAM/SOM.**
They're labelled order-of-magnitude assumptions, anchored to one cited macro figure (110M domestic pax, DGCA). The point of the funnel isn't a precise forecast — it's to reframe the prize: we're not chasing the whole market, we're growing a focused, winnable 18.4% served share on routes where Tata already has the metal.

**Q: You don't model competitive response.**
Correct, and we flag it. The decision tree's "demand softens" branch is a reduced-form proxy for IndiGo poaching price-sensitive leisure, not a game-theoretic equilibrium. A full best-response model is the honest next step.

---

## 6. Scope / curveballs

**Q: What would you do with more time / data?**
Three things: (1) transaction/booking data to turn the proxy figures into a real P&L; (2) an A/B fare test for causal identification of the pricing uplift; (3) a competitive best-response model. Each is named as a limitation, not hidden.

**Q: What's the single most defensible thing here?**
That it knows its own limits. The standout isn't the 12 engines — it's the Threats-to-Validity section that names what to attack before you can. That's the difference between a dashboard and an analysis.

**Q: If the live demo breaks?**
We have the deck (PDF) and a recorded walkthrough as fallback. Everything in the app also runs from cited numbers in the technical submission. *(Reminder to us: the app needs internet for fonts + the live map; test the venue wifi, pre-warm the backend.)*

---

## One-line close (if you only remember one thing)
*"Fuel and price are not two problems — they're one decision. We engineered the fuel the data was missing, computed the optimal moves nine ways, and we're honest about exactly what we can and can't claim."*
