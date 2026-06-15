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
// Pass `start: false` to hold at 0 until it flips true (e.g. scroll-into-view) so
// below-the-fold numbers tick up when the reader actually reaches them.
export function useCountUp(target, { duration = 1100, format = (v) => v, start = true } = {}) {
  const [val, setVal] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!start) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(target);
      return;
    }
    let from;
    const tick = (t) => {
      if (from === undefined) from = t;
      const p = Math.min((t - from) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // ease-out quart
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, start]);
  return format(val);
}

// Fires once when the attached element scrolls into view. Returns [ref, inView].
// Use it to gate count-ups / heavy reveals on actual visibility.
export function useInView({ threshold = 0.3, once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.unobserve(el);
          }
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, inView];
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
