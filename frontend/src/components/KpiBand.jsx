import { useCountUp } from "./ui.jsx";
import { fmtINR, fmtNum } from "../api.js";

function Kpi({ tone, label, target, format, note }) {
  const shown = useCountUp(target, { format });
  return (
    <div className={`panel kpi ${tone || ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value mono">{shown}</div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

export default function KpiBand({ f }) {
  const pt = f.panic_tax;
  const ov = f.overview;
  const bw = f.business;
  return (
    <div className="grid kpi-grid">
      <Kpi
        tone="alarm"
        label="Panic-tax multiple"
        target={pt.multiplier}
        format={(v) => `${v.toFixed(1)}×`}
        note={`${fmtINR(pt.last_minute_avg)} last-minute vs ${fmtINR(pt.far_out_avg)} far-out`}
      />
      <Kpi
        tone="brand"
        label="Business-class premium"
        target={bw.premium_multiple}
        format={(v) => `${v.toFixed(1)}×`}
        note={`Sold by only ${bw.sellers.length} of 6 carriers`}
      />
      <Kpi
        tone="good"
        label="Flights analysed"
        target={ov.rows}
        format={(v) => fmtNum(Math.round(v))}
        note={`${ov.routes} routes · ${ov.airlines} airlines · Feb–Mar 2022`}
      />
      <Kpi
        label="Under-priced backlog"
        target={pt.far_out_share}
        format={(v) => `${v.toFixed(0)}%`}
        note="of economy seats sit in the cheapest booking window"
      />
    </div>
  );
}
