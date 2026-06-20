import { useEffect, useRef, useState } from "react";
import { getFindings, getLive } from "../api.js";

const CITIES = {
  Delhi: { code: "DEL", lat: 28.56, lon: 77.10 },
  Mumbai: { code: "BOM", lat: 19.09, lon: 72.87 },
  Bangalore: { code: "BLR", lat: 13.20, lon: 77.71 },
  Kolkata: { code: "CCU", lat: 22.65, lon: 88.45 },
  Hyderabad: { code: "HYD", lat: 17.24, lon: 78.43 },
  Chennai: { code: "MAA", lat: 12.99, lon: 80.17 },
};
const TOTAL_PLANES = 46;

export default function LiveMap() {
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const routesRef = useRef([]);
  const planesRef = useRef([]);
  const liveRef = useRef(null);
  const arrivalRef = useRef({ city: "Delhi", at: 0 });
  const [arriving, setArriving] = useState({ city: "Delhi", code: "DEL" });
  const [live, setLive] = useState(null);

  // load india outline
  useEffect(() => {
    fetch("/india-map.json").then((r) => r.json()).then((m) => { mapRef.current = m; }).catch(() => {});
  }, []);

  // load route weights + build planes
  useEffect(() => {
    getFindings().then((f) => {
      const fr = f.frontier.filter((r) => CITIES[r.source_city] && CITIES[r.destination_city]);
      const total = fr.reduce((s, r) => s + r.volume, 0);
      routesRef.current = fr;
      const planes = [];
      fr.forEach((r, ri) => {
        const n = Math.max(1, Math.round((r.volume / total) * TOTAL_PLANES));
        for (let k = 0; k < n; k++) {
          planes.push({ ri, t: Math.random(), speed: 0.035 + Math.random() * 0.03, hue: Math.random() < 0.7 ? "91,227,173" : "143,193,246" });
        }
      });
      planesRef.current = planes;
    }).catch(() => {});
  }, []);

  // poll live traffic
  useEffect(() => {
    let alive = true;
    const tick = () => getLive().then((d) => { if (alive) { liveRef.current = d; setLive(d); } }).catch(() => {});
    tick();
    const id = setInterval(tick, 45000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf, W, H, dpr, running = true, last = 0;
    let proj = null;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // projection fit to india bounds, preserving aspect
      const [lo0, la0, lo1, la1] = [68.0, 6.5, 97.5, 37.2];
      const pad = Math.min(W, H) * 0.06;
      const sx = (W - 2 * pad) / (lo1 - lo0);
      const sy = (H - 2 * pad) / (la1 - la0);
      const s = Math.min(sx, sy);
      const offx = (W - s * (lo1 - lo0)) / 2;
      const offy = (H - s * (la1 - la0)) / 2;
      proj = (lon, lat) => ({ x: offx + (lon - lo0) * s, y: offy + (la1 - lat) * s });
    }

    function arc(p0, p1) {
      const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
      const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1;
      return { cx: mx + (dy / d) * d * 0.14, cy: my - (dx / d) * d * 0.14 };
    }
    const bez = (p0, c, p1, u) => {
      const v = 1 - u;
      return { x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x, y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y };
    };

    function drawMap() {
      const m = mapRef.current;
      if (!m) return;
      // filled landmass
      ctx.beginPath();
      for (const ring of m.outline) {
        ring.forEach(([lon, lat], i) => {
          const p = proj(lon, lat);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        });
        ctx.closePath();
      }
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(30,36,33,0.6)");
      g.addColorStop(1, "rgba(18,22,20,0.4)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(91,227,173,0.55)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // state borders
      ctx.strokeStyle = "rgba(91,227,173,0.12)";
      ctx.lineWidth = 0.6;
      for (const ring of m.states) {
        ctx.beginPath();
        ring.forEach(([lon, lat], i) => { const p = proj(lon, lat); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.stroke();
      }
    }

    function frame(ts) {
      if (!running) return;
      const dt = Math.min((ts - last) / 1000 || 0, 0.05); last = ts;
      ctx.clearRect(0, 0, W, H);
      drawMap();

      const routes = routesRef.current;
      const pos = {};
      for (const name in CITIES) pos[name] = proj(CITIES[name].lon, CITIES[name].lat);

      // faint real OpenSky aircraft
      const lv = liveRef.current;
      if (lv?.sample?.length) {
        for (const a of lv.sample) {
          if (a.lat < 6.5 || a.lat > 37.2 || a.lon < 68 || a.lon > 97.5) continue;
          const p = proj(a.lon, a.lat);
          ctx.fillStyle = "rgba(16,185,129,0.5)";
          ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
        }
      }

      // route arcs (faint)
      for (const r of routes) {
        const p0 = pos[r.source_city], p1 = pos[r.destination_city];
        const c = arc(p0, p1);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(c.cx, c.cy, p1.x, p1.y);
        ctx.strokeStyle = "rgba(91,227,173,0.07)"; ctx.lineWidth = 1; ctx.stroke();
      }

      // planes + contrails
      for (const pl of planesRef.current) {
        const r = routes[pl.ri]; if (!r) continue;
        const p0 = pos[r.source_city], p1 = pos[r.destination_city];
        const c = arc(p0, p1);
        pl.t += pl.speed * dt * 6;
        if (pl.t >= 1) {
          pl.t = 0;
          arrivalRef.current = { city: r.destination_city, at: ts };
        }
        // contrail
        for (let k = 1; k <= 6; k++) {
          const tt = pl.t - k * 0.02; if (tt < 0) break;
          const q = bez(p0, c, p1, tt);
          ctx.fillStyle = `rgba(${pl.hue},${0.18 * (1 - k / 6)})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, 2.2 * (1 - k / 7), 0, Math.PI * 2); ctx.fill();
        }
        const cur = bez(p0, c, p1, pl.t);
        const nxt = bez(p0, c, p1, Math.min(pl.t + 0.01, 1));
        const ang = Math.atan2(nxt.y - cur.y, nxt.x - cur.x);
        ctx.save();
        ctx.translate(cur.x, cur.y); ctx.rotate(ang);
        ctx.fillStyle = `rgba(${pl.hue},1)`;
        ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-3, 2.6); ctx.lineTo(-3, -2.6); ctx.closePath(); ctx.fill();
        ctx.shadowColor = `rgba(${pl.hue},0.9)`; ctx.shadowBlur = 8; ctx.fill();
        ctx.restore();
      }

      // city nodes
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      for (const name in CITIES) {
        const { x, y } = pos[name]; const code = CITIES[name].code;
        const pulse = 5 + Math.sin(ts / 500) * 1.4;
        const gg = ctx.createRadialGradient(x, y, 0, x, y, pulse * 2.6);
        gg.addColorStop(0, "rgba(91,227,173,0.55)"); gg.addColorStop(1, "rgba(91,227,173,0)");
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, pulse * 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(132,240,200,0.95)"; ctx.fillText(code, x + 8, y - 6);
      }

      // surface arrival to React (debounced 2.6s)
      const ar = arrivalRef.current;
      if (ar.city && ts - (frame._lastSwitch || 0) > 2600 && ar.at > (frame._lastSwitch || 0)) {
        frame._lastSwitch = ts;
        setArriving({ city: ar.city, code: CITIES[ar.city].code });
      }

      raf = requestAnimationFrame(frame);
    }
    resize(); raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => { running = false; cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="panel livemap-panel">
      <h3 className="panel-h">India, live — the network in motion</h3>
      <p className="panel-sub">
        Flights animate along Air India&rsquo;s real metro routes, weighted by actual booking volume. Green dots are
        real aircraft over India right now, pulled live from the OpenSky Network.
      </p>
      <div className="livemap-grid">
        <div className="livemap-canvas-wrap">
          <canvas ref={canvasRef} role="img" aria-label="Animated live map of flights across India" />
          <div className={`live-badge ${live?.live ? "on" : "off"}`}>
            <span className="dot" />
            {live?.live ? `LIVE · ${live.count} aircraft over India` : "LIVE feed reconnecting…"}
          </div>
        </div>
        <div className="arrival-card">
          <div className="arrival-photos">
            {Object.values(CITIES).map((c) => (
              <img key={c.code} src={`/airports/${c.code}.jpg`} alt={`${c.code} airport`}
                className={arriving.code === c.code ? "show" : ""} loading="lazy" />
            ))}
            <div className="arrival-overlay" />
          </div>
          <div className="arrival-meta">
            <div className="arrival-label">NOW ARRIVING</div>
            <div className="arrival-city">{arriving.city}</div>
            <div className="arrival-code">{arriving.code} · {airportName(arriving.code)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function airportName(code) {
  return {
    DEL: "Indira Gandhi Intl", BOM: "Chhatrapati Shivaji Maharaj Intl", BLR: "Kempegowda Intl",
    MAA: "Chennai Intl", CCU: "Netaji Subhas Chandra Bose Intl", HYD: "Rajiv Gandhi Intl",
  }[code] || "";
}
