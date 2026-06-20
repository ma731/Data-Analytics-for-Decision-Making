import { crToEUR } from "../api.js";

/**
 * The closer. A scannable recap of the whole brief — diagnosis, prescription,
 * prize, capability — ending on the single concrete action for Monday. This is
 * the last beat the room sees, so it carries the "so what".
 */
export default function Conclusion({ f }) {
  const pt = f.panic_tax;
  const recap = [
    {
      k: "The diagnosis",
      v: <>A <b>{pt.multiplier}×</b> panic-tax on identical seats, connections that burn fuel and cash twice over, and an <b>8×</b> Business premium only Tata can hold.</>,
    },
    {
      k: "The prescription",
      v: <>Three ranked moves: a disciplined <b>price floor first</b>, then cut wasteful stops, then grow the premium cabin.</>,
    },
    {
      k: "The prize",
      v: <>Up to <b>₹1,164 cr/yr</b> (≈ {crToEUR(1164)}) from pricing discipline alone — a real bite out of the airline's ₹4,444 cr loss.</>,
    },
    {
      k: "How we keep deciding",
      v: <>A data→decision flywheel with named owners, every estimate labelled, analytics that runs <b>all the way to prescriptive</b>.</>,
    },
  ];

  return (
    <div className="conclusion">
      <div className="grid concl-grid">
        {recap.map((r, i) => (
          <div className="concl-card" key={r.k}>
            <span className="concl-n mono">0{i + 1}</span>
            <span className="concl-k">{r.k}</span>
            <p>{r.v}</p>
          </div>
        ))}
      </div>
      <div className="concl-ask">
        <span className="concl-ask-k">Monday morning</span>
        <p>
          Switch on the early-booking price floor for the top five metro routes, instrument the booking
          curve, and put the first recovered rupees on the board at next week&rsquo;s war-room.
        </p>
      </div>
    </div>
  );
}
