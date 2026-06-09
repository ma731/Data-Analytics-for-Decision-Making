import { useEffect, useState } from "react";

const BEATS = [
  {
    sel: ".hero", block: "start",
    title: "1 · The setup",
    text: "You're the new CDO of Air India, weeks after Tata's acquisition. Two levers nobody is pulling: fuel and price. The dataset has no fuel field — so we engineered one from physics.",
  },
  {
    sel: "#tour-frontier", block: "center",
    title: "2 · The hero insight",
    text: "Plot every route by what it burns vs what it earns. Fuel and price turn out to be the same decision — and today's pricing ignores fuel cost entirely.",
  },
  {
    sel: "#tour-panic", block: "center",
    title: "3 · The Panic Tax",
    text: "Fares swing 2.8× from early to last-minute with zero change in cost — yet 63% of seats sell in the cheapest window. Money lost in both directions.",
  },
  {
    sel: "#tour-live", block: "start",
    title: "4 · India, live",
    text: "The real network in motion — animated by actual traffic, with live aircraft over India pulled from OpenSky. This is the canvas the decisions act on.",
  },
  {
    sel: "#or", block: "center",
    title: "5 · From insight to action",
    text: "Six live engines turn the findings into optimal decisions: simulation, genetic optimisation, integer programming, reinforcement learning and ML. Don't explain the maths — show one running.",
  },
  {
    sel: "#finale", block: "center",
    title: "6 · What it's worth",
    text: "It all rolls up to one number: a 2-4% revenue-management uplift on Air India's ₹38,812 cr revenue erases a quarter to a third of its loss — in one year. Drag the slider and land the close.",
  },
];

export default function GuidedTour() {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active) return;
    const b = BEATS[i];
    document.querySelector(b.sel)?.scrollIntoView({ behavior: "smooth", block: b.block });
  }, [active, i]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setActive(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, i]);

  function start() { setI(0); setActive(true); }
  function next() { setI((x) => (x < BEATS.length - 1 ? x + 1 : (setActive(false), x))); }
  function prev() { setI((x) => Math.max(0, x - 1)); }

  if (!active) {
    return (
      <button className="tour-fab" onClick={start} aria-label="Start guided tour">
        ▶ Guided tour
      </button>
    );
  }

  const b = BEATS[i];
  return (
    <div className="tour-card" role="dialog" aria-label="Guided tour">
      <div className="tour-step">{i + 1} / {BEATS.length}</div>
      <div className="tour-title">{b.title}</div>
      <div className="tour-text">{b.text}</div>
      <div className="tour-controls">
        <button className="btn" onClick={() => setActive(false)}>Exit</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={prev} disabled={i === 0} aria-label="Previous">‹ Back</button>
        <button className="btn tour-next" onClick={next}>
          {i === BEATS.length - 1 ? "Finish" : "Next ›"}
        </button>
      </div>
      <div className="tour-progress"><div style={{ width: `${((i + 1) / BEATS.length) * 100}%` }} /></div>
    </div>
  );
}
