"""
Air India War Room — FastAPI backend.

Serves the engineered fuel model + strategic findings LIVE from the 300k-row
dataset. Nothing is pre-baked: /api/findings recomputes on demand, and
/api/route runs the fuel model on any route/config the board asks about during Q&A.
"""

from functools import lru_cache
import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import analysis
import optimize
from fuel_model import fuel_breakdown, CITY_COORDS, ROUTING_FACTOR

app = FastAPI(title="Air India War Room API", version="1.0.0")

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


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "air-india-war-room"}


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
