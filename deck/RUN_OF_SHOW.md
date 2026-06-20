# Air India War Room — Run of Show (10-minute executive presentation)

How to present **live from the app** (`npm run dev` → the scrolling site) so it lands in 10 minutes. The OR depth is your Q&A armory ([QA_DEFENSE.md](./QA_DEFENSE.md)), not the script.

---

## The one-sentence thesis
> **"Fuel and price aren't two problems — they're one decision, and Air India is leaving crores on the runway in both."**

Say it in the first 30 seconds. Say it again at the close.

## The opening hook (memorise this)
> *"In January 2022, Tata takes the controls of a national carrier that's losing ₹4,444 crore a year. Before touching anything, the new owner asks one question of the data: where is the money leaking? The answer is the two levers no one is pulling — fuel and price."*

---

## Timing & what to show

Present from the app. **Show** the bold beats; **scroll past** the rest while narrating one line. Numbers below are elapsed time.

| Time | Beat | Show on screen | Say (CEO language) |
|---|---|---|---|
| 0:00–0:40 | **Hook + setup** | Hero ("Two levers. One decision.") | The hook above. Set the persona: new CDO, opening diagnostic. |
| 0:40–1:30 | **Problem + why care** | KPI band | "300k flights, no fuel data — so we engineered it. Four numbers tell the story." Hit the panic-tax multiple and the 8× premium. Why care: privatised, outflown by IndiGo, ₹4,444 cr loss. |
| 1:30–2:30 | **The hero finding** | Frontier (fuel vs revenue) | "Plot every route by what it burns and what it earns and the fleet sorts itself into winners and bleeders. Fuel and price are the *same* chart." |
| 2:30–3:30 | **Finding 1 — Panic Tax** | Panic Tax section | "The same seat swings [X]× early-to-late at zero extra cost. We give away early, gouge late — money lost in both directions." |
| 3:30–4:15 | **Findings 2 & 3 (fast)** | Scroll Connections → Premium banner | One line each: "Connections cost twice — fare *and* fuel *and* carbon." / "Business class prints money, and only Tata sells it." |
| 4:15–5:15 | **We compute the answer** | Engine rack → **RL fare desk demo** | "We don't just see it — we compute it, nine ways." Point at the rack ("nine live engines on the server"). Then *do one demo*: change the route on the RL fare desk, watch the euro fare move. Optionally the price-optimiser gap. |
| 5:15–6:30 | **Recommendation** | Recommendations (3 moves) + 1 line of Operating Model | "Three moves, ranked: price floor first, cut connections, grow premium." Then: "And here's how a data department keeps deciding" — flash the flywheel/RACI for 10 seconds. |
| 6:30–7:45 | **Impact** | Finale (₹1,164 cr / €129M) | "Pricing discipline alone is worth up to ₹1,164 crore a year — about €129M — a real bite out of the loss. Drag the slider: even conservative assumptions erase a chunk of it." |
| 7:45–8:30 | **Risk / why trust it** | Sensitivity tornado (one line) | "We tried to break our own conclusions. Flex every assumption ±20% — the recommendation still holds." |
| 8:30–9:15 | **The ask** | Conclusion ("Monday morning") | "Monday: switch on the early-booking floor on the top five routes, instrument the booking curve, first recovered rupees on the board next week." |
| 9:15–10:00 | **Close + buffer** | (stay on conclusion) | Repeat the thesis. Hand to Q&A. |

**If you're running long, cut in this order:** Findings 2&3 detail → the operating-model flash → the sensitivity line. Never cut the hook, the recommendation, or the impact number.

**Never open on screen:** the Operations Research deep charts (MILP, DEA, shadow prices, EMSR). They're there if asked — jump via the engine rack.

---

## Suggested speaker split (Team 3, four presenters)
- **Presenter A (anchor):** Hook, setup, the ask, close. Owns the thesis.
- **Presenter B (the findings):** KPI band, Frontier, Panic Tax, connections, premium.
- **Presenter C (the maths → decision):** engine rack + the RL/price demo, the three moves, operating model.
- **Presenter D (impact & rigor):** the finale number, sensitivity/risk, and lead Q&A on methodology.

Rehearse the **handoffs** — they're where teams lose time. One sentence to pass the baton, no "uh, so now X will…".

---

## Tech check & failsafe (run 30 min before)
1. **Pre-warm the backend** — first load computes the fuel model across 300k rows (~1–2 min to `ready`). Open the app once before you present so it's warm.
2. **Internet** — the app pulls Google Fonts + the live OpenSky map. Test venue wifi. If it's dead: fonts fall back gracefully and the live map degrades to its static state — fine.
3. **Sound** — the hero engine audio works on click; make sure the *browser tab* isn't muted and system volume is up. Optional anyway.
4. **Performance on a weak laptop** — the cinematic backgrounds + canvas + frosted panels are GPU-heavy. The app ships a built-in **lightweight mode**: turn on the OS setting **"Reduce motion"** (Windows: Settings → Accessibility → Visual effects → Animation effects *off*) and every continuous animation (canvas network, film grain, Ken-Burns backdrops, pulses) drops to a static, smooth render with the design intact. Toggle it if the projector stutters.
5. **Zoom/scale** — present at 100% browser zoom on a 1440px-wide (or wider) window; the layout is tuned for desktop.
6. **Hard fallback** — if the app won't run at all, present from `deck/AirIndia_WarRoom.pdf`. Every number in it is cited in `deck/TECHNICAL_SUBMISSION.md`.

---

## Q&A handoff
Read [QA_DEFENSE.md](./QA_DEFENSE.md) once beforehand. The three most likely attacks and your one-liners:
- **"Quoted fares, not bookings?"** → structural findings don't depend on volume; the money figures are anchored to the DGCA 110M-passenger base, not scrape-rows.
- **"You invented the fuel data."** → engineered from published benchmarks, every figure labelled an estimate; conclusions hold at ±20% on every constant.
- **"Is the uplift causal?"** → no, and we don't claim it; the decision tree carries the uncertainty explicitly.

**The close, if you only say one thing:**
> *"We engineered the fuel the data was missing, computed the optimal moves nine ways, and we're honest about exactly what we can and can't claim. Based on this, you know the first move to make Monday."*
