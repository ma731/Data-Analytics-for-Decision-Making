import { useState } from "react";
import { useCountUp } from "./ui.jsx";

const AI_REVENUE_CR = 38812; // Air India standalone FY24 revenue (Tata, +23% YoY)
const AI_LOSS_CR = 4444; // Air India standalone FY24 loss

export default function Finale() {
  const [uplift, setUplift] = useState(3.0); // revenue-management uplift %
  const gain = (AI_REVENUE_CR * uplift) / 100;
  const lossErased = Math.min(100, (gain / AI_LOSS_CR) * 100);
  const gainShown = useCountUp(gain, { duration: 500, format: (v) => Math.round(v).toLocaleString("en-IN") });
  const erasedShown = useCountUp(lossErased, { duration: 500, format: (v) => Math.round(v) });

  return (
    <div className="finale" id="finale">
      <div className="finale-inner">
        <div className="finale-kicker">What this is worth · drag to model execution</div>
        <h2 className="finale-num">₹{gainShown}<span>cr / year</span></h2>
        <p className="finale-sub">
          At a <b>{uplift.toFixed(1)}% revenue-management uplift</b> on Air India&rsquo;s ₹38,812&nbsp;cr FY24 revenue,
          that&rsquo;s <b>{erasedShown}% of the airline&rsquo;s ₹4,444&nbsp;cr loss erased in a single year</b> &mdash; from
          pricing discipline alone. Re-routing inefficient connections then cuts fuel and CO₂ on top.
        </p>

        <div className="finale-slider">
          <div className="finale-slider-lab">
            <span>Revenue-management uplift</span>
            <b>{uplift.toFixed(1)}%</b>
          </div>
          <input
            type="range" min="1" max="5" step="0.1" value={uplift}
            onChange={(e) => setUplift(+e.target.value)}
            aria-label="Revenue-management uplift percentage"
          />
          <div className="finale-loss-bar" aria-hidden="true">
            <div className="finale-loss-fill" style={{ width: `${lossErased}%` }} />
            <span className="finale-loss-label">FY24 loss erased: {Math.round(lossErased)}%</span>
          </div>
        </div>

        <div className="finale-moves">
          <div>① Re-time the revenue curve</div>
          <div>② Kill inefficient connections</div>
          <div>③ Own the premium cabin</div>
        </div>
        <div className="finale-src">
          Uplift modelled in this analysis · revenue &amp; loss from Air India FY24 audited results (Tata Group)
        </div>
      </div>
    </div>
  );
}
