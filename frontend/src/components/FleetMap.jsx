import { useEffect, useRef, useState } from "react";
import { getFleet, crToEUR } from "../api.js";

export default function FleetMap() {
  const [hours, setHours] = useState(4000);
  const [data, setData] = useState(null);
  const canvasRef = useRef(null);
  const dataRef = useRef(null);
  const timer = useRef(0);

  function run(h) { getFleet(h).then(setData).catch(() => {}); }
  useEffect(() => { run(4000); }, []);
  useEffect(() => { dataRef.current = data; }, [data]);

  function onSlide(h) {
    setHours(h);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(h), 200);
  }

  // canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf, W, H, dpr, t = 0, running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function project(lat, lon) {
      // fit India's six metros into the canvas with padding
      const latMin = 11, latMax = 30, lonMin = 70, lonMax = 90;
      const padX = W * 0.12, padY = H * 0.1;
      const x = padX + ((lon - lonMin) / (lonMax - lonMin)) * (W - 2 * padX);
      const y = padY + ((latMax - lat) / (latMax - latMin)) * (H - 2 * padY);
      return { x, y };
    }

    function frame() {
      if (!running) return;
      t += 0.012;
      ctx.clearRect(0, 0, W, H);
      const d = dataRef.current;
      if (!d) { raf = requestAnimationFrame(frame); return; }
      const cities = d.cities;
      const pos = {};
      for (const c in cities) pos[c] = project(cities[c].lat, cities[c].lon);
      const maxFreq = Math.max(...d.allocation.map((a) => a.freq), 1);

      // arcs
      for (const a of d.allocation) {
        const p0 = pos[a.src], p1 = pos[a.dst];
        if (!p0 || !p1) continue;
        const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        const dx = p1.x - p0.x, dy = p1.y - p0.y, dist = Math.hypot(dx, dy) || 1;
        const cx = mx + (dy / dist) * dist * 0.16, cy = my - (dx / dist) * dist * 0.16;
        const w = 0.5 + (a.freq / maxFreq) * 3.5;
        const alpha = 0.08 + (a.freq / maxFreq) * 0.32;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cx, cy, p1.x, p1.y);
        ctx.strokeStyle = `rgba(91,227,173,${alpha})`;
        ctx.lineWidth = w;
        ctx.stroke();
        // travelling pulse, frequency-gated
        const speed = 0.25 + (a.freq / maxFreq) * 0.5;
        const u = (t * speed + (a.freq % 7) / 7) % 1;
        const v = 1 - u;
        const px = v * v * p0.x + 2 * v * u * cx + u * u * p1.x;
        const py = v * v * p0.y + 2 * v * u * cy + u * u * p1.y;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 6);
        g.addColorStop(0, "rgba(200,255,235,0.95)");
        g.addColorStop(1, "rgba(91,227,173,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      }

      // highlight the optimiser's top route — glowing gold arc + bright pulse + label
      const top = d.allocation[0];
      if (top && pos[top.src] && pos[top.dst]) {
        const p0 = pos[top.src], p1 = pos[top.dst];
        const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
        const dx = p1.x - p0.x, dy = p1.y - p0.y, dist = Math.hypot(dx, dy) || 1;
        const cx = mx + (dy / dist) * dist * 0.16, cy = my - (dx / dist) * dist * 0.16;
        ctx.save();
        ctx.shadowColor = "rgba(255,235,160,0.9)";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cx, cy, p1.x, p1.y);
        ctx.strokeStyle = "rgba(255,228,150,0.95)";
        ctx.lineWidth = 3.6;
        ctx.stroke();
        ctx.restore();
        const u = (t * 0.9) % 1, v = 1 - u;
        const px = v * v * p0.x + 2 * v * u * cx + u * u * p1.x;
        const py = v * v * p0.y + 2 * v * u * cy + u * u * p1.y;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 9);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(1, "rgba(255,235,160,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(255,235,160,0.96)";
        ctx.fillText("★ TOP " + top.src + " → " + top.dst, cx + 10, cy - 8);
      }

      // city nodes
      ctx.font = "600 13px Inter, sans-serif";
      for (const c in pos) {
        const { x, y } = pos[c];
        const pulse = 6 + Math.sin(t * 3) * 1.5;
        const g = ctx.createRadialGradient(x, y, 0, x, y, pulse * 2.4);
        g.addColorStop(0, "rgba(96,165,250,0.7)");
        g.addColorStop(1, "rgba(96,165,250,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, pulse * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dbe6fb";
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(241,245,249,0.92)";
        ctx.fillText(c, x + 10, y - 8);
      }
      raf = requestAnimationFrame(frame);
    }
    resize(); frame();
    window.addEventListener("resize", resize);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  const top = (data?.allocation || []).slice(0, 3);

  return (
    <div className="panel">
      <h3 className="panel-h">Fleet MILP — the optimal route network, lit up</h3>
      <p className="panel-sub">
        An integer program picks how many weekly frequencies to fly on each route to maximise contribution within a fixed
        fleet block-hour budget. Brighter, thicker arcs = more flights the optimiser assigns. Drag the fleet size and the
        network re-solves.
      </p>
      <div className="controls-row">
        <div className="slider">
          <div className="lab"><span>Fleet block-hours / week</span><b>{hours.toLocaleString("en-US")}h</b></div>
          <input type="range" min="1500" max="9000" step="250" value={hours} aria-label="Fleet block hours"
            aria-valuetext={`${hours.toLocaleString("en-US")} block hours per week`}
            onChange={(e) => onSlide(+e.target.value)} />
        </div>
      </div>
      <div className="map-wrap">
        <canvas ref={canvasRef} role="img" style={{ width: "100%", height: "100%" }} aria-label="Animated map of optimised flight network across India" />
      </div>
      {data && (
        <div className="readouts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="readout"><div className="l">Weekly contribution</div><div className="v" style={{ color: "var(--positive)" }}>₹{data.total_contrib_cr.toLocaleString("en-US")} cr</div><div className="reur">≈ {crToEUR(data.total_contrib_cr)}/wk</div></div>
          <div className="readout"><div className="l">Block-hours used</div><div className="v">{data.hours_used.toLocaleString("en-US")}h</div></div>
          <div className="readout"><div className="l">Top route</div><div className="v" style={{ fontSize: 18 }}>{top[0]?.route}</div></div>
        </div>
      )}
      <p className="chart-caption">
        The optimiser concentrates capacity on the highest contribution-per-block-hour routes first — the same efficiency
        logic as the frontier, now turned into an actual flying schedule.
      </p>
      <div className="assume">
        Contribution = fare × seats − modelled fuel; directional, not full margin.
      </div>
    </div>
  );
}
