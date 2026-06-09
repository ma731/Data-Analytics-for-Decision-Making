import { useReveal } from "./ui.jsx";

/**
 * Full-bleed cinematic divider band — a photo with a dark scrim and an
 * oversized label. Used to break the page into "acts" like a film.
 */
export default function Banner({ img, kicker, title, sub, align = "left", tall = false }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`banner ${tall ? "tall" : ""}`} style={{ backgroundImage: `url(${img})` }}>
      <div className="banner-scrim" />
      <div className={`banner-content ${align}`}>
        {kicker && <div className="banner-kicker">{kicker}</div>}
        <div className="banner-title">{title}</div>
        {sub && <div className="banner-sub">{sub}</div>}
      </div>
    </div>
  );
}
