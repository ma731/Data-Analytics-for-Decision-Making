import { useEffect, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { getSimFuel, crToEUR } from "../api.js";
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

  const cr = (n) => `₹${n.toLocaleString("en-US")} cr`;
  const lastX = data?.hist?.length ? data.hist[data.hist.length - 1].x : 0;

  return (
    <div className="panel">
      <h3 className="panel-h">Monte Carlo — fuel-bill risk under price shocks</h3>
      <p className="panel-sub">
        Jet fuel is ~40% of cost and swung 20–40% in 2022. We simulate {data ? data.n.toLocaleString("en-US") : "thousands of"} scenarios
        of the annual fuel bill. Drag the volatility — the whole risk distribution recomputes live on the server. Green is a
        good year; the red tail is where it hurts.
      </p>

      <div className="controls-row">
        <div className="slider" style={{ flex: 1 }}>
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
              <linearGradient id="mcRisk" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                <stop offset="45%" stopColor="#fbbf24" stopOpacity={0.6} />
                <stop offset="78%" stopColor="#f97316" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="mcRiskFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                <stop offset="55%" stopColor="#fbbf24" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.34} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              stroke="var(--border)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              label={{ value: "Annual fuel bill (₹ crore)", position: "bottom", offset: 10, fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} stroke="var(--border)" />
            {data && <ReferenceArea x1={data.var95_cr} x2={lastX} fill="#ef4444" fillOpacity={0.1}
              label={{ value: "tail risk", fill: "var(--negative)", fontSize: 10, position: "insideTopRight" }} />}
            {data && <ReferenceLine x={data.p50_cr} stroke="var(--text-muted)" strokeDasharray="4 4"
              label={{ value: "expected", fill: "var(--text-muted)", fontSize: 10, position: "top" }} />}
            {data && <ReferenceLine x={data.var95_cr} stroke="var(--negative)" strokeWidth={1.5}
              label={{ value: "VaR 95%", fill: "var(--negative)", fontSize: 11, position: "top" }} />}
            <Tooltip content={<ChartTip render={(p) => (
              <div className="muted">≈ ₹{(p[0].payload.x).toLocaleString("en-US")} cr · <b style={{ color: "var(--text)" }}>{p[0].payload.count} scenarios</b></div>
            )} />} />
            <Area className="glow-soft" type="monotone" dataKey="count" stroke="url(#mcRisk)" strokeWidth={3}
              fill="url(#mcRiskFill)" isAnimationActive animationDuration={550} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {data && (
        <div className="readouts">
          <div className="readout"><div className="l">Expected (P50)</div><div className="v">{cr(data.p50_cr)}</div><div className="reur">≈ {crToEUR(data.p50_cr)}</div></div>
          <div className="readout"><div className="l">Best case (P10)</div><div className="v" style={{ color: "var(--positive)" }}>{cr(data.p10_cr)}</div><div className="reur">≈ {crToEUR(data.p10_cr)}</div></div>
          <div className="readout"><div className="l">Bad case (P90)</div><div className="v" style={{ color: "var(--accent)" }}>{cr(data.p90_cr)}</div><div className="reur">≈ {crToEUR(data.p90_cr)}</div></div>
          <div className="readout risk"><div className="l">Value-at-Risk 95%</div><div className="v" style={{ color: "var(--negative)" }}>{cr(data.var95_cr)}</div><div className="reur">≈ {crToEUR(data.var95_cr)}</div></div>
        </div>
      )}
      <p className="chart-caption">
        At ±{vol}% volatility, the fuel bill could overshoot the median by{" "}
        <b style={{ color: "var(--negative)" }}>{data ? cr(data.downside_cr) : "…"}</b> in a bad year — the size of the hedge the fuel-efficiency moves are buying down.
      </p>
      <div className="assume">
        ATF modelled as lognormal around the 2022 average. Illustrates fuel-price exposure, not actual hedged cost.
      </div>
    </div>
  );
}
