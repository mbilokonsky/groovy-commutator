"""Drain-predictor experiment: what structurally predicts the drain regime,
given that single-rule image_ratio (established negative, see CLAUDE.md)
does not?

Hypothesis tested here, two factors, both properties of the PAIR:

1. Joint collapse. Take the round map of the divergence construction,
   M1 = phi_b . phi_a (one full round of path1) and M2 = phi_a . phi_b
   (path2), and push the ENTIRE n-bit state space through each repeatedly,
   deduplicating between rounds. The image shrinks monotonically until it
   stabilizes on the set of states lying on eventual cycles. Call
   |M^k({0,1}^n)| the pair's eventual image -- how much room the composed
   dynamics leaves for trajectories to stay distinguishable.

2. Shared attractor. Drain means the two orderings converge to the SAME
   trajectory, so their eventual images must overlap; crystalline pairs
   also collapse hard but into DISJOINT (constant-offset) attractors.
   Measured as Jaccard overlap of the two eventual-image sets.

Commuting pairs are carved out first by the exact test (one step of
phi_a.phi_b vs phi_b.phi_a over all 2^n states -- exhaustive at n=12).

Output:
    results/drain_predictor.parquet    -- per-pair metrics + regime
    site/src/data/drain_predictor.json -- compact per-regime distributions
                                          + headline numbers for the live
                                          chart on the questions page

n=12 (4096 states, exhaustive) and up to k=32 rounds; dedup makes the whole
32,640-pair sweep run in a few minutes single-process.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

N = 12
ROUNDS = 32
POW2 = (1 << np.arange(N, dtype=np.uint64))


def rule_lut(rule_num: int) -> np.ndarray:
    return np.array([(rule_num >> i) & 1 for i in range(8)], dtype=np.uint8)


def apply_rule_batch(states: np.ndarray, lut: np.ndarray) -> np.ndarray:
    """Vectorized elementary-CA step over a (m, n) batch of states."""
    l = np.roll(states, 1, axis=1)
    r = np.roll(states, -1, axis=1)
    return lut[4 * l + 2 * states + r]


def all_states(n: int) -> np.ndarray:
    ints = np.arange(2 ** n, dtype=np.uint32)
    return ((ints[:, None] >> np.arange(n, dtype=np.uint32)[None, :]) & 1).astype(np.uint8)


def state_keys(states: np.ndarray) -> np.ndarray:
    return (states.astype(np.uint64) * POW2[None, :]).sum(axis=1)


def eventual_image_keys(lut_first: np.ndarray, lut_second: np.ndarray,
                        seed_states: np.ndarray) -> np.ndarray:
    """Sorted integer keys of (lut_second . lut_first)^k applied to the full
    state space, iterated (with dedup) until the image stops shrinking or
    ROUNDS is hit."""
    states = seed_states
    for _ in range(ROUNDS):
        states = apply_rule_batch(apply_rule_batch(states, lut_first), lut_second)
        keys = np.unique(state_keys(states))
        if len(keys) == len(states):
            return keys
        ints = keys.astype(np.uint32)
        states = ((ints[:, None] >> np.arange(N, dtype=np.uint32)[None, :]) & 1).astype(np.uint8)
    return np.unique(state_keys(states))


def mann_whitney_auc(pos: np.ndarray, neg: np.ndarray) -> float:
    """AUC of 'score separates pos from neg', rank-based (ties handled)."""
    scores = np.concatenate([pos, neg])
    order = scores.argsort(kind="mergesort")
    ranks = np.empty(len(scores))
    ranks[order] = np.arange(1, len(scores) + 1)
    s_sorted = scores[order]
    i = 0
    while i < len(s_sorted):
        j = i
        while j + 1 < len(s_sorted) and s_sorted[j + 1] == s_sorted[i]:
            j += 1
        if j > i:
            ranks[order[i:j + 1]] = (i + 1 + j + 1) / 2.0
        i = j + 1
    r_pos = ranks[: len(pos)].sum()
    u = r_pos - len(pos) * (len(pos) + 1) / 2.0
    return u / (len(pos) * len(neg))


def compute(sweep: pd.DataFrame) -> pd.DataFrame:
    """The expensive pass: per-pair structural metrics over all 32,640 pairs.
    Cached in results/drain_predictor.parquet; delete that file to recompute."""
    luts = {r: rule_lut(r) for r in range(256)}
    seed_states = all_states(N)

    m = len(sweep)
    im_count = np.empty(m, dtype=np.int64)
    jaccard = np.empty(m, dtype=np.float64)
    exact_commute = np.empty(m, dtype=bool)

    pairs = sweep[["rule_a", "rule_b"]].to_numpy()
    for i, (a, b) in enumerate(pairs):
        la, lb = luts[int(a)], luts[int(b)]
        ab = state_keys(apply_rule_batch(apply_rule_batch(seed_states, la), lb))
        ba = state_keys(apply_rule_batch(apply_rule_batch(seed_states, lb), la))
        exact_commute[i] = bool(np.array_equal(ab, ba))
        k1 = eventual_image_keys(la, lb, seed_states)
        k2 = eventual_image_keys(lb, la, seed_states)
        inter = len(np.intersect1d(k1, k2, assume_unique=True))
        union = len(k1) + len(k2) - inter
        im_count[i] = max(len(k1), len(k2))
        jaccard[i] = inter / union if union else 1.0
        if i % 2000 == 0:
            print(f"{i}/{m} pairs done", flush=True)

    out = sweep[["rule_a", "rule_b", "regime", "image_ratio_a", "image_ratio_b"]].copy()
    out["pair_image_count"] = im_count
    out["pair_image_frac"] = im_count / float(2 ** N)
    out["attractor_jaccard"] = jaccard
    out["exact_commute_n12"] = exact_commute
    out["min_image_ratio"] = np.minimum(out["image_ratio_a"], out["image_ratio_b"])
    out.to_parquet(ROOT / "results" / "drain_predictor.parquet", index=False)
    return out


def main() -> None:
    sweep = pd.read_parquet(ROOT / "results" / "sweep_full_classified.parquet")
    cache = ROOT / "results" / "drain_predictor.parquet"
    if cache.exists():
        print(f"reusing cached {cache}")
        out = pd.read_parquet(cache)
    else:
        out = compute(sweep)

    df = out.merge(sweep[["rule_a", "rule_b", "final", "peak"]], on=["rule_a", "rule_b"])

    # ---- analysis ----------------------------------------------------------
    # First finding (came out of running this, not the original hypothesis):
    # the sweep's "drain" label conflates two populations. Ground truth for
    # the mechanism question is CONVERGENCE -- the two orderings end up on
    # the literally identical trajectory (final disagreement 0) after having
    # actually disagreed (peak > 0; peak == 0 is commute).
    converged = ((df["final"] == 0.0) & (df["peak"] > 0.0)).to_numpy()
    is_drain_label = (df["regime"] == "drain").to_numpy()
    conv_labeled_drain = int((converged & is_drain_label).sum())
    conv_labeled_cryst = int((converged & (df["regime"] == "crystalline")).sum())
    soft_drain = is_drain_label & ~converged
    median_final_soft = float(df.loc[soft_drain, "final"].median())

    im_count = df["pair_image_count"].to_numpy()
    jaccard = df["attractor_jaccard"].to_numpy()
    exact_commute = df["exact_commute_n12"].to_numpy()

    # AUCs, converged vs everything else (higher score = more convergence-like)
    score_pair = -np.log2(im_count.astype(float))
    score_base = -df["min_image_ratio"].to_numpy()
    score_two = jaccard * (1.0 - df["pair_image_frac"].to_numpy())
    auc_pair = mann_whitney_auc(score_pair[converged], score_pair[~converged])
    auc_base = mann_whitney_auc(score_base[converged], score_base[~converged])
    auc_two = mann_whitney_auc(score_two[converged], score_two[~converged])

    # operating point for the two-factor rule:
    # predicted convergence := not exact-commuting AND image <= T AND jaccard >= J
    best = None
    for t in [2, 4, 8, 16, 32, 64, 128]:
        for j in [0.25, 0.5, 0.75, 0.9, 0.999]:
            pred = (~exact_commute) & (im_count <= t) & (jaccard >= j)
            tp = int((pred & converged).sum())
            fp = int((pred & ~converged).sum())
            fn = int((~pred & converged).sum())
            prec = tp / (tp + fp) if tp + fp else 0.0
            rec = tp / (tp + fn) if tp + fn else 0.0
            f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
            if best is None or f1 > best["f1"]:
                best = dict(max_image=t, min_jaccard=j,
                            precision=round(prec, 4), recall=round(rec, 4), f1=round(f1, 4))

    # medians for the site's summary table: converged vs the label-based slices
    def med_of(mask: np.ndarray) -> dict:
        return dict(pair_image_count=float(np.median(im_count[mask])),
                    attractor_jaccard=round(float(np.median(jaccard[mask])), 3),
                    count=int(mask.sum()))

    medians = dict(
        converged=med_of(converged),
        soft_drain_label=med_of(soft_drain),
        crystalline_not_converged=med_of((df["regime"] == "crystalline").to_numpy() & ~converged),
        noisy=med_of((df["regime"] == "noisy").to_numpy()),
        structured=med_of((df["regime"] == "structured").to_numpy()),
        commute=med_of((df["regime"] == "commute").to_numpy()),
    )

    # scatter sample for the live chart: log2(image) x jaccard, colored by
    # converged / crystalline-not-converged / everything else
    rng = np.random.default_rng(0)
    # commute pairs are excluded from "other": the predictor carves them out
    # first with the exact-commutation test, and their (large image, jaccard 1)
    # points would visually muddy the top of the chart for no analytical gain
    groups = dict(
        converged=converged,
        crystalline=(df["regime"] == "crystalline").to_numpy() & ~converged,
        other=~converged & ~df["regime"].isin(["crystalline", "commute"]).to_numpy(),
    )
    scatter = {}
    for name, mask in groups.items():
        idx = np.flatnonzero(mask)
        take = rng.choice(idx, size=min(400, len(idx)), replace=False)
        scatter[name] = [
            [round(float(np.log2(im_count[i])), 2), round(float(jaccard[i]), 3)]
            for i in take
        ]

    def lookup(a: int, b: int) -> dict:
        lo, hi = min(a, b), max(a, b)
        row = df[(df.rule_a == lo) & (df.rule_b == hi)]
        if len(row) == 0:
            row = df[(df.rule_a == hi) & (df.rule_b == lo)]
        r = row.iloc[0]
        return dict(a=a, b=b, regime=str(r.regime), final=float(r.final),
                    pair_image_count=int(r.pair_image_count),
                    jaccard=round(float(r.attractor_jaccard), 3),
                    min_image_ratio=round(float(r.min_image_ratio), 4))

    counterexample = [lookup(4, 30), lookup(4, 126), lookup(4, 54), lookup(4, 18)]

    site_json = dict(
        n=N, rounds=ROUNDS,
        n_converged=int(converged.sum()),
        converged_labeled_drain=conv_labeled_drain,
        converged_labeled_crystalline=conv_labeled_cryst,
        n_soft_drain_label=int(soft_drain.sum()),
        median_final_soft_drain=round(median_final_soft, 3),
        medians=medians,
        scatter=scatter,
        auc_two_factor=round(auc_two, 4),
        auc_pair_image=round(auc_pair, 4),
        auc_min_image_ratio=round(auc_base, 4),
        best_rule=best,
        counterexample=counterexample,
    )
    site_data = ROOT / "site" / "src" / "data"
    site_data.mkdir(parents=True, exist_ok=True)
    (site_data / "drain_predictor.json").write_text(json.dumps(site_json, indent=1))

    print(f"\nconverged pairs (final=0, peak>0): {int(converged.sum())} "
          f"({conv_labeled_drain} labeled drain + {conv_labeled_cryst} hiding in crystalline)")
    print(f"soft 'drain' label, never converges: {int(soft_drain.sum())} "
          f"(median final disagreement {median_final_soft:.3f})")
    print("\nAUC (converged vs rest):")
    print(f"  -log2(pair_image_count):           {auc_pair:.4f}")
    print(f"  two-factor jaccard*(1-image_frac): {auc_two:.4f}")
    print(f"  -min(image_ratio) [old baseline]:  {auc_base:.4f}")
    print(f"best two-factor rule: {best}")
    print("\nmedians:", json.dumps(medians, indent=1))
    print("\ncounterexample block:")
    for c in counterexample:
        print(f"  4 vs {c['b']}: regime={c['regime']} image={c['pair_image_count']} jaccard={c['jaccard']}")


if __name__ == "__main__":
    main()
