import { fmtINR, fmtNum, fmtNum1, inrToEUR } from "../api.js";

export default function Recommendations({ f }) {
  const opp = f.opportunity;
  const pc = opp.panic_capture;
  const sf = opp.stops_fuel;
  // fuel saving expressed in money (model constants: 0.8 kg/L, ₹100/L ATF)
  const fuelSaveInr = Math.round((sf.fuel_save_kg_per_seat / 0.8) * 100);

  return (
    <div className="grid recs">
      <div className="panel rec r1">
        <h3>1 · Re-time the revenue curve</h3>
        <p>
          {pc.far_out_flights.toLocaleString("en-US")} far-out economy fares sit{" "}
          {fmtINR(pc.gap_per_seat_inr)} ({inrToEUR(pc.gap_per_seat_inr)}) below the last-minute
          fare. Lift early fares modestly with dynamic pricing instead of giving the seat away.
        </p>
        <div className="impact">
          + {fmtINR(pc.uplift_per_far_seat_inr)} ({inrToEUR(pc.uplift_per_far_seat_inr)}) / seat at a
          conservative {pc.capture_rate_pct}% capture
        </div>
        <div className="rec-invest">
          <b>Invest:</b> RM / dynamic-pricing tooling, software-only · payback in weeks
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
          CO₂ / seat &nbsp;·&nbsp; ≈ {fmtINR(fuelSaveInr)} ({inrToEUR(fuelSaveInr)}) saved
        </div>
        <div className="rec-invest">
          <b>Invest:</b> schedule &amp; network re-banking, no fleet capex · payback 1–2 seasons
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
          {f.business.premium_multiple}× revenue per premium seat —{" "}
          {inrToEUR(f.business.business_avg)} vs {inrToEUR(f.business.economy_avg)}
        </div>
        <div className="rec-invest">
          <b>Invest:</b> protect first (zero capex via EMSR), then cabins &amp; lounges · payback in years
        </div>
      </div>
    </div>
  );
}
