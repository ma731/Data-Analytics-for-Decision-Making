import { useEffect, useState } from "react";
import { getMarket, crToEUR } from "../api.js";

const LEVEL_COLOR = {
  TAM: "var(--data-blue)",
  SAM: "var(--accent)",
  SOM: "var(--brand-gold)",
};

export default function MarketSizing() {
  const [d, setD] = useState(null);
  useEffect(() => { getMarket().then(setD).catch(() => {}); }, []);

  const levels = d?.levels || [];
  const top = levels[0]?.revenue_cr || 1;

  return (
    <div className="panel">
      <h3 className="panel-h">Sizing the prize — TAM / SAM / SOM</h3>
      <p className="panel-sub">
        How big is the opportunity, really? We scope it top-down: the whole Indian domestic market, the slice we
        actually fly, and the share the Tata bloc serves today — the base the three moves grow.
      </p>

      <div className="funnel">
        {levels.map((L) => {
          const w = Math.max(22, (L.revenue_cr / top) * 100);
          return (
            <div key={L.key} className="funnel-row">
              <div className="funnel-track">
                <div className="funnel-bar" style={{ width: `${w}%`, background: LEVEL_COLOR[L.key] }}>
                  <span className="funnel-key">{L.key}</span>
                </div>
              </div>
              <div className="funnel-meta">
                <div className="funnel-head">
                  <b>{L.label}</b>
                  <span className="funnel-eur">≈ {crToEUR(L.revenue_cr)}</span>
                </div>
                <div className="funnel-sub">
                  {L.pax_m}M pax · ₹{Number(L.revenue_cr).toLocaleString("en-US")} cr — {L.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {d && (
        <div className="callout" style={{ marginTop: 18 }}>
          <span className="dot" aria-hidden="true" />
          <div>
            <b>The moves grow the obtainable market.</b> The dynamic-pricing capture alone adds ≈ ₹{Number(d.panic_uplift_cr).toLocaleString("en-US")} cr
            ({crToEUR(d.panic_uplift_cr)}) a year on top of today&rsquo;s ₹{Number(levels[2]?.revenue_cr).toLocaleString("en-US")} cr
            ({crToEUR(levels[2]?.revenue_cr || 0)}) served base — before the premium and fuel moves compound on it.
          </div>
        </div>
      )}

      <p className="chart-caption">
        The funnel reframes the whole project: we&rsquo;re not chasing the full ₹{Number(top).toLocaleString("en-US")} cr
        market — we&rsquo;re defending and growing a focused, winnable {d ? `${d.tata_share_pct}%` : ""} served share on
        the routes where Tata already has the metal and the only two business cabins.
      </p>
      <div className="assume">
        Cited: 110M pax, 18.4% Tata share (DGCA 2022). Assumed: ₹{d?.avg_fare_inr ?? 6000} fare,{" "}
        {d?.metro_trunk_share_pct ?? 30}% trunk share. Order-of-magnitude, not a forecast.
      </div>
    </div>
  );
}
