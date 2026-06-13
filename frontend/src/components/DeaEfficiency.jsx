import { useEffect, useState } from "react";
import { getDea } from "../api.js";
import { useCountUp } from "./ui.jsx";

function effColor(e) {
  // red (inefficient) -> gold -> green (on frontier)
  if (e >= 0.999) return "var(--positive)";
  const hue = 8 + e * 130; // 0.4 -> ~60 (amber), 1.0 -> ~138 (green)
  return `hsl(${hue}, 70%, 55%)`;
}

export default function DeaEfficiency() {
  const [d, setD] = useState(null);
  useEffect(() => { getDea().then(setD).catch(() => {}); }, []);

  const meanEff = useCountUp((d?.mean_efficiency ?? 0) * 100, { duration: 800, format: (v) => v.toFixed(0) });
  const rows = d?.routes || [];

  return (
    <div className="panel">
      <h3 className="panel-h">Route efficiency — Data Envelopment Analysis (one LP per route)</h3>
      <p className="panel-sub">
        The hero frontier, made rigorous. Each route is scored by a linear program: how little fuel could deliver the
        same revenue and volume? <b style={{ color: "var(--positive)" }}>1.00</b> means it&rsquo;s on the efficiency
        frontier; below means the same output is achievable on less fuel — benchmarked against real peer routes.
      </p>

      <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="readout">
          <div className="l">On the frontier</div>
          <div className="v" style={{ color: "var(--positive)" }}>{d ? `${d.n_efficient}/${d.n_routes}` : "—"}</div>
        </div>
        <div className="readout">
          <div className="l">Mean efficiency</div>
          <div className="v">{meanEff}%</div>
        </div>
        <div className="readout">
          <div className="l">Worst route&rsquo;s fuel slack</div>
          <div className="v" style={{ color: "var(--accent)" }}>
            {rows.length ? `${rows[rows.length - 1].fuel_savings_pct}%` : "—"}
          </div>
        </div>
      </div>

      <div style={{ maxHeight: 360, overflowY: "auto", marginTop: 16 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Route</th>
              <th>Efficiency</th>
              <th className="num">Fuel/seat</th>
              <th className="num">Target</th>
              <th>Benchmark peers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.route}>
                <td>{r.route}</td>
                <td style={{ minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 7, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${r.efficiency * 100}%`, height: "100%", background: effColor(r.efficiency) }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: effColor(r.efficiency), minWidth: 38, textAlign: "right" }}>
                      {r.efficiency.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="num">{r.fuel_kg_per_seat}</td>
                <td className="num" style={{ color: r.on_frontier ? "var(--text-muted)" : "var(--positive)" }}>
                  {r.target_fuel_kg_per_seat}
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {r.on_frontier
                    ? <span className="pill yes">frontier</span>
                    : (r.peers.map((p) => p.route).join(", ") || "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="chart-caption">
        Inefficient routes aren&rsquo;t condemned — they&rsquo;re given a target and a peer to copy. &ldquo;Match this
        benchmark&rsquo;s load factor and routing&rdquo; turns the frontier chart into a concrete, route-by-route
        action list.
      </p>
      <div className="assume">
        Input-oriented CCR DEA. Input: modelled fuel/seat. Outputs: revenue/seat and passenger volume. One LP solved
        per route ({d?.n_routes ?? 30} routes) — efficiency is relative to the observed best, not an absolute ideal.
      </div>
    </div>
  );
}
