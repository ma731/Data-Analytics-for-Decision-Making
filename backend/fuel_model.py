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

ROUTING_FACTOR = {"zero": 1.00, "one": 1.30, "two_or_more": 1.60}
TAKEOFFS = {"zero": 1, "one": 2, "two_or_more": 3}

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
        "fuel_cost_inr": round(fuel_litres * ATF_PRICE_INR_PER_L, 0),
        "co2_kg": round(fuel_kg * CO2_PER_KG_FUEL, 1),
        "fuel_kg_per_seat": round(fuel_kg / SEATS_NARROWBODY, 2),
        "co2_kg_per_seat": round(fuel_kg * CO2_PER_KG_FUEL / SEATS_NARROWBODY, 2),
    }
