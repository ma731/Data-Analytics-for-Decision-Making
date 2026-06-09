import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getSimFuel } from "../api.js";
import { ChartTip } from "./ui.jsx";

export default function MonteCarlo() {
  const [vol, setVol] = useState(25);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(0);

  function run(v) {
    setBusy(true);
    getSimFuel(v).then((d) => { setData(d); setBusy(false); }).catch(() => setBusy(false));
  }
  useEffect(() => { run(25); }, []);
  function onSlide(v) {
    setVol(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(v), 180);
  }

  const cr = (n) => `₹${n.toLocaleString("en-IN")} cr`;

  return (
    <div className="panel">
      <h3 className="panel-h">Monte Carlo — fuel-bill risk under price shocks</h3>
      <p className="panel-sub">
        Jet fuel is ~40% of cost and swung 20–40% in 2022. We simulate {data ? data.n.toLocaleString("en-IN") : "thousands of"} scenarios
        of the annual fuel bill. Drag the volatility — the whole risk distribution recomputes live on the server.
      </p>

      <div className="controls-row">
        <div className="slider">
          <div className="lab"><span>ATF price volatility</span><b>±{vol}%</b></div>
          <input type="range" min="5" max="50" value={vol} aria-label="ATF price volatility"
            onChange={(e) => onSlide(+e.target.value)} />
        </div>
        {busy && <span className="muted mono" style={{ fontSize: 13 }}>simulating…</span>}
      </div>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={data?.hist || []} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <defs>
              <linearGradient id="mcFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--data-blue-bright)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--data-blue)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{ value: "Annual fuel bill (₹ crore)", position: "bottom", offset: 10, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
            {data && <ReferenceLine x={data.p50_cr} stroke="var(--text-muted)" strokeDasharray="4 4" />}
            {data && <ReferenceLine x={data.var95_cr} stroke="var(--negative)" strokeDasharray="4 4"
              label={{ value: "VaR 95%", fill: "var(--negative)", fontSize: 11, position: "top" }} />}
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">≈ ₹{(p[0].payload.x).toLocaleString("en-IN")} cr · <b style={{ color: "var(--text)" }}>{p[0].payload.count} scenarios</b></div>
            )} />} />
            <Area type="monotone" dataKey="count" stroke="var(--data-blue-bright)" strokeWidth={2}
              fill="url(#mcFill)" isAnimationActive animationDuration={500} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data && (
        <div className="readouts">
          <div className="readout"><div className="l">Expected (P50)</div><div className="v">{cr(data.p50_cr)}</div></div>
          <div className="readout"><div className="l">Best case (P10)</div><div className="v" style={{ color: "var(--positive)" }}>{cr(data.p10_cr)}</div></div>
          <div className="readout"><div className="l">Bad case (P90)</div><div className="v" style={{ color: "var(--accent)" }}>{cr(data.p90_cr)}</div></div>
          <div className="readout"><div className="l">Value-at-Risk 95%</div><div className="v" style={{ color: "var(--negative)" }}>{cr(data.var95_cr)}</div></div>
        </div>
      )}
      <p className="chart-caption">
        At ±{vol}% volatility, the fuel bill could overshoot the median by{" "}
        <b style={{ color: "var(--negative)" }}>{data ? cr(data.downside_cr) : "…"}</b> in a bad year — the size of the hedge the fuel-efficiency moves are buying down.
      </p>
    </div>
  );
}
