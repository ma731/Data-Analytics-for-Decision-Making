import { useEffect, useRef, useState } from "react";

/**
 * Cinematic full-bleed hero: an Air India A350 (new "Vista" livery) on final
 * approach as a muted looping video background, with the real brand logo and
 * oversized editorial typography. Clicking "Enter the War Room" scrolls into
 * the analysis.
 */
export default function Hero() {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => setReady(true);
    v.addEventListener("canplay", onReady);
    v.play?.().catch(() => {}); // muted autoplay kick
    return () => v.removeEventListener("canplay", onReady);
  }, []);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    const next = !sound;
    v.muted = !next;
    if (next) v.play?.().catch(() => {}); // user gesture lets audio play
    setSound(next);
  }

  function enter() {
    document.getElementById("war-room")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="hero">
      <video
        ref={videoRef}
        className={`hero-video ${ready ? "in" : ""}`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/airindia-poster.jpg"
        aria-hidden="true"
      >
        <source src="/airindia-takeoff.mp4" type="video/mp4" />
      </video>
      <div className="hero-scrim" />

      <button className="hero-sound" onClick={toggleSound} aria-pressed={sound}
        aria-label={sound ? "Mute engine sound" : "Play engine sound"}>
        {sound ? "🔊" : "🔈"} <span>{sound ? "Sound on" : "Engine sound"}</span>
      </button>

      <header className="hero-top">
        <img src="/airindia-logo.svg" alt="Air India" className="hero-logo" />
        <div className="hero-top-right">
          <span className="hero-tag">CDO WAR ROOM</span>
          <span className="hero-tag">FY 2022</span>
        </div>
      </header>

      <div className="hero-side" aria-hidden="true">NEW YORK ⇄ DELHI · A350-900 · VISTA LIVERY</div>

      <div className="hero-body">
        <div className="hero-eyebrow">A new Air India · the owner&rsquo;s opening diagnostic</div>
        <h1 className="hero-title">
          TWO LEVERS.<br />
          <span className="hl">ONE DECISION.</span>
        </h1>
        <p className="hero-sub">
          300,153 flights. Zero fuel data — so we engineered it from physics. Then six live
          operations-research engines turn every insight into an order. This is what optimizing
          <b> fuel and price</b> actually looks like.
        </p>
        <div className="hero-cta">
          <button className="hero-btn primary" onClick={enter}>▶ Enter the War Room</button>
          <a className="hero-btn ghost" href="#or" onClick={(e) => { e.preventDefault(); document.getElementById("or")?.scrollIntoView({ behavior: "smooth" }); }}>
            See the optimisation engine
          </a>
        </div>
        <div className="hero-stats">
          <div><b>2.8×</b><span>panic-tax swing</span></div>
          <div><b>8×</b><span>business-class premium</span></div>
          <div><b>6</b><span>live OR engines</span></div>
        </div>
      </div>

      <button className="hero-scroll" onClick={enter} aria-label="Scroll to begin">
        <span /> SCROLL
      </button>
    </section>
  );
}
