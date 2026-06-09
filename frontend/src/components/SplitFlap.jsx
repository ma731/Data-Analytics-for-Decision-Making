import { useEffect, useRef, useState } from "react";
import { getFindings } from "../api.js";

const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789₹.,-:→";

function Flap({ target }) {
  const t = (target || " ").toUpperCase();
  const [ch, setCh] = useState(" ");
  const ref = useRef(null);
  useEffect(() => {
    const goal = CHARSET.includes(t) ? t : " ";
    let cur = ch;
    if (cur === goal) return;
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      let i = CHARSET.indexOf(cur);
      i = (i + 1) % CHARSET.length;
      cur = CHARSET[i];
      setCh(cur);
      if (cur === goal) clearInterval(ref.current);
    }, 28);
    return () => clearInterval(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);
  return (
    <span className="flap" key={ch} data-c={ch}>
      {ch === " " ? " " : ch}
    </span>
  );
}

function Row({ text, len }) {
  const s = (text || "").toUpperCase().slice(0, len).padEnd(len, " ");
  return (
    <span className="flap-row">
      {Array.from({ length: len }).map((_, i) => (
        <Flap key={i} target={s[i]} />
      ))}
    </span>
  );
}

export default function SplitFlap() {
  const [rows, setRows] = useState([]);
  const allRef = useRef([]);
  const idxRef = useRef(0);

  useEffect(() => {
    getFindings().then((f) => {
      const codes = { Delhi: "DEL", Mumbai: "BOM", Bangalore: "BLR", Kolkata: "CCU", Hyderabad: "HYD", Chennai: "MAA" };
      const deps = f.frontier
        .filter((r) => codes[r.destination_city])
        .map((r, i) => ({
          flight: "AI" + (101 + (i % 60) * 7),
          dest: r.destination_city,
          code: codes[r.destination_city],
          fare: "RS" + Math.round(r.avg_price).toLocaleString("en-IN").replace(/,/g, ""),
          status: r.fuel_kg_per_seat < 25 ? "ON TIME" : r.fuel_kg_per_seat < 40 ? "BOARDING" : "FINAL CALL",
        }));
      allRef.current = deps;
      setRows(deps.slice(0, 6));
    });
  }, []);

  useEffect(() => {
    if (!allRef.current.length) return;
    const id = setInterval(() => {
      idxRef.current = (idxRef.current + 6) % allRef.current.length;
      const start = idxRef.current;
      const next = [];
      for (let i = 0; i < 6; i++) next.push(allRef.current[(start + i) % allRef.current.length]);
      setRows(next);
    }, 5200);
    return () => clearInterval(id);
  }, [rows.length === 0]);

  return (
    <div className="board">
      <div className="board-top">
        <span className="board-title">◈ AIR INDIA · DEPARTURES</span>
        <span className="board-sub">METRO NETWORK · LIVE FARES</span>
      </div>
      <div className="board-head">
        <span>FLIGHT</span><span>DESTINATION</span><span>FARE</span><span>STATUS</span>
      </div>
      <div className="board-rows">
        {rows.map((r, i) => (
          <div className="board-line" key={i}>
            <Row text={r.flight} len={6} />
            <Row text={`${r.code} ${r.dest}`} len={15} />
            <Row text={r.fare} len={8} />
            <Row text={r.status} len={10} />
          </div>
        ))}
      </div>
    </div>
  );
}
