# Air India War Room — Q&A Defense Sheet

The questions a sharp examiner *will* ask, with tight answers. Read it once before the room; the goal is to never be surprised. Format: **Q** → the short spoken answer → *(backup detail if pressed)*.

---

## 1. Data & validity (the most likely attacks)

**Q: Your data is quoted fares, not bookings — aren't you modeling listings, not demand?**
Right on the data, but not on the money. Two separate things: (1) the descriptive findings (panic-tax multiple, far-out share) are *shares of listings* — true of the data we have. (2) The **monetized** figures (decision-tree EMV, market funnel) are NOT listing-row counts times rupees — they're anchored to the cited **110M-passenger DGCA base** × six-metro share × Tata served share × far-out share, giving ~3.3M far-out economy passengers a year. So the prize is passengers × per-seat uplift, not scrape-rows × 6. The **structural** findings (fuel rises with stops, only Tata sells business, price ≠ fuel cost) don't depend on volume at all.
*(If pressed: it's in §6d. We'd still want transaction data to firm up the load factor; the served base uses a labelled 88% economy share and the observed far-out share as a booking-share proxy.)*

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
Two ways that agree. **Top-down:** a 2–4% revenue-management uplift on Air India's ₹38,812 cr FY24 revenue is ₹780–1,550 cr/yr (≈ €90–170M) — a quarter to a third of the FY24 loss. **Bottom-up:** the pricing move alone, on ~3.3M far-out economy passengers (from the 110M DGCA base) at a ₹1,378/seat uplift, is ≈ ₹460 cr at 15% capture and ≈ ₹920 cr at 30% (€51–102M) — which sits inside the top-down band once premium and fuel are added. The two derivations reconcile; that's the point.

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
That it knows its own limits. The standout isn't the nine OR engines and the decision layer — it's the Threats-to-Validity section that names what to attack before you can. That's the difference between a dashboard and an analysis.

**Q: If the live demo breaks?**
We have the deck (PDF) and a recorded walkthrough as fallback. Everything in the app also runs from cited numbers in the technical submission. *(Reminder to us: the app needs internet for fonts + the live map; test the venue wifi, pre-warm the backend.)*

---

## 7. The operating model & the "data-driven department" (Act IV)

**Q: Why an operating-model section — isn't that beyond the analysis?**
Because finding a number is a *project*; keeping the loop turning is a *department*. The brief is "head of data," not "analyst for a day." Act IV shows we can translate analytics into an operating capability: the same finding reframed for the **board, the data scientist, and the data engineer** (each with the expectation that keeps them aligned), a **RACI** on the three moves, a data→decision **flywheel**, the **maturity ladder** (we reach prescriptive), and a **90-day activation** plan. That's the rubric's "executive thinking" dimension made concrete.

**Q: How would you actually staff and run it?**
Five seats: data engineering (the feeds and contracts), data science (the models), an analytics translator (frames each result for its audience), revenue management, and an exec owner. Cadence: a weekly war-room and a decision log. The principle: decisions over dashboards — a chart that doesn't change a decision is overhead.

**Q: You label fuel a "proxy" and the booking curve a "gap" — isn't that admitting the work is incomplete?**
It's the opposite — it's the work being honest about its inputs. The data-readiness ledger names exactly what's solid (fares), what's modelled (fuel, cost), and what's missing (live booking curve, competitor fares), each with an owner. The findings are sound on what we have; the prize grows as the gaps close. Naming them is expectation management, not weakness.

---

## 8. Methods we deliberately did *not* use

**Q: Does queuing theory apply here?**
It applies to *waiting-line* problems — runway/taxi-out queues (which drive taxi-and-hold fuel burn), ATC slot allocation, terminal and check-in throughput. We excluded it on purpose: the fares dataset has no operational timing data (no arrival rates, no service times), and our problem is revenue management and optimisation, not congestion. Forcing it in would be the wrong tool for the data. It's logged as a future unlock in the data-readiness ledger — give us a runway/taxi timing feed and queuing theory quantifies congestion fuel.

**Q: Why not deep learning / a neural net for demand?**
On ~300k rows with a dozen features, gradient boosting is the right call — stronger on tabular data, far more interpretable, and it lets us *rank the levers* a revenue team can pull (cabin, timing dominate). A neural net would add opacity without accuracy on a problem this size. Right tool, not the fanciest tool.

---

## 9. Format & delivery

**Q: Why present from a live web app instead of slides?**
Two reasons: it's the **technical submission**, and it's live proof the analysis is real — the model runs on the server, you can change a route and watch the fare move. In the room we present the *executive narrative* and surface only two or three live demos (the fuel calculator, the RL euro fare desk); the nine engines are depth for this Q&A, not the script. A static PDF deck is the failsafe if the venue or the laptop misbehaves.

**Q: The RL "fare desk" — is that a real quote?**
No, and it says so. It applies the agent's *converged policy* to each sector's **observed** fare range (far-out → last-minute) scaled by great-circle distance. It's an illustration of the learned behaviour — hold cheap when empty and far out, escalate as seats fill and departure nears — not a live booking-system price.

---

## One-line close (if you only remember one thing)
*"Fuel and price are not two problems — they're one decision. We engineered the fuel the data was missing, computed the optimal moves nine ways, and we're honest about exactly what we can and can't claim."*
