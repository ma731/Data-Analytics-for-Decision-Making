import { useEffect, useState } from "react";
import { getRoute, fmtINR, fmtNum, fmtNum1 } from "../api.js";

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Kolkata", "Hyderabad", "Chennai"];
const STOPS = [
  { v: "zero", label: "Nonstop" },
  { v: "one", label: "1 stop" },
  { v: "two_or_more", label: "2+ stops" },
];

export default function RouteExplorer() {
  const [source, setSource] = useState("Delhi");
  const [destination, setDestination] = useState("Chennai");
  const [stops, setStops] = useState("zero");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | error

  useEffect(() => {
    if (source === destination) {
      setData(null);
      setStatus("idle");
      return;
    }
    let alive = true;
    setStatus("loading");
    getRoute(source, destination, stops)
      .then((d) => {
        if (alive) {
          setData(d);
          setStatus("ready");
        }
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [source, destination, stops]);

  return (
    <div className="panel">
      <h3 className="panel-h">Live Fuel Calculator</h3>
      <p className="panel-sub">
        Ask any route, any routing. The engineered fuel model runs live on the server — great-circle
        distance plus a takeoff-cycle penalty per stop. This is the number behind every chart above.
      </p>

      <div className="calc-controls">
        <label>
          From
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source city">
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            aria-label="Destination city"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Routing
          <select value={stops} onChange={(e) => setStops(e.target.value)} aria-label="Number of stops">
            {STOPS.map((s) => (
              <option key={s.v} value={s.v}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {source === destination && (
        <p className="muted" aria-live="polite">
          Pick two different cities to run the model.
        </p>
      )}
      {status === "error" && (
        <p style={{ color: "var(--negative)" }} aria-live="polite">
          Model unreachable — is the backend running on :8000?
        </p>
      )}

      {data && status !== "error" && (
        <div className="grid calc-out" aria-live="polite">
          <div className="calc-cell">
            <div className="l">Distance flown</div>
            <div className="v">{fmtNum(data.flown_km)} km</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtNum(data.great_circle_km)} km direct · {data.takeoffs} takeoff
              {data.takeoffs > 1 ? "s" : ""}
            </div>
          </div>
          <div className="calc-cell">
            <div className="l">Trip fuel burn</div>
            <div className="v" style={{ color: "var(--accent)" }}>
              {fmtNum(data.fuel_kg)} kg
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtNum(data.fuel_litres)} L · {fmtINR(data.fuel_cost_inr)}
            </div>
          </div>
          <div className="calc-cell">
            <div className="l">Fuel per seat</div>
            <div className="v">{fmtNum1(data.fuel_kg_per_seat)} kg</div>
            <div className="muted" style={{ fontSize: 12 }}>180-seat narrowbody</div>
          </div>
          <div className="calc-cell">
            <div className="l">CO₂ per seat</div>
            <div className="v" style={{ color: "var(--negative)" }}>
              {fmtNum1(data.co2_kg_per_seat)} kg
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtNum(data.co2_kg)} kg total
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
