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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
