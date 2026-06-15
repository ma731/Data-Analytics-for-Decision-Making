import { useEffect, useRef } from "react";

/**
 * Cinematic fixed-position canvas behind the whole app: a living network of
 * glowing nodes with light-pulses travelling along curved flight arcs, over a
 * slow-drifting aurora. Pure canvas + rAF, devicePixelRatio-aware.
 */
export default function FlightBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf, W, H, dpr;
    let nodes = [];
    let arcs = [];
    let t = 0;
    let running = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      const N = Math.max(10, Math.round((W * H) / 90000)); // density scales with area
      nodes = Array.from({ length: N }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1.2 + Math.random() * 2.2,
        ph: Math.random() * Math.PI * 2,
      }));
      // connect nearby nodes with curved arcs carrying light pulses
      arcs = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x,
            dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy);
          if (d < Math.min(W, H) * 0.34 && Math.random() < 0.5) {
            arcs.push({
              a: i,
              b: j,
              // control point for a gentle bow
              cx: (nodes[i].x + nodes[j].x) / 2 + (dy / d) * d * 0.18,
              cy: (nodes[i].y + nodes[j].y) / 2 - (dx / d) * d * 0.18,
              speed: 0.04 + Math.random() * 0.12,
              offset: Math.random(),
              hue: Math.random() < 0.5 ? "59,130,246" : "251,191,36",
            });
          }
        }
      }
      if (arcs.length > 90) arcs.length = 90;
    }

    function bezier(p0, p1, c, u) {
      const v = 1 - u;
      return {
        x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
        y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y,
      };
    }

    function frame() {
      if (!running) return;
      t += 0.005;
      ctx.clearRect(0, 0, W, H);

      // slow aurora blobs
      const blobs = [
        { x: W * 0.85, y: H * 0.08, c: "211,17,69", r: 520 },
        { x: W * 0.05, y: H * 0.12, c: "59,130,246", r: 460 },
        { x: W * (0.5 + 0.15 * Math.sin(t)), y: H * (0.9 + 0.05 * Math.cos(t * 0.7)), c: "16,185,129", r: 380 },
      ];
      for (const b of blobs) {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        g.addColorStop(0, `rgba(${b.c},0.10)`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      // arcs + travelling pulses
      for (const arc of arcs) {
        const p0 = nodes[arc.a],
          p1 = nodes[arc.b],
          c = { x: arc.cx, y: arc.cy };
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y);
        ctx.strokeStyle = `rgba(${arc.hue},0.07)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // pulse
        const u = (t * arc.speed * 6 + arc.offset) % 1;
        const pt = bezier(p0, p1, c, u);
        const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, 7);
        grd.addColorStop(0, `rgba(${arc.hue},0.9)`);
        grd.addColorStop(1, `rgba(${arc.hue},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // nodes (twinkling)
      for (const n of nodes) {
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + n.ph);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,184,${0.25 + tw * 0.5})`;
        ctx.fill();
      }

      if (!reduce && running) raf = requestAnimationFrame(frame);
    }

    resize();
    frame(); // paints once; under reduced-motion it stops here (static frame)
    window.addEventListener("resize", resize);
    const onVis = () => {
      running = !document.hidden;
      if (running && !reduce) frame();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
