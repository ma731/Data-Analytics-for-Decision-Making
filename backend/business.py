"""
Air India War Room — Decision-analysis & business-case layer.

Three classic decision-analytics / strategy tools that sit on top of the OR
engine and translate the findings into board-level decisions:

  1. decision_tree   — decision analysis: EMV, EVPI and the probability flip-point
                       for "how aggressively do we roll out dynamic pricing?"
  2. mcdm_moves      — multi-criteria decision making (TOPSIS + weighted sum):
                       rank the three strategic moves -> what to do first.
  3. market_sizing   — TAM / SAM / SOM funnel for the domestic metro market.

Everything is anchored to the LIVE findings (so the numbers can never drift from
the recommendations) plus one cited macro figure (110M domestic pax, DGCA 2022).
Modelling assumptions (capture rates, state probabilities, criteria weights,
average fares, segment shares) are EXPLICIT and labelled — never smuggled in.
"""

from functools import lru_cache
import json
import os

import numpy as np

import analysis

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# The dataset is a ~2-month scrape (Feb-Mar 2022); annualise sample totals x6.
SAMPLE_MONTHS = 2
ANNUALISE = 12 / SAMPLE_MONTHS


def _context():
    with open(os.path.join(DATA_DIR, "market_context.json")) as fh:
        return json.load(fh)


# ----------------------------------------------------------------------------
# 1. DECISION ANALYSIS — decision tree, EMV, EVPI, probability flip-point
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def decision_tree():
    """
    The textbook decision-under-uncertainty problem applied to Move 1
    (re-time the revenue curve).

    DECISION (act): how hard to push the dynamic-pricing floor on far-out seats
        - Aggressive  : lift early fares ~30% of the way to the late fare
        - Conservative: the recommended 15% capture (a gentle pilot)
        - Do nothing  : status quo (baseline, 0)

    UNCERTAINTY (state of nature): how price-sensitive demand reacts
        - Holds   : passengers accept the higher early fare (the inelastic case)
        - Softens : price-sensitive leisure defects to IndiGo, eroding volume

    PAYOFFS = incremental annual contribution (Rs cr), built LIVE from the panic-
    capture finding: uplift = capture_rate x gap_per_seat x far_out_bookings,
    annualised. When demand SOFTENS only a fraction is realised (heavy defection
    hits the aggressive play hardest; the gentle pilot mostly survives).

    We then compute EMV per act, the EVPI (value of perfect demand research) and
    the probability of 'holds' at which the recommended act flips — i.e. how sure
    we'd need to be wrong before the decision changes.
    """
    f = analysis.build_findings()
    pc = f["opportunity"]["panic_capture"]
    gap = float(pc["gap_per_seat_inr"])             # Rs / seat, far-out vs late
    far_seats = float(pc["far_out_flights"])        # far-out economy bookings (sample)
    cons_capture = float(pc["capture_rate_pct"]) / 100.0   # 0.15, the recommended pilot
    aggr_capture = 0.30                              # ASSUMPTION: aggressive push

    def annual_cr(capture):
        return capture * gap * far_seats * ANNUALISE / 1e7   # Rs cr / yr

    cons_hold = annual_cr(cons_capture)
    aggr_hold = annual_cr(aggr_capture)

    # realised fraction when demand SOFTENS (labelled assumptions)
    AGGR_SOFTEN_KEEP = 0.16    # aggressive: most of the gain lost to defection
    CONS_SOFTEN_KEEP = 0.65    # gentle pilot: floor mostly holds

    P_HOLD = 0.65              # ASSUMPTION: prob. demand holds (late seg is inelastic)
    P_SOFTEN = 1 - P_HOLD

    acts = [
        {"act": "Aggressive", "hold": aggr_hold, "soften": aggr_hold * AGGR_SOFTEN_KEEP},
        {"act": "Conservative", "hold": cons_hold, "soften": cons_hold * CONS_SOFTEN_KEEP},
        {"act": "Do nothing", "hold": 0.0, "soften": 0.0},
    ]
    for a in acts:
        a["emv"] = P_HOLD * a["hold"] + P_SOFTEN * a["soften"]

    best = max(acts, key=lambda a: a["emv"])
    # EVPI: with perfect info you pick the best act in EACH state
    ev_with_pi = P_HOLD * max(a["hold"] for a in acts) + P_SOFTEN * max(a["soften"] for a in acts)
    evpi = ev_with_pi - best["emv"]

    # probability flip-point: solve EMV_aggr(p) = EMV_cons(p) for p (= P_hold)
    # EMV(p) = soften + p*(hold - soften); flip where the two lines cross.
    a_agg, a_con = acts[0], acts[1]
    slope = (a_agg["hold"] - a_agg["soften"]) - (a_con["hold"] - a_con["soften"])
    intercept = a_agg["soften"] - a_con["soften"]
    flip_p = -intercept / slope if slope else None  # p_hold where aggr overtakes cons
    flip_p = float(min(max(flip_p, 0.0), 1.0)) if flip_p is not None else None

    # EMV-vs-probability sweep, for the chart (each act is linear in p)
    sweep = []
    for k in range(0, 21):
        p = k / 20
        sweep.append({
            "p_hold": round(p, 2),
            "Aggressive": round(a_agg["soften"] + p * (a_agg["hold"] - a_agg["soften"]), 1),
            "Conservative": round(a_con["soften"] + p * (a_con["hold"] - a_con["soften"]), 1),
            "Do nothing": 0.0,
        })

    return {
        "decision": "How aggressively to roll out dynamic pricing (Move 1)",
        "states": [
            {"state": "Demand holds", "prob": P_HOLD,
             "desc": "Late segment is inelastic; passengers accept higher early fares."},
            {"state": "Demand softens", "prob": round(P_SOFTEN, 2),
             "desc": "Price-sensitive leisure defects to IndiGo, eroding volume."},
        ],
        "acts": [
            {"act": a["act"],
             "payoff_hold_cr": round(a["hold"], 1),
             "payoff_soften_cr": round(a["soften"], 1),
             "emv_cr": round(a["emv"], 1),
             "recommended": a["act"] == best["act"]}
            for a in acts
        ],
        "best_act": best["act"],
        "best_emv_cr": round(best["emv"], 1),
        "ev_with_perfect_info_cr": round(ev_with_pi, 1),
        "evpi_cr": round(evpi, 1),
        "flip_probability": round(flip_p, 3) if flip_p is not None else None,
        "current_p_hold": P_HOLD,
        "sweep": sweep,
        "assumptions": {
            "conservative_capture": cons_capture,
            "aggressive_capture": aggr_capture,
            "p_hold": P_HOLD,
            "aggr_realised_if_soften": AGGR_SOFTEN_KEEP,
            "cons_realised_if_soften": CONS_SOFTEN_KEEP,
            "annualisation_factor": ANNUALISE,
        },
        "note": ("Payoffs built live from the panic-capture finding "
                 "(uplift = capture x gap x far-out bookings, annualised x6). "
                 "State probabilities and realised-fractions are labelled assumptions. "
                 "EVPI = the most you'd rationally pay for perfect demand research. "
                 "Flip-probability = the P(holds) at which the recommended act changes."),
    }


# ----------------------------------------------------------------------------
# 2. MCDM — rank the three moves with TOPSIS (+ weighted-sum cross-check)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def mcdm_moves():
    """
    Multi-criteria decision making: which strategic move should the CDO run first?

    Six criteria, each a transparent 1-5 score calibrated to the findings and the
    strategic-rationale chips (all framed so higher = better). Weights are an
    explicit, labelled judgement that sums to 1. We rank with TOPSIS (distance to
    the ideal/anti-ideal solution) and cross-check with a simple weighted-sum —
    a robust ranking agrees across both methods.
    """
    criteria = [
        {"key": "revenue", "label": "Revenue impact", "weight": 0.30},
        {"key": "esg", "label": "Fuel / ESG impact", "weight": 0.15},
        {"key": "low_capex", "label": "Low capex", "weight": 0.15},
        {"key": "speed", "label": "Speed to value", "weight": 0.15},
        {"key": "reversible", "label": "Reversibility", "weight": 0.10},
        {"key": "moat", "label": "Defensibility / moat", "weight": 0.15},
    ]
    # rows = moves, cols = criteria (1-5, higher is better)
    moves = [
        {"move": "1 - Re-time the revenue curve",
         "scores": {"revenue": 4, "esg": 1, "low_capex": 5, "speed": 5, "reversible": 5, "moat": 2}},
        {"move": "2 - Kill inefficient connections",
         "scores": {"revenue": 2, "esg": 5, "low_capex": 3, "speed": 3, "reversible": 3, "moat": 3}},
        {"move": "3 - Own the premium cabin",
         "scores": {"revenue": 5, "esg": 1, "low_capex": 1, "speed": 2, "reversible": 2, "moat": 5}},
    ]
    keys = [c["key"] for c in criteria]
    w = np.array([c["weight"] for c in criteria], dtype=float)
    M = np.array([[m["scores"][k] for k in keys] for m in moves], dtype=float)

    # ---- TOPSIS ----
    norm = M / np.sqrt((M ** 2).sum(axis=0))     # vector normalisation per criterion
    V = norm * w                                 # weighted normalised matrix
    ideal_best = V.max(axis=0)                   # all criteria are benefit-type
    ideal_worst = V.min(axis=0)
    d_best = np.sqrt(((V - ideal_best) ** 2).sum(axis=1))
    d_worst = np.sqrt(((V - ideal_worst) ** 2).sum(axis=1))
    closeness = d_worst / (d_best + d_worst)     # TOPSIS Ci in [0,1]

    # ---- weighted-sum cross-check (scores scaled to 0-1) ----
    wsum = (M / 5.0) @ w

    order = np.argsort(-closeness)
    ranking = []
    for rank, i in enumerate(order, start=1):
        ranking.append({
            "move": moves[i]["move"],
            "closeness": round(float(closeness[i]), 3),
            "weighted_sum": round(float(wsum[i]), 3),
            "rank": rank,
            "scores": moves[i]["scores"],
        })
    # agreement: does weighted-sum produce the same #1?
    wsum_winner = moves[int(np.argmax(wsum))]["move"]
    topsis_winner = moves[int(order[0])]["move"]

    # ---- weight-sensitivity: a ranking that flips on a small weight wiggle is
    # an opinion, not a finding. Perturb the weights with Gaussian noise (seeded,
    # reproducible), renormalise, re-run TOPSIS, and measure how often the #1 move
    # stays #1 and each move's mean rank. This is the MCDM analogue of the fuel
    # tornado — it reports robustness, not just a point ranking. ----
    rng = np.random.default_rng(7)
    N = 4000
    winner_i = int(order[0])
    stays_top = 0
    rank_sum = np.zeros(R_moves := len(moves))
    for _ in range(N):
        wp = np.clip(w + rng.normal(0.0, 0.05, size=len(w)), 0.01, None)
        wp = wp / wp.sum()
        Vp = norm * wp
        db = np.sqrt(((Vp - Vp.max(axis=0)) ** 2).sum(axis=1))
        dw = np.sqrt(((Vp - Vp.min(axis=0)) ** 2).sum(axis=1))
        cp = dw / (db + dw)
        op = np.argsort(-cp)
        if int(op[0]) == winner_i:
            stays_top += 1
        ranks = np.empty(R_moves, dtype=int)
        ranks[op] = np.arange(1, R_moves + 1)
        rank_sum += ranks
    weight_stability_pct = round(stays_top / N * 100, 1)
    mean_rank = {moves[i]["move"]: round(float(rank_sum[i] / N), 2) for i in range(R_moves)}

    return {
        "method": "TOPSIS (+ weighted-sum cross-check)",
        "criteria": criteria,
        "ranking": ranking,
        "winner": topsis_winner,
        "methods_agree": bool(wsum_winner == topsis_winner),
        "weight_stability_pct": weight_stability_pct,
        "mean_rank": mean_rank,
        "n_weight_draws": N,
        "note": ("Each criterion scored 1-5 (higher = better), calibrated to the "
                 "findings and the strategic-rationale chips. Weights are a labelled "
                 "judgement (sum = 1). TOPSIS ranks by closeness to the ideal "
                 "solution; the weighted-sum is a sanity check. Weight-stability = "
                 "share of 4,000 Gaussian-perturbed weightings (sigma 0.05) where the "
                 "#1 move stays #1 — robustness, not just a point ranking."),
    }


# ----------------------------------------------------------------------------
# 3. TAM / SAM / SOM — market sizing funnel
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def market_sizing():
    """
    Size the prize as a TAM / SAM / SOM funnel for the Indian domestic market.

    TAM  = all Indian domestic air travel (110M pax, DGCA 2022 — cited).
    SAM  = the six-metro trunk segment we actually compete on (a labelled share).
    SOM  = the Tata bloc's realistically-served share today (Air India + Vistara
           combined = 18.4%, DGCA — cited), which the three moves then grow.

    Revenue uses a labelled average-fare assumption; this is an order-of-magnitude
    sizing for context, NOT a bottom-up forecast — and it says so.
    """
    ctx = _context()
    f = analysis.build_findings()

    tam_pax_m = float(ctx["market_growth"]["domestic_pax_2022_million"])   # 110, cited
    tata_share = float(ctx["market_share_2022"]["tata_combined_pct"]) / 100.0  # 0.184, cited

    # labelled assumptions
    AVG_FARE_INR = 6000          # representative one-way domestic fare
    METRO_TRUNK_SHARE = 0.30     # six-metro O&D as a share of domestic pax

    def cr(pax_m, fare):
        return pax_m * 1e6 * fare / 1e7   # Rs cr

    tam_cr = cr(tam_pax_m, AVG_FARE_INR)
    sam_pax_m = tam_pax_m * METRO_TRUNK_SHARE
    sam_cr = cr(sam_pax_m, AVG_FARE_INR)
    som_pax_m = sam_pax_m * tata_share
    som_cr = cr(som_pax_m, AVG_FARE_INR)

    # the strategic-moves uplift on top of today's served share (annualised, live)
    pc = f["opportunity"]["panic_capture"]
    panic_uplift_cr = (float(pc["uplift_per_far_seat_inr"]) * float(pc["far_out_flights"])
                       * ANNUALISE / 1e7)

    levels = [
        {"key": "TAM", "label": "Total Addressable Market",
         "desc": "All Indian domestic air travel (DGCA 2022).",
         "pax_m": round(tam_pax_m, 1), "revenue_cr": round(tam_cr, 0)},
        {"key": "SAM", "label": "Serviceable Addressable Market",
         "desc": "The six-metro trunk segment we actually fly.",
         "pax_m": round(sam_pax_m, 1), "revenue_cr": round(sam_cr, 0)},
        {"key": "SOM", "label": "Serviceable Obtainable Market",
         "desc": "Tata bloc's served share today (AI + Vistara = 18.4%).",
         "pax_m": round(som_pax_m, 1), "revenue_cr": round(som_cr, 0)},
    ]

    return {
        "levels": levels,
        "tata_share_pct": round(tata_share * 100, 1),
        "metro_trunk_share_pct": round(METRO_TRUNK_SHARE * 100, 0),
        "avg_fare_inr": AVG_FARE_INR,
        "panic_uplift_cr": round(panic_uplift_cr, 0),
        "som_plus_uplift_cr": round(som_cr + panic_uplift_cr, 0),
        "cited": ["domestic_pax_2022_million (DGCA)", "tata_combined_pct (DGCA)"],
        "assumptions": {"avg_fare_inr": AVG_FARE_INR, "metro_trunk_share": METRO_TRUNK_SHARE,
                        "annualisation_factor": ANNUALISE},
        "note": ("Order-of-magnitude market sizing. Cited: 110M domestic pax and the "
                 "18.4% Tata combined share (DGCA 2022). Labelled assumptions: a Rs6,000 "
                 "average fare and a 30% six-metro trunk share. Not a bottom-up forecast."),
    }


if __name__ == "__main__":
    import time
    for name, fn in [("decision_tree", decision_tree), ("mcdm_moves", mcdm_moves),
                     ("market_sizing", market_sizing)]:
        t = time.time()
        out = fn()
        print(f"{name:14s} {time.time()-t:5.1f}s  keys={list(out.keys())}")
