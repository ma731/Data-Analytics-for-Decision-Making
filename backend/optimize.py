"""
Air India War Room — Operations Research engine.

Nine modules, all computed live from the dataset + engineered fuel model:
  1. monte_carlo_fuel     — fuel-cost risk under ATF price volatility (simulation)
  2. optimize_pricing     — revenue-maximising fare curve from estimated elasticity
  3. nsga2_pareto         — multi-objective fuel-vs-revenue Pareto front (genetic algo)
  4. fleet_milp           — integer program allocating frequencies across routes
  5. rl_pricing           — tabular Q-learning agent that learns a booking-horizon policy
  6. ml_demand            — gradient-boosted fare drivers + observed fare/volume gradient
  7. emsr_protection      — Littlewood's rule, exact fare-class seat protection
  8. fleet_shadow_prices  — LP relaxation + duality: marginal value of fleet capacity
  9. dea_efficiency       — data envelopment analysis, one CCR LP per route

Animation-friendly: NSGA-II and RL return per-generation / per-episode snapshots so
the frontend can animate the optimiser working.

Covers the full decision-analytics toolkit: linear & integer programming, LP duality,
multi-objective optimisation, simulation, risk modelling, reinforcement learning,
machine learning, exact revenue management, and efficiency analysis.
"""

from functools import lru_cache
import numpy as np
import pandas as pd

import analysis
from fuel_model import (
    CRUISE_SPEED_KMH, ATF_PRICE_INR_PER_L, JET_A_DENSITY_KG_L, SEATS_NARROWBODY,
    fuel_cost_inr,
)

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
    g["fuel_cost_per_flight"] = fuel_cost_inr(g.fuel_kg)
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
    RNG = np.random.default_rng(42)   # per-function seed -> order-independent
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
    moved toward its revenue-maximising point p* = p0*(1+e)/(2e). Absent the clamp
    that is >= current per window; the [0.82, 1.28] clamp can bite, so we report the
    TRUE uplift (no longer floored at 0) rather than over-claiming the guarantee.
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
    # Report the TRUE uplift. Under a per-window linear demand model each fare is
    # moved toward its own revenue-maximising point, so this is >= 0 by
    # construction — but we no longer floor it, so if the clamps ever bite the
    # number stays honest instead of being silently rounded up to 0.
    uplift = (opt_rev - cur_rev) / cur_rev * 100 if cur_rev else 0
    return {"elasticity": round(float(elasticity), 2), "curve": rows,
            "revenue_uplift_pct": round(float(uplift), 1)}


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
    RNG = np.random.default_rng(202)   # per-function seed -> order-independent
    rt = route_table()
    R = len(rt)
    rev = rt.rev_per_flight.to_numpy()
    fuel = fuel_cost_inr(rt.fuel_kg).to_numpy()  # fuel cost INR/flight
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

    Emits, per snapshot: the greedy policy ladder, the full (days × seats) policy
    heatmap, and the evaluated revenue vs a static-price baseline — so the UI can
    show the agent *learning* (reward curve rising, heatmap sharpening, uplift).
    """
    RNG = np.random.default_rng(303)   # per-function seed -> order-independent
    H = 20                                   # horizon (days)
    SEATS = 60                               # inventory
    seat_buckets = 6
    price_levels = np.array([4000, 6000, 8000, 11000, 15000], dtype=float)
    A = len(price_levels)
    base_demand, ref_price, e = 6.0, 7000.0, 1.6
    Q = np.zeros((H + 1, seat_buckets + 1, A))
    alpha, gamma = 0.05, 0.96

    def sb(seats):
        return min(seat_buckets, int(seats / SEATS * seat_buckets))

    def demand_sales(price, d, seats):
        lam = base_demand * (price / ref_price) ** (-e) * (1 + 0.5 * (H - d) / H)
        return min(int(RNG.poisson(lam)), seats)

    def rollout(price_fn, rolls=40):
        """Average total revenue of a pricing policy over `rolls` booking windows."""
        tot = 0.0
        for _ in range(rolls):
            seats = SEATS
            for d in range(H, 0, -1):
                price = price_fn(d, seats)
                sold = demand_sales(price, d, seats)
                tot += sold * price
                seats -= sold
                if seats <= 0:
                    break
        return tot / rolls

    greedy = lambda d, seats: price_levels[int(np.argmax(Q[d, sb(seats)]))]
    # baseline = the "discount-to-fill" instinct: always price low to fill the plane
    # (exactly the giveaway the panic-tax finding warns against). The agent should beat it.
    baseline = lambda d, seats: price_levels[0]
    baseline_rev = rollout(baseline, rolls=150)

    def heatmap():
        # price level index chosen for each (days_left desc, seats bucket)
        return [[int(np.argmax(Q[d, s])) for s in range(seat_buckets + 1)]
                for d in range(H, 0, -1)]

    # snapshot the untrained agent first (Q=0 -> it just gives seats away = baseline)
    hist = [{"episode": 0,
             "policy": [{"days_left": d, "price": float(price_levels[0])} for d in range(H, 0, -1)],
             "heatmap": heatmap(), "agent_rev": round(rollout(greedy, 60), 0),
             "baseline_rev": round(baseline_rev, 0)}]
    snap_every = max(1, episodes // 58)
    for ep in range(int(episodes)):
        eps = max(0.05, 1.0 - ep / (episodes * 0.7))
        seats = SEATS
        for d in range(H, 0, -1):
            s = sb(seats)
            a = RNG.integers(A) if RNG.random() < eps else int(np.argmax(Q[d, s]))
            price = price_levels[a]
            sales = demand_sales(price, d, seats)
            reward = sales * price
            seats2 = seats - sales
            best_next = 0 if d - 1 == 0 else np.max(Q[d - 1, sb(seats2)])
            Q[d, s, a] += alpha * (reward + gamma * best_next - Q[d, s, a])
            seats = seats2
            if seats <= 0:
                break
        if ep > 0 and ep % snap_every == 0:
            pol = [{"days_left": d, "price": float(price_levels[int(np.argmax(Q[d, seat_buckets // 2]))])}
                   for d in range(H, 0, -1)]
            agent_rev = rollout(greedy, rolls=50)
            hist.append({"episode": int(ep), "policy": pol, "heatmap": heatmap(),
                         "agent_rev": round(agent_rev, 0), "baseline_rev": round(baseline_rev, 0)})

    final_policy = [{"days_left": d, "price": float(price_levels[int(np.argmax(Q[d, seat_buckets // 2]))])}
                    for d in range(H, 0, -1)]
    final_rev = rollout(greedy, rolls=160)
    uplift = (final_rev - baseline_rev) / baseline_rev * 100 if baseline_rev else 0
    return {"episodes": int(episodes), "horizon": H,
            "price_levels": price_levels.tolist(), "seat_buckets": seat_buckets,
            "history": hist, "final_policy": final_policy,
            "baseline_rev": round(baseline_rev, 0), "final_rev": round(final_rev, 0),
            "uplift_pct": round(float(uplift), 1), "n_frames": len(hist)}


# ----------------------------------------------------------------------------
# 6. ML DEMAND ENGINE — gradient-boosted fare drivers + price elasticity
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def ml_demand():
    from sklearn.ensemble import HistGradientBoostingRegressor
    from sklearn.inspection import permutation_importance
    from sklearn.model_selection import GroupShuffleSplit
    df = analysis.load()
    s = df.sample(n=min(40000, len(df)), random_state=0).copy()

    # ---- leakage-proof split: group by FLIGHT so no flight is in both sets ----
    # A random split would let near-duplicate rows of the same flight (different
    # days_left) leak train->test and inflate the score. Grouping fixes that, so
    # the reported R²/MAPE are honest out-of-sample numbers.
    groups = s["flight"].astype(str).to_numpy()
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0)
    tr_idx, te_idx = next(gss.split(s, groups=groups))

    cat = ["airline", "source_city", "departure_time", "stops", "arrival_time",
           "destination_city", "class"]
    for c in cat:
        s[c] = s[c].astype("category").cat.codes
    feats = cat + ["duration", "days_left", "gc_km"]
    X, y = s[feats], np.log(s["price"])
    Xtr, Xte = X.iloc[tr_idx], X.iloc[te_idx]
    ytr, yte = y.iloc[tr_idx], y.iloc[te_idx]
    price_te = s["price"].iloc[te_idx].to_numpy()

    model = HistGradientBoostingRegressor(max_iter=180, max_depth=7, random_state=0)
    model.fit(Xtr, ytr)
    r2_train = float(model.score(Xtr, ytr))
    r2_test = float(model.score(Xte, yte))          # the honest, out-of-sample R²

    # ---- point error in rupees + skill vs a naive route×class×stops baseline ----
    pred_price = np.exp(model.predict(Xte))
    mae = float(np.mean(np.abs(pred_price - price_te)))
    mape = float(np.mean(np.abs(pred_price - price_te) / price_te) * 100)
    base_key = ["source_city", "destination_city", "class", "stops"]
    base_map = s.iloc[tr_idx].groupby(base_key)["price"].median()
    base_pred = s.iloc[te_idx].set_index(base_key).index.map(base_map)
    base_pred = np.where(np.isnan(base_pred.astype(float)),
                         float(s["price"].iloc[tr_idx].median()), base_pred.astype(float))
    base_mae = float(np.mean(np.abs(base_pred - price_te)))
    skill = float(1 - mae / base_mae) if base_mae else 0.0

    # ---- calibrated prediction interval: P10–P90 quantile models + coverage ----
    cov_lo, cov_hi = [], []
    for alpha, store in [(0.1, cov_lo), (0.9, cov_hi)]:
        qm = HistGradientBoostingRegressor(loss="quantile", quantile=alpha,
                                           max_iter=120, max_depth=7, random_state=0)
        qm.fit(Xtr, ytr)
        store.append(qm.predict(Xte))
    lo, hi = cov_lo[0], cov_hi[0]
    coverage = float(np.mean((yte.to_numpy() >= lo) & (yte.to_numpy() <= hi)) * 100)

    pi = permutation_importance(model, Xte, yte, n_repeats=4, random_state=0, n_jobs=1)
    imp = sorted([{"feature": f, "importance": round(float(v), 4)}
                  for f, v in zip(feats, pi.importances_mean)],
                 key=lambda d: -d["importance"])
    # Log-log OLS of bookings vs fare across the booking horizon (statsmodels).
    # NB: this is the OBSERVED fare/volume gradient along the booking curve, not a
    # causal price elasticity — price and volume are both driven by days-left, so
    # the slope is confounded. We report it (and label it) as a descriptive
    # gradient and flag the caveat, rather than overclaiming a demand elasticity.
    import statsmodels.api as sm
    eco = df[df["class"] == "Economy"]
    el = eco.groupby("days_left").agg(price=("price", "mean"), q=("price", "size"))
    Xe = sm.add_constant(np.log(el["price"]))
    ols = sm.OLS(np.log(el["q"]), Xe).fit()
    gradient = float(ols.params.iloc[1])
    return {
        "r2": round(r2_test, 3),                       # out-of-sample (what the UI shows)
        "importance": imp,
        "reliability": {
            "test_r2": round(r2_test, 3),
            "train_r2": round(r2_train, 3),
            "mae_inr": round(mae, 0),
            "mape_pct": round(mape, 1),
            "baseline_mae_inr": round(base_mae, 0),
            "skill_score": round(skill, 3),
            "interval_coverage_pct": round(coverage, 1),
            "interval_nominal_pct": 80,
            "n_train": int(len(tr_idx)),
            "n_test": int(len(te_idx)),
            "split": "grouped by flight (no leakage)",
        },
        "elasticity": round(gradient, 2),  # kept key for the frontend
        "fare_volume_gradient": round(gradient, 2),
        "gradient_r2": round(float(ols.rsquared), 3),
        "elasticity_note": (
            "Observed fare/volume gradient (log-log OLS along the booking horizon). "
            "Descriptive, not a causal elasticity — price and volume both move with "
            "days-to-departure, so this is confounded by the booking curve."
        ),
    }


# ----------------------------------------------------------------------------
# 7. EMSR / LITTLEWOOD — exact fare-class seat protection (revenue management)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def emsr_protection():
    """
    The canonical airline revenue-management decision, solved EXACTLY (not learned).

    Two nested fare classes share one cabin: high-fare (Business) and low-fare
    (Economy). Economy demand is plentiful and books early; the question is how
    many seats to PROTECT for late, high-fare Business demand instead of selling
    them cheap now. Littlewood's rule gives the optimal protection level y*:

        P(Business demand > y*) = fare_low / fare_high

    The high/low FARE RATIO is taken straight from the data (~8x — real, and the
    whole reason protection pays). Premium DEMAND is an explicit, labelled
    assumption (fare listings aren't bookings, so we do NOT infer demand from row
    counts): premium demand ~ Normal with mean = 12% of the cabin, CV 0.4 —
    industry-typical for a domestic narrowbody. We then sweep the protection level
    to show the concave revenue curve peaking at the analytical optimum, and the
    uplift over a cabin that never protects a premium seat.

    This is the exact optimum the RL pricing agent only approximates.
    """
    from scipy.stats import norm

    df = analysis.load()
    fare_high = float(df[df["class"] == "Business"].price.mean())   # data-driven
    fare_low = float(df[df["class"] == "Economy"].price.mean())     # data-driven

    C = int(SEATS_NARROWBODY)                       # 180-seat narrowbody cabin
    premium_share = 0.12                            # assumed premium demand share (labelled)
    mu = premium_share * C                          # mean premium demand / departure
    cv = 0.4                                         # assumed demand variability (labelled)
    sigma = cv * mu

    ratio = fare_low / fare_high                     # Littlewood critical ratio
    # closed-form optimum: protect up to the (1 - ratio) quantile of premium demand
    y_star = float(norm.ppf(1 - ratio, loc=mu, scale=sigma))
    y_star = int(min(max(round(y_star), 0), C))

    def expected_min(p):                             # E[min(D_high, p)], D~N(mu,sigma)
        z = (p - mu) / sigma
        e_excess = (mu - p) * (1 - norm.cdf(z)) + sigma * norm.pdf(z)  # E[(D-p)+]
        return mu - e_excess

    def revenue(p):                                  # per-departure expected revenue
        return fare_low * (C - p) + fare_high * expected_min(p)

    curve = [{"protection": p, "revenue": round(revenue(p), 0)} for p in range(0, 61)]
    rev_opt = revenue(y_star)
    rev_naive = revenue(0)                            # FCFS: economy fills the cabin
    uplift = (rev_opt - rev_naive) / rev_naive * 100 if rev_naive else 0.0

    return {
        "fare_high": round(fare_high, 0),
        "fare_low": round(fare_low, 0),
        "fare_ratio": round(fare_high / fare_low, 1),
        "capacity": C,
        "mean_premium_demand": round(mu, 1),
        "sd_premium_demand": round(sigma, 1),
        "premium_share": premium_share,
        "cv": cv,
        "littlewood_ratio": round(ratio, 3),
        "protection_optimal": y_star,
        "booking_limit_economy": C - y_star,
        "curve": curve,
        "rev_optimal": round(rev_opt, 0),
        "rev_naive": round(rev_naive, 0),
        "uplift_pct": round(uplift, 1),
        "note": ("Fares are data-driven; premium demand is an assumption "
                 "(~12% of cabin, CV 0.4 — listings aren't bookings). Uplift is vs a "
                 "never-protect (FCFS) cabin — a deliberate worst-case baseline. "
                 "Protection itself is exact (Littlewood's rule)."),
    }


# ----------------------------------------------------------------------------
# 8. LP SHADOW PRICES — marginal value of fleet capacity (LP duality)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def fleet_shadow_prices(weekly_hours_per_aircraft=42):
    """
    The integer fleet program tells you WHAT to fly. Its LP relaxation tells you
    WHAT ONE MORE HOUR IS WORTH. We solve the continuous LP

        max  sum contrib_r * x_r
        s.t. sum block_hours_r * x_r <= H        (the fleet block-hour budget)
             1 <= x_r <= 20

    and read the DUAL of the budget constraint: the shadow price = the extra
    weekly contribution unlocked by one more block-hour of fleet capacity. Scale
    by a typical aircraft's weekly hours and you get the marginal value of one
    more aircraft — the exact 'should we lease another jet?' number a board wants.
    """
    from scipy.optimize import linprog

    rt = route_table()
    contrib = rt.contrib_per_flight.to_numpy()
    bh = rt.block_hours.to_numpy()
    R = len(rt)
    # Capacity must be SCARCE for a shadow price to mean anything. Flying every
    # route at the frequency cap needs ~sum(bh*20) hours; we set the budget below
    # that so the constraint binds and the dual is informative (the realistic case
    # — an airline never has spare aircraft sitting idle).
    H = float(round(0.55 * (bh * 20).sum(), -1))

    c = -contrib                                     # linprog minimises
    A_ub = bh.reshape(1, -1)
    b_ub = [H]
    bounds = [(1, 20)] * R
    res = linprog(c=c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

    # dual (marginal) of the block-hour budget; HiGHS returns it on ineqlin
    shadow = float(-res.ineqlin.marginals[0]) if res.success else 0.0  # ₹/block-hour
    hours_used = float(bh @ res.x) if res.success else 0.0
    binding = abs(hours_used - H) < 1e-3
    total_contrib = float(contrib @ res.x) if res.success else 0.0

    # routes pinned at the upper frequency cap want more service than allowed
    at_cap = [rt.iloc[i]["route"] for i in range(R)
              if res.success and res.x[i] > 19.999]

    # sweep H to show the (piecewise-linear) value-of-capacity curve: contribution
    # rises with capacity, then flattens once every route hits its frequency cap.
    h_lo = float((bh * 1).sum())                     # all routes at min service
    h_hi = float((bh * 20).sum())                    # all routes at the cap
    sweep = []
    for k in range(13):
        h = round(h_lo + (h_hi - h_lo) * k / 12, 0)
        r2 = linprog(c=c, A_ub=bh.reshape(1, -1), b_ub=[h], bounds=bounds, method="highs")
        sweep.append({"hours": round(h, 0),
                      "contrib_cr": round(float(contrib @ r2.x) / 1e7, 2) if r2.success else None})

    value_per_aircraft = shadow * weekly_hours_per_aircraft
    return {
        "block_hours": H,
        "total_contrib_cr": round(total_contrib / 1e7, 2),
        "hours_used": round(hours_used, 1),
        "budget_binding": bool(binding),
        "shadow_price_per_block_hour": round(shadow, 0),
        "assumed_aircraft_weekly_hours": weekly_hours_per_aircraft,
        "value_per_aircraft_cr": round(value_per_aircraft / 1e7, 2),
        "routes_at_cap": at_cap,
        "sweep": sweep,
        "note": ("Shadow price = dual of the block-hour budget in the LP relaxation: "
                 "the marginal weekly contribution of one more hour of fleet capacity. "
                 "Binding budget => every freed hour is worth exactly this much."),
    }


# ----------------------------------------------------------------------------
# 9. DEA — Data Envelopment Analysis: route efficiency as an LP (one per route)
# ----------------------------------------------------------------------------
@lru_cache(maxsize=1)
def dea_efficiency():
    """
    Turns the Efficiency Frontier from a ratio into a RIGOROUS LP score. Each
    route is a decision-making unit consuming an input (fuel per seat) to produce
    outputs (revenue per seat, passenger volume). The input-oriented CCR model
    solves, for every route o, one LP:

        min  theta
        s.t. sum_j lambda_j * input_j   <= theta * input_o
             sum_j lambda_j * output_rj >= output_ro   (each output r)
             lambda_j >= 0

    theta in (0,1]: 1.0 = on the efficiency frontier; 0.8 = could deliver the same
    revenue & volume on 80% of the fuel. We also return each route's PEERS (the
    benchmark routes it's measured against) and its fuel target.
    """
    from scipy.optimize import linprog

    rt = route_table().copy()
    rt["rev_per_seat"] = rt.avg_price                  # output 1
    inp = rt.fuel_kg_per_seat.to_numpy(dtype=float)    # input
    out1 = rt.rev_per_seat.to_numpy(dtype=float)       # output: revenue/seat
    out2 = rt.volume.to_numpy(dtype=float)             # output: passengers served
    R = len(rt)

    results = []
    for o in range(R):
        # variables: [theta, lambda_1..lambda_R]; minimise theta
        c = np.zeros(R + 1); c[0] = 1.0
        A_ub, b_ub = [], []
        # input:  sum lambda_j inp_j - theta*inp_o <= 0
        row = np.zeros(R + 1); row[0] = -inp[o]; row[1:] = inp
        A_ub.append(row); b_ub.append(0.0)
        # outputs: -(sum lambda_j out_j) <= -out_o
        for out in (out1, out2):
            row = np.zeros(R + 1); row[1:] = -out
            A_ub.append(row); b_ub.append(-out[o])
        bounds = [(0, None)] * (R + 1)
        res = linprog(c=c, A_ub=np.array(A_ub), b_ub=np.array(b_ub), bounds=bounds, method="highs")
        theta = float(res.x[0]) if res.success else 1.0
        lam = res.x[1:] if res.success else np.zeros(R)
        peers = sorted(
            [{"route": rt.iloc[j]["route"], "weight": round(float(lam[j]), 2)}
             for j in range(R) if lam[j] > 1e-4 and j != o],
            key=lambda d: -d["weight"])[:3]
        results.append({
            "route": rt.iloc[o]["route"],
            "src": rt.iloc[o]["source_city"],
            "dst": rt.iloc[o]["destination_city"],
            "efficiency": round(theta, 3),
            "fuel_kg_per_seat": round(float(inp[o]), 1),
            "target_fuel_kg_per_seat": round(float(theta * inp[o]), 1),
            "fuel_savings_pct": round((1 - theta) * 100, 1),
            "rev_per_seat": round(float(out1[o]), 0),
            "volume": int(out2[o]),
            "on_frontier": theta > 0.999,
            "peers": peers,
        })

    results.sort(key=lambda d: -d["efficiency"])
    effs = [r["efficiency"] for r in results]
    return {
        "inputs": ["fuel_kg_per_seat"],
        "outputs": ["rev_per_seat", "volume"],
        "n_routes": R,
        "n_efficient": int(sum(1 for r in results if r["on_frontier"])),
        "mean_efficiency": round(float(np.mean(effs)), 3),
        "routes": results,
        "note": ("Input-oriented CCR DEA, one LP per route. Efficiency 1.0 = on the "
                 "frontier; below 1.0 = same revenue & volume achievable on less fuel. "
                 "Peers are the benchmark routes defining each target."),
    }


if __name__ == "__main__":
    import json, time
    for name, fn in [("monte_carlo", lambda: monte_carlo_fuel()),
                     ("pricing", lambda: optimize_pricing()),
                     ("fleet", lambda: fleet_milp()),
                     ("ml", lambda: ml_demand()),
                     ("emsr", lambda: emsr_protection()),
                     ("shadow", lambda: fleet_shadow_prices()),
                     ("dea", lambda: dea_efficiency())]:
        t = time.time()
        out = fn()
        keys = list(out.keys())
        print(f"{name:12s} {time.time()-t:5.1f}s  keys={keys}")
    t = time.time(); p = nsga2_pareto(); print(f"nsga2        {time.time()-t:5.1f}s  frames={p['n_frames']} knee={p['knee']}")
    t = time.time(); r = rl_pricing(); print(f"rl           {time.time()-t:5.1f}s  frames={r['n_frames']} final[0]={r['final_policy'][0]}")
