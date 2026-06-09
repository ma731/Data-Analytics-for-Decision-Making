import { useEffect, useRef, useState } from "react";

export function Section({ eyebrow, title, sub, delay = 0, id, children }) {
  return (
    <section className="section" id={id} style={{ animationDelay: `${delay}ms` }}>
      {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
      {title && <h2 className="section-title">{title}</h2>}
      {sub && <p className="section-sub">{sub}</p>}
      {children}
    </section>
  );
}

// Count-up for KPI numbers. Respects reduced-motion. `format` maps value -> string.
export function useCountUp(target, { duration = 1100, format = (v) => v } = {}) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(target);
      return;
    }
    let start;
    const tick = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return format(val);
}

// Scroll-reveal: returns a ref; adds class "in" when the element scrolls into view.
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

// Dark themed tooltip body for Recharts
export function ChartTip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(17,23,38,0.96)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 12px",
        fontSize: 13,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
      }}
    >
      {render ? render(payload, label) : null}
    </div>
  );
}
