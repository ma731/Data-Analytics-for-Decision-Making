// Thin client for the FastAPI War Room backend. Dev proxies /api -> :8000.
const BASE = "/api";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

export const getFindings = () => get("/findings");
export const getContext = () => get("/context");
export const getRoute = (s, d, stops) =>
  get(`/route/${encodeURIComponent(s)}/${encodeURIComponent(d)}/${stops}`);

// ---- operations research engine ----
export const getSimFuel = (volatility) => get(`/sim/fuel?volatility=${volatility}`);
export const getPricing = (elasticity) => get(`/optimize/pricing?elasticity=${elasticity}`);
export const getPareto = () => get("/pareto");
export const getFleet = (hours) => get(`/fleet?hours=${hours}`);
export const getRL = () => get("/rl");
export const getDemand = () => get("/demand");
export const getEmsr = () => get("/emsr");
export const getShadow = () => get("/shadow");
export const getDea = () => get("/dea");
export const getSensitivity = () => get("/sensitivity");
export const getLive = () => get("/live");

// ---- formatters: Western grouping (en-US) for a European/international audience ----
const inr0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const fmtINR = (n) => inr0.format(n);
export const fmtNum = (n) => num0.format(n);
export const fmtNum1 = (n) => num1.format(n);

// compact INR for axes: ₹14.2k
export const fmtINRk = (n) =>
  n >= 1000 ? `₹${num1.format(n / 1000)}k` : `₹${num0.format(n)}`;

// ---- EUR comprehension aids for the non-Indian audience (₹90 ≈ €1) ----
export const RUPEE_PER_EURO = 90;
// crore (₹10M units) -> rounded EUR, auto M/B
export const crToEUR = (cr) => {
  const eur = (cr * 1e7) / RUPEE_PER_EURO;
  return eur >= 1e9 ? `€${(eur / 1e9).toFixed(1)}B` : `€${Math.round(eur / 1e6)}M`;
};
// plain INR -> rounded EUR
export const inrToEUR = (n) =>
  `€${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n / RUPEE_PER_EURO)}`;
