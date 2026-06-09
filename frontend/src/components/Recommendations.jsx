import { fmtINR, fmtNum, fmtNum1 } from "../api.js";

export default function Recommendations({ f }) {
  const opp = f.opportunity;
  const pc = opp.panic_capture;
  const sf = opp.stops_fuel;

  return (
    <div className="grid recs">
      <div className="panel rec r1">
        <h3>1 · Re-time the revenue curve</h3>
        <p>
          {pc.far_out_flights.toLocaleString("en-US")} far-out economy bookings sit{" "}
          {fmtINR(pc.gap_per_seat_inr)} below the last-minute fare. Lift early fares modestly with
          dynamic pricing instead of giving the seat away.
        </p>
        <div className="impact">
          + {fmtINR(pc.uplift_per_far_seat_inr)} / seat at a conservative {pc.capture_rate_pct}%
          capture
        </div>
      </div>

      <div className="panel rec r2">
        <h3>2 · Kill the inefficient connections</h3>
        <p>
          2+ stop itineraries cost passengers more <b>and</b> burn{" "}
          {fmtNum1(sf.fuel_save_kg_per_seat)} kg more fuel per seat than a single connection.
          Re-route them onto nonstop and 1-stop metal.
        </p>
        <div className="impact">
          − {fmtNum1(sf.fuel_save_kg_per_seat)} kg fuel &amp; {fmtNum1(sf.co2_save_kg_per_seat)} kg
          CO₂ / seat
        </div>
      </div>

      <div className="panel rec r3">
        <h3>3 · Own the premium cabin</h3>
        <p>
          Air India + Vistara are the only two carriers selling business class, at an{" "}
          {f.business.premium_multiple}× premium. Protect and grow it as the merged group's profit
          engine before low-cost rivals copy it.
        </p>
        <div className="impact">
          {f.business.premium_multiple}× revenue per premium seat vs economy
        </div>
      </div>
    </div>
  );
}
