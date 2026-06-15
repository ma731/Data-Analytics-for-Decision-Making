"""
Sanity tests for the Air India War Room model layer.

Deliberately dependency-free: run it straight, no pytest needed —

    cd backend
    python tests/test_model.py

These exist mostly for DEFENSIBILITY: the assumptions-vs-constants test would
have caught the 2400-vs-2500 drift that once shipped to the deck. Run it before
any demo so a stale number can never embarrass you on stage.
"""

import os
import sys

# make the backend package importable when run as a plain script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import fuel_model as fm


PASS, FAIL = 0, 0


def check(name, cond, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  [ok]   {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}  {detail}")


def test_assumptions_match_constants():
    """The shipped assumptions panel must equal the constants the model runs on."""
    a = fm.ASSUMPTIONS
    check("assumptions.cruise_burn == constant",
          a["cruise_burn_kg_per_hr"] == fm.CRUISE_BURN_KG_PER_HR,
          f'{a["cruise_burn_kg_per_hr"]} vs {fm.CRUISE_BURN_KG_PER_HR}')
    check("assumptions.lto == constant",
          a["lto_fuel_per_cycle_kg"] == fm.LTO_FUEL_PER_CYCLE_KG)
    check("assumptions.cruise_speed == constant",
          a["cruise_speed_kmh"] == fm.CRUISE_SPEED_KMH)
    check("assumptions.atf == constant",
          a["atf_price_inr_per_l"] == fm.ATF_PRICE_INR_PER_L)


def test_great_circle():
    d_dm = fm.great_circle_km("Delhi", "Mumbai")
    check("Delhi-Mumbai great-circle ~1150km", 1100 < d_dm < 1200, f"{d_dm:.0f}km")
    check("great-circle is symmetric",
          abs(fm.great_circle_km("Delhi", "Chennai") - fm.great_circle_km("Chennai", "Delhi")) < 1e-6)
    check("same city == 0km", fm.great_circle_km("Delhi", "Delhi") < 1e-6)


def test_fuel_monotonic_in_stops():
    """More stops = more takeoffs + detour = strictly more fuel, same city pair."""
    z = fm.estimate_fuel_kg("Delhi", "Chennai", "zero")
    o = fm.estimate_fuel_kg("Delhi", "Chennai", "one")
    t = fm.estimate_fuel_kg("Delhi", "Chennai", "two_or_more")
    check("fuel(zero) < fuel(one) < fuel(2+)", z < o < t, f"{z:.0f} {o:.0f} {t:.0f}")


def test_fuel_breakdown_sane():
    b = fm.fuel_breakdown("Delhi", "Mumbai", "zero")
    check("DEL-BOM nonstop fuel in 4-7t band", 4000 < b["fuel_kg"] < 7000, f'{b["fuel_kg"]}kg')
    check("takeoffs(zero) == 1", b["takeoffs"] == 1)
    check("co2 == fuel * 3.16", abs(b["co2_kg"] - b["fuel_kg"] * fm.CO2_PER_KG_FUEL) < 1.0)
    # cost is derived from full-precision fuel_kg inside the breakdown, so allow a
    # few INR of slack vs recomputing from the 1-decimal rounded fuel_kg here.
    check("fuel_cost matches helper",
          abs(b["fuel_cost_inr"] - fm.fuel_cost_inr(b["fuel_kg"])) < 50.0)


def test_findings_frontier_sorted():
    """Optional: needs the CSV. Frontier must be sorted desc by rev/fuel-kg."""
    try:
        import analysis
    except Exception as exc:  # pragma: no cover
        print(f"  [skip] findings test (import failed: {exc})")
        return
    if not os.path.exists(analysis.DATA_PATH):
        print("  [skip] findings test (Flight_price.csv not present)")
        return
    f = analysis.build_findings()
    fr = f["frontier"]
    revs = [r["rev_per_fuel_kg"] for r in fr]
    check("frontier sorted desc by rev_per_fuel_kg", revs == sorted(revs, reverse=True))
    check("findings.assumptions == model ASSUMPTIONS", f["assumptions"] == fm.ASSUMPTIONS)


def test_business_modules():
    """Decision-analysis layer invariants: EMV/EVPI, TOPSIS, and the TAM/SAM/SOM funnel."""
    try:
        import business
        import analysis
    except Exception as exc:  # pragma: no cover
        print(f"  [skip] business tests (import failed: {exc})")
        return

    # MCDM is pure (no CSV needed) — always runs
    mc = business.mcdm_moves()
    cis = [r["closeness"] for r in mc["ranking"]]
    check("TOPSIS closeness in [0,1]", all(0.0 <= c <= 1.0 for c in cis), str(cis))
    check("MCDM ranks exactly 3 moves", len(mc["ranking"]) == 3)
    check("TOPSIS & weighted-sum agree on #1", mc["methods_agree"] is True)
    check("weight-stability in [0,100]", 0.0 <= mc["weight_stability_pct"] <= 100.0)

    # decision tree + market sizing need the CSV (build_findings)
    if not os.path.exists(analysis.DATA_PATH):
        print("  [skip] decision/market tests (Flight_price.csv not present)")
        return

    d = business.decision_tree()
    check("EVPI >= 0", d["evpi_cr"] >= 0, f'{d["evpi_cr"]}')
    check("aggressive hold-payoff > conservative", d["acts"][0]["payoff_hold_cr"] > d["acts"][1]["payoff_hold_cr"])
    check("exactly one recommended act", sum(1 for a in d["acts"] if a["recommended"]) == 1)
    check("flip-probability in [0,1]",
          d["flip_probability"] is None or 0.0 <= d["flip_probability"] <= 1.0)
    check("far-out base is passengers, not rows (0<x<50M)", 0 < d["far_out_eco_pax_m"] < 50)

    m = business.market_sizing()
    rev = [L["revenue_cr"] for L in m["levels"]]   # TAM, SAM, SOM
    pax = [L["pax_m"] for L in m["levels"]]
    check("TAM >= SAM >= SOM (revenue)", rev[0] >= rev[1] >= rev[2], str(rev))
    check("TAM >= SAM >= SOM (pax)", pax[0] >= pax[1] >= pax[2], str(pax))
    check("pricing uplift > 0", m["panic_uplift_cr"] > 0)
    lo, hi = m["som_range_cr"]
    check("SOM sits inside its sensitivity band", lo <= rev[2] <= hi, f"{lo} <= {rev[2]} <= {hi}")


if __name__ == "__main__":
    print("Air India War Room — model sanity tests\n")
    test_assumptions_match_constants()
    test_great_circle()
    test_fuel_monotonic_in_stops()
    test_fuel_breakdown_sane()
    test_findings_frontier_sorted()
    test_business_modules()
    print(f"\n{PASS} passed, {FAIL} failed")
    sys.exit(1 if FAIL else 0)
