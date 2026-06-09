"""
Air India War Room — Operations Research engine.

Six modules, all computed live from the dataset + engineered fuel model:
  1. monte_carlo_fuel   — fuel-cost risk under ATF price volatility (simulation)
  2. optimize_pricing   — revenue-maximising fare curve from estimated elasticity
  3. nsga2_pareto       — multi-objective fuel-vs-revenue Pareto front (genetic algo)
  4. fleet_milp         — integer program allocating frequencies across routes
  5. rl_pricing         — tabular Q-learning agent that learns a booking-horizon policy
  6. ml_demand          — gradient-boosted fare drivers + econometric price elasticity

Animation-friendly: NSGA-II and RL return per-generation / per-episode snapshots so
the frontend can animate the optimiser working.

Covers the full decision-analytics toolkit: optimization, simulation, risk
modelling, reinforcement learning, and machine learning.
"""

from functools import lru_cache
import numpy as np
import pandas as pd

import analysis
from fuel_model import CRUISE_SPEED_KMH, ATF_PRICE_INR_PER_L, JET_A_DENSITY_KG_L, SEATS_NARROWBODY

RNG = np.random.default_rng(42)  # fixed seed -> reproducible for Q&A


@lru_cache(maxsize=1)
def route_table():
    """Per-route economics used by every optimiser."""
    df = analysis.load()
    eco = df[df["class"] == "Economy"]
    g = eco.groupby(["source_city", "destination_city"]).agg(
        avg_price=("price", "mean"),
        fuel_kg=("fuel_kg", "mean"),
        fuel_kg_per_seat=("fuel_kg_per_seat", "mean"),
        gc_km=("gc_km", "mean"),
        volume=("price", "size"),
    ).reset_index()
    g["route"] = g.source_city + " → " + g.destination_city
    # block hours per flight (airborne proxy) and per-flight economics for a full cabin
    g["block_hours"] = g.gc_km / CRUISE_SPEED_KMH
    g["rev_per_flight"] = g.avg_price * SEATS_NARROWBODY
    g["fuel_cost_per_flight"] = g.fuel_kg / JET_A_DENSITY_KG_L * ATF_PRICE_INR_PER_L
    g["contrib_per_flight"] = g.rev_per_flight - g.fuel_cost_per_flight
    return g.reset_index(drop=True)


# ----------------------------------------------------------------------------
# 1. MONTE CARLO — fuel-cost risk under ATF price volatility
# ----------------------------------------------------------------------------
def monte_carlo_fuel(volatility_pct=20.0, n=6000):
    """
    Simulate the airline's annual fuel bill when the jet-fuel (ATF) price is
    uncertain. ATF price modelled as lognormal around the base with the given
    volatility (2022 ATF swung ~20-40% on the Ukraine shock).
    """
    rt = route_table()
    # annualised fuel litres across the modelled network (volume = observed sample)
    total_fuel_litres = float((rt.fuel_kg / JET_A_DENSITY_KG_L * rt.volume).sum())
    base = ATF_PRICE_INR_PER_L
    sigma = max(volatility_pct, 0.1) / 100.0
    # lognormal multiplier with mean 1
    mult = RNG.lognormal(mean=-0.5 * sigma**2, sigma=sigma, size=int(n))
    costs = total_fuel_litres * base * mult  # INR
    costs_cr = costs / 1e7  # convert to crore
    p = lambda q: float(np.percentile(costs_cr, q))
    # histogram for the animated chart
    counts, edges = np.histogram(costs_cr, bins=40)
    hist = [{"x": round(float((edges[i] + edges[i + 1]) / 2), 1), "count": int(counts[i])}
            for i in range(len(counts))]
    return {
        "volatility_pct": volatility_pct,
        "n": int(n),
        "base_cost_cr": round(total_fuel_litres * base / 1e7, 1),
        "mean_cr": round(float(costs_cr.mean()), 1),
        "p10_cr": round(p(10), 1),
        "p50_cr": round(p(50), 1),
        "p90_cr": round(p(90), 1),
        "var95_cr": round(p(95), 1),          # 95% Value-at-Risk
        "downside_cr": round(p(95) - p(50), 1),
        "hist": hist,
        # a light sample of raw draws for a "raining dots" animation
        "sample": [round(float(c), 1) for c in costs_cr[:400]],
    }


# ----------------------------------------------------------------------------
# 2. DYNAMIC PRICE OPTIMISER — revenue-max fare curve from elasticity
# ----------------------------------------------------------------------------
def optimize_pricing(elasticity=1.4):
    """
    Per booking-window revenue maximisation under a LINEAR demand curve calibrated
    to each bucket's observed (price, demand) and a bucket-specific elasticity.

    Realism: late bookers (business) are price-INELASTIC; early bookers (leisure)
    are ELASTIC. The `elasticity` slider scales the early end. Each bucket's fare is
    moved toward its revenue-maximising point p* = p0*(1+e)/(2e), so total optimised
    revenue is always >= current (each window is individually optimised).
    """
    df = analysis.load()
    eco = df[df["class"] == "Economy"]
    daily = eco.groupby("days_left").agg(price=("price", "mean"), demand=("price", "size")).reset_index()
    dmax = float(daily.days_left.max())
    rows, cur_rev, opt_rev = [], 0.0, 0.0
    for _, r in daily.iterrows():
        p0, d0, dl = float(r.price), float(r.demand), float(r.days_left)
        # elasticity rises with days-left (early leisure elastic, late business not)
        e_d = max(0.5, float(elasticity) * (0.45 + 0.75 * dl / dmax))
        mult = min(max((1 + e_d) / (2 * e_d), 0.82), 1.28)  # toward revenue-max, clamped
        p_opt = p0 * mult
        b = e_d * d0 / p0                     # linear demand slope from point elasticity
        a = d0 + b * p0                       # intercept so D(p0)=d0
        d_opt = max(a - b * p_opt, 0.0)
        cur_rev += p0 * d0
        opt_rev += p_opt * d_opt
        rows.append({"days_left": int(dl), "current_price": round(p0, 0), "optimal_price": round(p_opt, 0)})
    rows.sort(key=lambda x: -x["days_left"])
    uplift = (opt_rev - cur_rev) / cur_rev * 100 if cur_rev else 0
    return {"elasticity": round(float(elasticity), 2), "curve": rows,
            "revenue_uplift_pct": round(float(max(uplift, 0.0)), 1)}


# ----------------------------------------------------------------------------
# 3. NSGA-II — multi-objective fuel-vs-revenue Pareto front (genetic algorithm)
# ----------------------------------------------------------------------------
def _fast_nondominated_sort(objs):
    """objs: (N,2) where we MINIMISE both columns. Returns list of fronts (index lists)."""
    n = len(objs)
    S = [[] for _ in range(n)]
    ncount = np.zeros(n, dtype=int)
    fronts = [[]]
    for p in range(n):
        for q in range(n):
            if p == q:
                continue
            if np.all(objs[p] <= objs[q]) and np.any(objs[p] < objs[q]):
                S[p].append(q)
            elif np.all(objs[q] <= objs[p]) and np.any(objs[q] < objs[p]):
                ncount[p] += 1
        if ncount[p] == 0:
            fronts[0].append(p)
    i = 0
    while fronts[i]:
        nxt = []
        for p in fronts[i]:
            for q in S[p]:
                ncount[q] -= 1
                if ncount[q] == 0:
                    nxt.append(q)
        i += 1
        fronts.append(nxt)
    return fronts[:-1]


def _crowding(objs, front):
    l = len(front)
    dist = np.zeros(l)
    if l <= 2:
        return {front[i]: np.inf for i in range(l)}
    f = objs[front]
    for m in range(objs.shape[1]):
        order = np.argsort(f[:, m])
        dist[order[0]] = dist[order[-1]] = np.inf
        rng = f[order[-1], m] - f[order[0], m] or 1.0
        for k in range(1, l - 1):
            dist[order[k]] += (f[order[k + 1], m] - f[order[k - 1], m]) / rng
    return {front[i]: dist[i] for i in range(l)}


def nsga2_pareto(pop_size=60, generations=40):
    """
    Decision variable: capacity-share vector across routes (simplex). Objectives:
    MINIMISE total fuel and MINIMISE negative-revenue (i.e. maximise revenue).
    Returns a per-generation snapshot of the population so the front can be animated.
    """
    rt = route_table()
    R = len(rt)
    rev = rt.rev_per_flight.to_numpy()
    fuel = (rt.fuel_kg / JET_A_DENSITY_KG_L * ATF_PRICE_INR_PER_L).to_numpy()  # fuel cost INR/flight
    cap = 1000  # total weekly frequencies to distribute across the network

    def evaluate(P):
        # P: (n,R) shares summing to 1; allocation = shares*cap frequencies
        alloc = P * cap
        total_rev = alloc @ rev / 1e7      # crore
        total_fuel = alloc @ fuel / 1e7    # crore
        return np.column_stack([total_fuel, -total_rev])  # minimise both

    # init population on the simplex
    P = RNG.dirichlet(np.ones(R), size=pop_size)
    snapshots = []

    def snap(P, gen):
        objs = evaluate(P)
        fronts = _fast_nondominated_sort(objs)
        pf = sorted([{"fuel": round(float(-(-objs[i][0])), 1), "revenue": round(float(-objs[i][1]), 1)}
                     for i in fronts[0]], key=lambda d: d["fuel"])
        pts = [{"fuel": round(float(objs[i][0]), 1), "revenue": round(float(-objs[i][1]), 1),
                "front": 0 if i in set(fronts[0]) else 1} for i in range(len(P))]
        snapshots.append({"gen": gen, "points": pts, "pareto": pf})

    snap(P, 0)
    for gen in range(1, generations + 1):
        # offspring via SBX-ish crossover + mutation on the simplex
        idx = RNG.integers(0, pop_size, size=(pop_size, 2))
        a, b = P[idx[:, 0]], P[idx[:, 1]]
        alpha = RNG.uniform(0.3, 0.7, size=(pop_size, 1))
        child = alpha * a + (1 - alpha) * b
        # mutation
        mut = RNG.normal(0, 0.03, size=child.shape) * (RNG.random(child.shape) < 0.15)
        child = np.clip(child + mut, 1e-6, None)
        child /= child.sum(axis=1, keepdims=True)
        # combine, sort, select best pop_size by (front, crowding)
        U = np.vstack([P, child])
        objs = evaluate(U)
        fronts = _fast_nondominated_sort(objs)
        new, i = [], 0
        while len(new) + len(fronts[i]) <= pop_size:
            new.extend(fronts[i]); i += 1
            if i >= len(fronts):
                break
        if len(new) < pop_size and i < len(fronts):
            cd = _crowding(objs, fronts[i])
            new.extend(sorted(fronts[i], key=lambda x: -cd[x])[:pop_size - len(new)])
        P = U[new]
        if gen % 2 == 0 or gen == generations:
            snap(P, gen)

    # final knee solution = max revenue-per-fuel on the front
    final = snapshots[-1]["pareto"]
    knee = max(final, key=lambda d: d["revenue"] / d["fuel"]) if final else None
    return {"pop_size": pop_size, "generations": generations,
            "snapshots": snapshots, "knee": knee, "n_frames": len(snapshots)}


# ----------------------------------------------------------------------------
# 4. FLEET MILP — integer frequency allocation
# ----------------------------------------------------------------------------
def fleet_milp(fleet_block_hours=4000):
    """
    Maximise weekly contribution by choosing integer daily frequencies per route,
    subject to a fleet block-hour budget and min/max service levels.
    max  sum contrib_r * x_r
    s.t. sum block_hours_r * x_r <= fleet_block_hours ;  1 <= x_r <= 20  (integer)
    """
    from scipy.optimize import milp, LinearConstraint, Bounds
    rt = route_table()
    contrib = rt.contrib_per_flight.to_numpy()
    bh = rt.block_hours.to_numpy()
    R = len(rt)
    c = -contrib  # milp minimises
    constr = LinearConstraint(bh, ub=fleet_block_hours)
    bounds = Bounds(lb=np.ones(R), ub=np.full(R, 20))
    res = milp(c=c, constraints=[constr], integrality=np.ones(R), bounds=bounds)
    x = np.round(res.x).astype(int) if res.success else np.ones(R, int)
    alloc = []
    for i, r in rt.iterrows():
        alloc.append({
            "route": r.route, "src": r.source_city, "dst": r.destination_city,
            "freq": int(x[i]), "contrib_cr": round(float(contrib[i] * x[i] / 1e7), 2),
            "block_hours": round(float(bh[i] * x[i]), 1),
        })
    alloc.sort(key=lambda a: -a["contrib_cr"])
    return {
        "fleet_block_hours": fleet_block_hours,
        "total_contrib_cr": round(float((contrib * x).sum() / 1e7), 1),
        "hours_used": round(float((bh * x).sum()), 1),
        "allocation": alloc,
        "cities": _city_coords(),
    }


def _city_coords():
    from fuel_model import CITY_COORDS
    return {c: {"lat": v[0], "lon": v[1]} for c, v in CITY_COORDS.items()}


# ----------------------------------------------------------------------------
# 5. RL PRICING AGENT — tabular Q-learning over the booking horizon
# ----------------------------------------------------------------------------
def rl_pricing(episodes=4000):
    """
    Agent sets a fare each day of a 20-day booking window for a fixed-inventory
    flight. State = (days_left, seats_left bucket). Action = price level. Demand
    is stochastic and price-sensitive. Reward = fare on each sale. Learns to hold
    price early and raise it as departure nears — discovering the panic-tax curve.
    """
    H = 20                                   # horizon (days)
    SEATS = 60                               # inventory
    seat_buckets = 6
    price_levels = np.array([4000, 6000, 8000, 11000, 15000], dtype=float)
    A = len(price_levels)
    base_demand, ref_price, e = 6.0, 7000.0, 1.6
    Q = np.zeros((H + 1, seat_buckets + 1, A))
    alpha, gamma = 0.2, 0.95

    def sb(seats):
        return min(seat_buckets, int(seats / SEATS * seat_buckets))

    curve_hist = []
    for ep in range(int(episodes)):
        eps = max(0.05, 1.0 - ep / (episodes * 0.7))
        seats = SEATS
        for d in range(H, 0, -1):
            s = sb(seats)
            a = RNG.integers(A) if RNG.random() < eps else int(np.argmax(Q[d, s]))
            price = price_levels[a]
            # expected sales this day (Poisson), price-sensitive, urgency rises late
            lam = base_demand * (price / ref_price) ** (-e) * (1 + 0.5 * (H - d) / H)
            sales = min(int(RNG.poisson(lam)), seats)
            reward = sales * price
            seats2 = seats - sales
            s2 = sb(seats2)
            best_next = 0 if d - 1 == 0 else np.max(Q[d - 1, s2])
            Q[d, s, a] += alpha * (reward + gamma * best_next - Q[d, s, a])
            seats = seats2
            if seats <= 0:
                break
        if ep % max(1, episodes // 60) == 0:
            # snapshot greedy policy price by days_left (at mid inventory)
            pol = [{"days_left": d, "price": float(price_levels[int(np.argmax(Q[d, seat_buckets // 2]))])}
                   for d in range(H, 0, -1)]
            # quick greedy revenue estimate
            curve_hist.append({"episode": int(ep), "policy": pol})

    final_policy = [{"days_left": d,
                     "price": float(price_levels[int(np.argmax(Q[d, seat_buckets // 2]))])}
                    for d in range(H, 0, -1)]
    return {"episodes": int(episodes), "horizon": H,
            "price_levels": price_levels.tolist(),
            "history": curve_hist, "final_policy": final_policy,
            "n_frames": len(curve_hist)}


# ----------------------------------------------------------------------------
# 6. ML DEMAND ENGINE — gradient-boosted fare drivers + price elasticity
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def ml_demand():
    from sklearn.ensemble import HistGradientBoostingRegressor
    from sklearn.inspection import permutation_importance
    df = analysis.load()
    s = df.sample(n=min(40000, len(df)), random_state=0).copy()
    cat = ["airline", "source_city", "departure_time", "stops", "arrival_time",
           "destination_city", "class"]
    for c in cat:
        s[c] = s[c].astype("category").cat.codes
    feats = cat + ["duration", "days_left", "gc_km"]
    X, y = s[feats], np.log(s["price"])
    model = HistGradientBoostingRegressor(max_iter=180, max_depth=7, random_state=0)
    model.fit(X, y)
    r2 = float(model.score(X, y))
    pi = permutation_importance(model, X, y, n_repeats=4, random_state=0, n_jobs=1)
    imp = sorted([{"feature": f, "importance": round(float(v), 4)}
                  for f, v in zip(feats, pi.importances_mean)],
                 key=lambda d: -d["importance"])
    # econometric price elasticity per route via log-log OLS (statsmodels)
    import statsmodels.api as sm
    eco = df[df["class"] == "Economy"]
    el = eco.groupby("days_left").agg(price=("price", "mean"), q=("price", "size"))
    Xe = sm.add_constant(np.log(el["price"]))
    ols = sm.OLS(np.log(el["q"]), Xe).fit()
    elasticity = float(ols.params.iloc[1])
    return {
        "r2": round(r2, 3),
        "importance": imp,
        "elasticity": round(elasticity, 2),
        "elasticity_note": "Log-log OLS of bookings vs fare across the booking horizon.",
    }


if __name__ == "__main__":
    import json, time
    for name, fn in [("monte_carlo", lambda: monte_carlo_fuel()),
                     ("pricing", lambda: optimize_pricing()),
                     ("fleet", lambda: fleet_milp()),
                     ("ml", lambda: ml_demand())]:
        t = time.time()
        out = fn()
        keys = list(out.keys())
        print(f"{name:12s} {time.time()-t:5.1f}s  keys={keys}")
    t = time.time(); p = nsga2_pareto(); print(f"nsga2        {time.time()-t:5.1f}s  frames={p['n_frames']} knee={p['knee']}")
    t = time.time(); r = rl_pricing(); print(f"rl           {time.time()-t:5.1f}s  frames={r['n_frames']} final[0]={r['final_policy'][0]}")
