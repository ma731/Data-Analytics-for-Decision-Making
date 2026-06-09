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

// ---- locale-aware formatters (Web Interface Guidelines) ----
const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const num0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export const fmtINR = (n) => inr0.format(n);
export const fmtNum = (n) => num0.format(n);
export const fmtNum1 = (n) => num1.format(n);

// compact INR for axes: ₹14.2k
export const fmtINRk = (n) =>
  n >= 1000 ? `₹${num1.format(n / 1000)}k` : `₹${num0.format(n)}`;
