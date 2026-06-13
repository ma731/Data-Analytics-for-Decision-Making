"""
Air India War Room — analytical engine.

Loads the EaseMyTrip dataset, applies the engineered fuel model, and computes
every strategic finding used by the dashboard and the executive deck.

Run directly to export findings.json + a numbers summary:
    python analysis.py
"""

import json
import os
from functools import lru_cache

import pandas as pd

from fuel_model import (
    fuel_breakdown, estimate_fuel_kg, great_circle_km, fuel_cost_inr,
    CO2_PER_KG_FUEL, JET_A_DENSITY_KG_L, ATF_PRICE_INR_PER_L,
    SEATS_NARROWBODY, CITY_COORDS, ASSUMPTIONS,
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "Flight_price.csv")

# Carriers that are part of the Tata group story (Air India + Vistara merged 2024)
TATA_GROUP = ["Air_India", "Vistara"]


@lru_cache(maxsize=1)
def load() -> pd.DataFrame:
    """Load the dataset with the engineered fuel layer attached.

    The fuel model only depends on (source, destination, stops), and there are
    just ~90 such combinations in the data — so we evaluate the model once per
    combination and map the result onto all 300k rows, instead of calling it per
    row. ~100x faster than the naive loop, and the result is cached for the
    process lifetime (read-only; callers that mutate must .copy() first).
    """
    df = pd.read_csv(DATA_PATH, index_col=0)

    combos = df[["source_city", "destination_city", "stops"]].drop_duplicates()
    combos["fuel_kg"] = [
        estimate_fuel_kg(s, d, st)
        for s, d, st in zip(combos.source_city, combos.destination_city, combos.stops)
    ]
    combos["gc_km"] = [
        great_circle_km(s, d) for s, d in zip(combos.source_city, combos.destination_city)
    ]
    df = df.merge(combos, on=["source_city", "destination_city", "stops"], how="left")

    df["fuel_litres"] = df.fuel_kg / JET_A_DENSITY_KG_L
    df["fuel_cost_inr"] = fuel_cost_inr(df.fuel_kg)
    df["co2_kg"] = df.fuel_kg * CO2_PER_KG_FUEL
    df["fuel_kg_per_seat"] = df.fuel_kg / SEATS_NARROWBODY
    # contribution proxy: price minus fuel cost per seat (NOT full margin, but a
    # directional "what's left after fuel" lens for the frontier)
    df["price_minus_fuel"] = df.price - (df.fuel_cost_inr / SEATS_NARROWBODY)
    return df


def overview(df):
    return {
        "rows": int(len(df)),
        "airlines": int(df.airline.nunique()),
        "routes": int(df.groupby(["source_city", "destination_city"]).ngroups),
        "cities": sorted(df.source_city.unique().tolist()),
        "avg_price": round(float(df.price.mean()), 0),
        "median_price": round(float(df.price.median()), 0),
        "total_co2_tonnes": round(float(df.co2_kg.sum() / 1000), 0),
    }


def panic_tax(df):
    """The days-left price cliff — the revenue-management story."""
    eco = df[df["class"] == "Economy"]
    buckets = [(1, 2, "T-1 to T-2"), (3, 7, "T-3 to T-7"), (8, 14, "T-8 to T-14"),
               (15, 20, "T-15 to T-20"), (21, 49, "T-21+")]
    curve = []
    for lo, hi, label in buckets:
        sub = eco[(eco.days_left >= lo) & (eco.days_left <= hi)]
        curve.append({"label": label, "days": f"{lo}-{hi}",
                      "avg_price": round(float(sub.price.mean()), 0),
                      "share": round(float(len(sub) / len(eco) * 100), 1)})
    # daily curve for a smooth chart
    daily = (eco.groupby("days_left").price.mean().round(0)
             .reset_index().to_dict("records"))
    last_min = float(eco[eco.days_left <= 2].price.mean())
    far_out = float(eco[eco.days_left >= 21].price.mean())
    far_share = float(len(eco[eco.days_left >= 21]) / len(eco) * 100)
    return {
        "curve": curve,
        "daily": daily,
        "last_minute_avg": round(last_min, 0),
        "far_out_avg": round(far_out, 0),
        "multiplier": round(last_min / far_out, 1),
        "far_out_share": round(far_share, 1),
    }


def business_whitespace(df):
    """Business class is the profit engine — and a whitespace map."""
    sellers = df[df["class"] == "Business"].airline.unique().tolist()
    non_sellers = [a for a in df.airline.unique() if a not in sellers]
    by_class = df.groupby("class").price.mean().round(0).to_dict()
    # what business commands per route vs economy
    eco_p = float(df[df["class"] == "Economy"].price.mean())
    bus_p = float(df[df["class"] == "Business"].price.mean())
    # Air India business footprint vs Vistara
    ai_bus = df[(df.airline == "Air_India") & (df["class"] == "Business")]
    vis_bus = df[(df.airline == "Vistara") & (df["class"] == "Business")]
    return {
        "sellers": sellers,
        "non_sellers": non_sellers,
        "economy_avg": round(eco_p, 0),
        "business_avg": round(bus_p, 0),
        "premium_multiple": round(bus_p / eco_p, 1),
        "air_india_business_avg": round(float(ai_bus.price.mean()), 0),
        "vistara_business_avg": round(float(vis_bus.price.mean()), 0),
        "air_india_business_flights": int(len(ai_bus)),
        "vistara_business_flights": int(len(vis_bus)),
    }


def stops_economics(df):
    """The double-crime: 2+ stops cost passengers more AND burn more fuel."""
    eco = df[df["class"] == "Economy"]
    rows = []
    label = {"zero": "Nonstop", "one": "1 stop", "two_or_more": "2+ stops"}
    for stp in ["zero", "one", "two_or_more"]:
        sub = eco[eco.stops == stp]
        rows.append({
            "stops": label[stp],
            "avg_price": round(float(sub.price.mean()), 0),
            "avg_fuel_kg_per_seat": round(float(sub.fuel_kg_per_seat.mean()), 1),
            "avg_co2_kg_per_seat": round(float(sub.fuel_kg_per_seat.mean() * CO2_PER_KG_FUEL), 1),
            "share": round(float(len(sub) / len(eco) * 100), 1),
        })
    return rows


def airline_economics(df):
    eco = df[df["class"] == "Economy"]
    rows = []
    for a in df.airline.unique():
        sub = eco[eco.airline == a]
        rows.append({
            "airline": a.replace("_", " "),
            "avg_price": round(float(sub.price.mean()), 0),
            "flights": int(len(df[df.airline == a])),
            "fuel_kg_per_seat": round(float(sub.fuel_kg_per_seat.mean()), 1),
            "sells_business": a in df[df["class"] == "Business"].airline.unique(),
        })
    return sorted(rows, key=lambda r: r["avg_price"])


def efficiency_frontier(df):
    """
    THE hero chart. Every route plotted: fuel per seat (x) vs revenue per seat (y).
    Aggregated by route so it's readable. Bubble size = volume.
    """
    eco = df[df["class"] == "Economy"]
    g = eco.groupby(["source_city", "destination_city"]).agg(
        avg_price=("price", "mean"),
        fuel_kg_per_seat=("fuel_kg_per_seat", "mean"),
        co2_kg_per_seat=("co2_kg", lambda x: x.mean() / SEATS_NARROWBODY),
        gc_km=("gc_km", "mean"),
        volume=("price", "size"),
    ).reset_index()
    g["route"] = g.source_city + " -> " + g.destination_city
    # revenue efficiency = revenue per kg of fuel per seat (higher = better)
    g["rev_per_fuel_kg"] = g.avg_price / g.fuel_kg_per_seat
    out = g.round(1).sort_values("rev_per_fuel_kg", ascending=False)
    return out.to_dict("records")


def opportunity_sizing(df, pt, bw):
    """
    Quantified upside for the 'what if they act' slide.
    Two conservative, clearly-labelled scenarios.
    """
    eco = df[df["class"] == "Economy"]
    # Scenario A: capture 15% of the panic-tax gap on far-out bookings by smarter
    # dynamic pricing (nudging far-out fares up toward mid-curve without losing load)
    far = eco[eco.days_left >= 21]
    gap_per_seat = pt["last_minute_avg"] - pt["far_out_avg"]
    capture_rate = 0.15
    uplift_per_far_seat = gap_per_seat * capture_rate
    # Scenario B: shift 2+ stop economy pax to 1-stop/nonstop -> fuel saving
    multi = eco[eco.stops == "two_or_more"]
    one = eco[eco.stops == "one"]
    fuel_save_per_seat = float(multi.fuel_kg_per_seat.mean() - one.fuel_kg_per_seat.mean())
    return {
        "panic_capture": {
            "far_out_flights": int(len(far)),
            "gap_per_seat_inr": round(gap_per_seat, 0),
            "capture_rate_pct": int(capture_rate * 100),
            "uplift_per_far_seat_inr": round(uplift_per_far_seat, 0),
            "note": "Per economy seat on far-out (T-21+) bookings, the most under-priced segment.",
        },
        "stops_fuel": {
            "multi_stop_flights": int(len(multi)),
            "fuel_save_kg_per_seat": round(fuel_save_per_seat, 1),
            "co2_save_kg_per_seat": round(fuel_save_per_seat * CO2_PER_KG_FUEL, 1),
            "note": "Per economy seat re-routed from 2+ stops to a single connection.",
        },
    }


@lru_cache(maxsize=1)
def fuel_sensitivity(pct=0.20):
    """
    Stress-test the engineered fuel model against its own assumptions.

    Every conclusion rests on a handful of published constants (cruise burn, LTO
    cycle fuel, cruise speed, the routing detour penalty). The obvious attack is
    "you made those numbers up". This swings each constant +/-20% and re-derives
    the two findings that matter — the route Efficiency RANKING and the
    nonstop-vs-2-stop fuel gap — to show they barely move. Robust conclusions
    from transparent assumptions.
    """
    import numpy as np
    from scipy.stats import spearmanr
    from fuel_model import (
        CRUISE_BURN_KG_PER_HR, LTO_FUEL_PER_CYCLE_KG, CRUISE_SPEED_KMH,
        ROUTING_FACTOR, TAKEOFFS,
    )

    df = load()
    eco = df[df["class"] == "Economy"]
    gc = eco.gc_km.to_numpy()
    stops = eco.stops.to_numpy()
    price = eco.price.to_numpy()
    takeoffs = np.array([TAKEOFFS[s] for s in stops], dtype=float)
    is_zero = stops == "zero"
    is_two = stops == "two_or_more"
    routes = (eco.source_city + "→" + eco.destination_city).to_numpy()
    uniq = sorted(set(routes))
    ridx = {r: i for i, r in enumerate(uniq)}
    rid = np.array([ridx[r] for r in routes])

    def metrics(cruise_burn, lto, cruise_speed, routing):
        rf = np.array([routing[s] for s in stops], dtype=float)
        fuel_kg = lto * takeoffs + cruise_burn * (gc * rf) / cruise_speed
        fps = fuel_kg / SEATS_NARROWBODY
        # per-route revenue-per-fuel-kg (the frontier metric)
        rpf = np.array([price[rid == i].mean() / fps[rid == i].mean()
                        for i in range(len(uniq))])
        spread = float(rpf.max() / rpf.min())
        stops_gap = float(fps[is_two].mean() / fps[is_zero].mean())
        return spread, stops_gap, rpf

    base = dict(cruise_burn=CRUISE_BURN_KG_PER_HR, lto=LTO_FUEL_PER_CYCLE_KG,
                cruise_speed=CRUISE_SPEED_KMH, routing=dict(ROUTING_FACTOR))
    b_spread, b_gap, b_rpf = metrics(**base)

    params = [("Cruise burn (kg/hr)", "cruise_burn"),
              ("LTO cycle fuel (kg)", "lto"),
              ("Cruise speed (km/h)", "cruise_speed"),
              ("Routing detour penalty", "routing")]
    bars, spearmans, gaps = [], [], [b_gap]
    for label, key in params:
        vals = {}
        for sign, tag in [(-pct, "low"), (pct, "high")]:
            kw = dict(base)
            if key == "routing":
                kw["routing"] = {k: (1.0 if k == "zero" else v * (1 + sign))
                                 for k, v in ROUTING_FACTOR.items()}
            else:
                kw[key] = base[key] * (1 + sign)
            spread, gap, rpf = metrics(**kw)
            vals[tag] = spread
            spearmans.append(float(spearmanr(b_rpf, rpf).statistic))
            gaps.append(gap)
        bars.append({"param": f"{label} ±{int(pct*100)}%",
                     "low": round(vals["low"], 2), "high": round(vals["high"], 2)})
    bars.sort(key=lambda d: -abs(d["high"] - d["low"]))

    return {
        "metric_label": "Efficiency spread — best ÷ worst route (×)",
        "baseline_value": round(b_spread, 2),
        "bars": bars,
        "pct": int(pct * 100),
        "rank_stability": {"min_spearman": round(min(spearmans), 3),
                           "scenarios": len(spearmans)},
        "stops_gap": {"baseline": round(b_gap, 2),
                      "min": round(min(gaps), 2), "max": round(max(gaps), 2)},
        "note": ("Each constant swung ±20%; the frontier ranking (Spearman vs "
                 "baseline) and the 2-stop-vs-nonstop fuel gap are recomputed. "
                 "Near-1.0 correlation = the conclusions don't depend on the exact "
                 "constants."),
    }


def build_findings():
    df = load()
    pt = panic_tax(df)
    bw = business_whitespace(df)
    findings = {
        "overview": overview(df),
        "panic_tax": pt,
        "business": bw,
        "stops": stops_economics(df),
        "airlines": airline_economics(df),
        "frontier": efficiency_frontier(df),
        "opportunity": opportunity_sizing(df, pt, bw),
        # Pulled straight from the model's own constants — the panel can't drift.
        "assumptions": ASSUMPTIONS,
    }
    return findings


if __name__ == "__main__":
    f = build_findings()
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "findings.json")
    with open(out_path, "w") as fh:
        json.dump(f, fh, indent=2)
    print("Wrote", out_path)
    print("\n=== OVERVIEW ===")
    print(json.dumps(f["overview"], indent=2))
    print("\n=== PANIC TAX ===")
    print("Last-minute avg:", f["panic_tax"]["last_minute_avg"],
          "| Far-out avg:", f["panic_tax"]["far_out_avg"],
          "| x", f["panic_tax"]["multiplier"],
          "| Far-out share:", f["panic_tax"]["far_out_share"], "%")
    print("\n=== BUSINESS WHITESPACE ===")
    print(json.dumps(f["business"], indent=2))
    print("\n=== STOPS (double-crime) ===")
    print(json.dumps(f["stops"], indent=2))
    print("\n=== OPPORTUNITY ===")
    print(json.dumps(f["opportunity"], indent=2))
    print("\n=== FRONTIER (top 5 / bottom 5 by rev_per_fuel_kg) ===")
    fr = f["frontier"]
    for r in fr[:5] + fr[-5:]:
        print(f"  {r['route']:24s} price={r['avg_price']:>7.0f} "
              f"fuel/seat={r['fuel_kg_per_seat']:>5.1f}kg rev/fuel={r['rev_per_fuel_kg']:>5.1f} "
              f"vol={r['volume']}")
