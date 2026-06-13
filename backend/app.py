"""
Air India War Room — FastAPI backend.

Serves the engineered fuel model + strategic findings LIVE from the 300k-row
dataset. Nothing is pre-baked: /api/findings recomputes on demand, and
/api/route runs the fuel model on any route/config the board asks about during Q&A.
"""

from functools import lru_cache
import json
import os
import threading
import time
import urllib.request

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import analysis
import optimize
from fuel_model import fuel_breakdown, CITY_COORDS, ROUTING_FACTOR

app = FastAPI(title="Air India War Room API", version="1.0.0")

# Readiness flag: the heavy live computations (findings + the slow OR modules)
# are warmed in a background thread at startup so the FIRST demo click is instant
# instead of triggering a multi-second compute on stage. /api/health reports it.
_WARM = {"ready": False, "warming": [], "done": []}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


@lru_cache(maxsize=1)
def _findings():
    """Compute findings once and cache (recompute by restarting the server)."""
    return analysis.build_findings()


@lru_cache(maxsize=1)
def _context():
    with open(os.path.join(DATA_DIR, "market_context.json")) as fh:
        return json.load(fh)


def _warm_caches():
    """Precompute the expensive endpoints once at startup (background thread)."""
    jobs = [
        ("findings", _findings),
        ("pareto", _pareto),
        ("rl", _rl),
        ("demand", optimize.ml_demand),
        ("emsr", optimize.emsr_protection),
        ("shadow", optimize.fleet_shadow_prices),
        ("dea", optimize.dea_efficiency),
        ("sensitivity", analysis.fuel_sensitivity),
    ]
    for name, fn in jobs:
        _WARM["warming"].append(name)
        try:
            fn()
            _WARM["done"].append(name)
        except Exception as exc:  # never let a warm-up failure kill the server
            print(f"[warm] {name} failed: {exc}")
        finally:
            _WARM["warming"].remove(name)
    _WARM["ready"] = True
    print("[warm] all caches ready")


@app.on_event("startup")
def _on_startup():
    threading.Thread(target=_warm_caches, daemon=True).start()


@app.get("/api/health")
def health():
    """Liveness + warm-up readiness, so the launcher can wait for a hot server."""
    return {
        "status": "ok",
        "service": "air-india-war-room",
        "ready": _WARM["ready"],
        "warming": list(_WARM["warming"]),
        "done": list(_WARM["done"]),
    }


@app.get("/api/findings")
def findings():
    """All strategic findings computed live from the dataset."""
    return _findings()


@app.get("/api/context")
def context():
    """Verified external market context (cited)."""
    return _context()


@app.get("/api/cities")
def cities():
    return {"cities": sorted(CITY_COORDS.keys())}


@app.get("/api/route/{source}/{destination}/{stops}")
def route(source: str, destination: str, stops: str):
    """
    Live fuel-model calculator. Q&A weapon: 'what does Delhi->Chennai with one
    stop actually burn?' -> answered on the spot, from first principles.
    """
    source = source.title()
    destination = destination.title()
    if source not in CITY_COORDS or destination not in CITY_COORDS:
        raise HTTPException(404, f"Unknown city. Valid: {sorted(CITY_COORDS)}")
    if source == destination:
        raise HTTPException(400, "Source and destination must differ")
    if stops not in ROUTING_FACTOR:
        raise HTTPException(400, "stops must be one of: zero, one, two_or_more")
    return {
        "source": source,
        "destination": destination,
        "stops": stops,
        **fuel_breakdown(source, destination, stops),
    }


# ===================== OPERATIONS RESEARCH ENGINE =====================

@app.get("/api/sim/fuel")
def sim_fuel(volatility: float = 20.0):
    """Monte Carlo fuel-cost risk under ATF price volatility."""
    volatility = float(max(2.0, min(60.0, volatility)))
    return optimize.monte_carlo_fuel(volatility_pct=volatility)


@app.get("/api/optimize/pricing")
def opt_pricing(elasticity: float = 1.4):
    """Revenue-maximising fare curve from a constant-elasticity demand model."""
    elasticity = float(max(1.05, min(3.0, elasticity)))
    return optimize.optimize_pricing(elasticity=elasticity)


@lru_cache(maxsize=1)
def _pareto():
    return optimize.nsga2_pareto()


@app.get("/api/pareto")
def pareto():
    """NSGA-II fuel-vs-revenue Pareto front, with per-generation snapshots."""
    return _pareto()


@app.get("/api/fleet")
def fleet(hours: int = 4000):
    """Integer-program fleet frequency allocation across the network."""
    hours = int(max(800, min(12000, hours)))
    return optimize.fleet_milp(fleet_block_hours=hours)


@lru_cache(maxsize=1)
def _rl():
    return optimize.rl_pricing()


@app.get("/api/rl")
def rl():
    """Q-learning pricing agent: training history + learned policy."""
    return _rl()


@app.get("/api/demand")
def demand():
    """Gradient-boosted fare drivers + econometric price elasticity."""
    return optimize.ml_demand()


@app.get("/api/emsr")
def emsr():
    """Littlewood/EMSR exact fare-class seat-protection optimum."""
    return optimize.emsr_protection()


@app.get("/api/shadow")
def shadow():
    """LP shadow prices: marginal value of a block-hour / one more aircraft."""
    return optimize.fleet_shadow_prices()


@app.get("/api/dea")
def dea():
    """DEA route-efficiency scores (one LP per route) with peers + fuel targets."""
    return optimize.dea_efficiency()


@app.get("/api/sensitivity")
def sensitivity():
    """Fuel-model stress test: swing each constant ±20%, show findings hold."""
    return analysis.fuel_sensitivity()


# ---- real live air traffic over India (OpenSky Network, free, no key) ----
_osky = {"t": 0.0, "data": None}


@app.get("/api/live")
def live():
    """
    Live count of aircraft currently over India from the OpenSky Network.
    Cached ~45s; fails gracefully (live=false) so the UI never breaks on stage.
    """
    now = time.time()
    if _osky["data"] and now - _osky["t"] < 45:
        return _osky["data"]
    try:
        u = "https://opensky-network.org/api/states/all?lamin=6&lomin=68&lamax=37&lomax=98"
        req = urllib.request.Request(u, headers={"User-Agent": "AirIndiaWarRoom/1.0"})
        with urllib.request.urlopen(req, timeout=6) as r:
            j = json.load(r)
        states = j.get("states") or []
        sample = []
        for s in states[:80]:
            lon, lat, head = s[5], s[6], s[10]
            if lon is not None and lat is not None:
                sample.append({"cs": (s[1] or "").strip(), "lat": lat, "lon": lon, "head": head})
        data = {"live": True, "count": len(states), "sample": sample, "ts": int(now)}
    except Exception as e:  # network down / rate-limited -> graceful fallback
        data = {"live": False, "count": None, "sample": [], "error": str(e)[:90]}
    _osky.update(t=now, data=data)
    return data


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
