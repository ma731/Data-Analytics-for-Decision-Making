"""
Engineered fuel-burn model for the Air India War Room.

WHY THIS EXISTS
---------------
The brief asks us to "optimize fuel consumption AND flight price", but the raw
EaseMyTrip dataset contains NO fuel data (no burn, no aircraft type, no weight,
no distance in km). The only physical proxies are `duration` and `stops`.

`duration` is a TRAP: a 1-stop flight's gate-to-gate time is dominated by
ground/layover time, not flight time. Using duration would massively overstate
fuel for connecting flights.

So we derive fuel from first principles instead:

    total_fuel_kg = LTO_FUEL_PER_CYCLE * n_takeoffs
                  + CRUISE_BURN_KG_PER_HR * airborne_hours

  where:
    n_takeoffs      = stops + 1                       (each leg = 1 takeoff/landing)
    airborne_hours  = flown_distance_km / CRUISE_SPEED_KMH
    flown_distance  = great_circle_km * routing_factor(stops)

The two real drivers of jet fuel burn are (1) DISTANCE flown and (2) NUMBER OF
TAKEOFFS — takeoff/climb is the most fuel-intensive phase of flight. Both are
derivable from the data (city pair -> great-circle distance; stops -> cycles).

Every constant below is a published, citable aviation benchmark. The model is
deliberately transparent and conservative so it survives Q&A.

SOURCES / ASSUMPTIONS (all defensible, all labelled as estimates)
  - Fleet: A320-family narrowbody (dominant on Indian domestic metro routes 2022)
  - CRUISE_BURN_KG_PER_HR = 2400   (A320neo ~2300 kg/hr; A320ceo higher -> AI/Vistara
                                    fleet-mix midpoint. Source: aircraft-commerce, flightglobal)
  - LTO_FUEL_PER_CYCLE_KG = 825    (ICAO LTO cycle, taxi+takeoff+climb+approach+land)
  - CRUISE_SPEED_KMH      = 800    (typical avg incl. climb/descent)
  - ROUTING_FACTOR        = 1.00 / 1.30 / 1.60 for 0 / 1 / 2+ stops (detour penalty)
  - CO2_PER_KG_FUEL       = 3.16   (ICAO standard combustion factor)
  - JET_A_DENSITY_KG_L    = 0.80
  - ATF_PRICE_INR_PER_L   = 100    (Delhi ATF, Feb-Mar 2022 period avg = ~Rs 1,00,000/kL;
                                    ran 90,500 -> 1,10,666/kL over the scrape window, IOCL)
  - SEATS_NARROWBODY      = 180    (A320 single-class equivalent, for per-seat)
"""

from math import radians, sin, cos, asin, sqrt

# ---- engineering constants (published benchmarks) ----
CRUISE_BURN_KG_PER_HR = 2400.0
LTO_FUEL_PER_CYCLE_KG = 825.0
CRUISE_SPEED_KMH = 800.0
CO2_PER_KG_FUEL = 3.16
JET_A_DENSITY_KG_L = 0.80
ATF_PRICE_INR_PER_L = 100.0
SEATS_NARROWBODY = 180
# Average domestic seat occupancy (labelled assumption). DGCA 2022 domestic load
# factors ran ~80-87%; 0.80 is the conservative end. Lets us report fuel per
# PASSENGER (not just per available seat) without pretending we have load data.
LOAD_FACTOR = 0.80

ROUTING_FACTOR = {"zero": 1.00, "one": 1.30, "two_or_more": 1.60}
TAKEOFFS = {"zero": 1, "one": 2, "two_or_more": 3}

# Single source of truth for the dashboard/deck "assumptions" panel. Built from
# the constants above so the panel can NEVER drift from the model that runs.
ASSUMPTIONS = {
    "cruise_burn_kg_per_hr": CRUISE_BURN_KG_PER_HR,
    "lto_fuel_per_cycle_kg": LTO_FUEL_PER_CYCLE_KG,
    "cruise_speed_kmh": CRUISE_SPEED_KMH,
    "co2_per_kg_fuel": CO2_PER_KG_FUEL,
    "atf_price_inr_per_l": ATF_PRICE_INR_PER_L,
    "seats_narrowbody": SEATS_NARROWBODY,
    "load_factor": LOAD_FACTOR,
    "routing_factor": ROUTING_FACTOR,
}

# Airport coordinates for the six metros in the dataset (lat, lon)
CITY_COORDS = {
    "Delhi":     (28.5562, 77.1000),
    "Mumbai":    (19.0896, 72.8656),
    "Bangalore": (13.1986, 77.7066),
    "Kolkata":   (22.6547, 88.4467),
    "Hyderabad": (17.2403, 78.4294),
    "Chennai":   (12.9941, 80.1709),
}


def great_circle_km(city_a: str, city_b: str) -> float:
    """Haversine distance between two cities in km."""
    lat1, lon1 = CITY_COORDS[city_a]
    lat2, lon2 = CITY_COORDS[city_b]
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(h))


def estimate_fuel_kg(source_city: str, destination_city: str, stops: str) -> float:
    """Estimated total trip fuel burn (kg) for one flight."""
    gc = great_circle_km(source_city, destination_city)
    flown_km = gc * ROUTING_FACTOR[stops]
    airborne_hours = flown_km / CRUISE_SPEED_KMH
    return LTO_FUEL_PER_CYCLE_KG * TAKEOFFS[stops] + CRUISE_BURN_KG_PER_HR * airborne_hours


def fuel_cost_inr(fuel_kg):
    """Convert fuel mass (kg) to INR at the model's density + ATF price.

    Accepts a scalar or a numpy/pandas vector — the single canonical place this
    conversion happens, so every optimiser and finding stays consistent.
    """
    return fuel_kg / JET_A_DENSITY_KG_L * ATF_PRICE_INR_PER_L


def fuel_breakdown(source_city: str, destination_city: str, stops: str) -> dict:
    """Full per-flight fuel economics for one route/config."""
    gc = great_circle_km(source_city, destination_city)
    flown_km = gc * ROUTING_FACTOR[stops]
    fuel_kg = estimate_fuel_kg(source_city, destination_city, stops)
    fuel_litres = fuel_kg / JET_A_DENSITY_KG_L
    return {
        "great_circle_km": round(gc, 1),
        "flown_km": round(flown_km, 1),
        "takeoffs": TAKEOFFS[stops],
        "fuel_kg": round(fuel_kg, 1),
        "fuel_litres": round(fuel_litres, 1),
        "fuel_cost_inr": round(fuel_cost_inr(fuel_kg), 0),
        "co2_kg": round(fuel_kg * CO2_PER_KG_FUEL, 1),
        "fuel_kg_per_seat": round(fuel_kg / SEATS_NARROWBODY, 2),
        "co2_kg_per_seat": round(fuel_kg * CO2_PER_KG_FUEL / SEATS_NARROWBODY, 2),
        # per PASSENGER (per available seat ÷ load factor) — the figure a revenue
        # team actually thinks in. Labelled because load factor is an assumption.
        "fuel_kg_per_pax": round(fuel_kg / (SEATS_NARROWBODY * LOAD_FACTOR), 2),
        "co2_kg_per_pax": round(fuel_kg * CO2_PER_KG_FUEL / (SEATS_NARROWBODY * LOAD_FACTOR), 2),
    }


# ---------------------------------------------------------------------------
# External validation: a multi-anchor envelope check of the engineered model.
# ---------------------------------------------------------------------------
# There is no per-flight fuel ground truth in the dataset, so we cannot CALIBRATE.
# Instead we check the model against published A320-family trip-fuel ENVELOPES at
# several stage lengths (short hop -> long domestic trunk). The bands are
# consistent with published Airbus performance and the ICAO/EEA fuel-vs-distance
# relationship; short sectors carry wider bands because the LTO cycle dominates
# and reserve/contingency fuel is a larger share. This upgrades the old single
# Delhi-Mumbai anchor into a 4-sector envelope check that reports per-route error.
FUEL_VALIDATION_ANCHORS = [
    {"src": "Bangalore", "dst": "Chennai",   "band_t": (1.40, 2.20), "note": "short hop, LTO-dominated"},
    {"src": "Hyderabad", "dst": "Mumbai",    "band_t": (2.20, 3.20), "note": "sub-hour sector"},
    {"src": "Delhi",     "dst": "Mumbai",    "band_t": (3.50, 4.50), "note": "canonical ~1.4 h anchor"},
    {"src": "Delhi",     "dst": "Bangalore", "band_t": (5.00, 6.50), "note": "long domestic trunk"},
]


def validate_fuel_model():
    """Compare the engineered nonstop estimate against published trip-fuel bands."""
    anchors, devs, all_inside = [], [], True
    for a in FUEL_VALIDATION_ANCHORS:
        kg = estimate_fuel_kg(a["src"], a["dst"], "zero")
        t = kg / 1000.0
        lo, hi = a["band_t"]
        mid = (lo + hi) / 2.0
        inside = lo <= t <= hi
        dev = (t - mid) / mid * 100.0
        all_inside = all_inside and inside
        devs.append(abs(dev))
        anchors.append({
            "route": f"{a['src']} → {a['dst']}",
            "gc_km": round(great_circle_km(a["src"], a["dst"]), 0),
            "model_t": round(t, 2),
            "published_band_t": [lo, hi],
            "inside_band": bool(inside),
            "deviation_from_mid_pct": round(dev, 1),
            "note": a["note"],
        })
    return {
        "anchors": anchors,
        "n_anchors": len(anchors),
        "all_inside_band": bool(all_inside),
        "mean_abs_deviation_pct": round(sum(devs) / len(devs), 1),
        "max_abs_deviation_pct": round(max(devs), 1),
        "note": ("Multi-anchor envelope check across four stage lengths (270-1709 km). "
                 "Bands are published-consistent A320-family trip-fuel envelopes "
                 "(Airbus / ICAO-EEA fuel-vs-distance); short sectors get wider bands "
                 "because the LTO cycle dominates. No per-flight ground truth exists in "
                 "this dataset, so this validates the model's level across stage lengths, "
                 "it is not a calibration."),
    }
