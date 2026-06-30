"""Canonical (textbook) Wolfram-class labels for a starter set of elementary
CA rules, plus a sweep utility for running divergence_stats over many pairs.

The class labels below are the informal, commonly-cited textbook assignments.
Wolfram's own classification was never made fully rigorous -- treat these as
a reasonable starting reference set, not ground truth. The pilot sweep run
with these 11 rules (1 seed/pair) found: presence of a Class III rule in a
pair predicts noise-like divergence almost regardless of its partner;
Class II-II pairs are the most structured/placid; see NOTES.md for the full
writeup and a counterexample showing image_ratio alone does NOT fully
predict the "drain" regime.
"""
from __future__ import annotations
from itertools import combinations
import numpy as np
from .ca import random_state
from .operators import divergence_trajectory
from .metrics import divergence_stats

# Provisional regime thresholds for classify_regime -- read off the
# qualitative descriptions in NOTES.md section 4 (compressibility ~1.0 =
# noisy, well below 1.0 = structured, near-0 = trivial/flat), not yet
# validated against the full 256-rule sweep's actual distribution. Revisit
# once results/sweep_full_classified.parquet exists and the bucket sizes
# / compressibility histogram can be sanity-checked.
CRYSTALLINE_COMPRESSIBILITY = 0.10
NOISY_COMPRESSIBILITY = 0.85

WOLFRAM_CLASS = {
    0: "I", 250: "I",
    4: "II", 108: "II", 184: "II", 232: "II",
    18: "III", 30: "III", 126: "III",
    54: "IV", 110: "IV",
}


def classify_regime(stats: dict) -> str:
    """Bucket a divergence_stats(...) result into one of the five empirical
    pair regimes from NOTES.md section 4: commute / crystalline / noisy /
    structured / drain. See CRYSTALLINE_COMPRESSIBILITY / NOISY_COMPRESSIBILITY
    above for the (provisional) cut points."""
    if stats["drained"]:
        return "drain"
    if stats["final"] == 0 and stats["peak"] == 0:
        return "commute"
    if stats["compressibility"] < CRYSTALLINE_COMPRESSIBILITY:
        return "crystalline"
    if stats["compressibility"] > NOISY_COMPRESSIBILITY:
        return "noisy"
    return "structured"


def sweep_pair(a: int, b: int, n: int = 100, steps: int = 100,
               seeds: tuple[int, ...] = (11,)) -> dict:
    """Run divergence_stats for a single unordered rule pair (a, b),
    averaged over `seeds`. Pure function of its arguments (no shared
    state) so it's safe to call from a multiprocessing worker -- this is
    the per-pair unit of work the full sweep parallelizes over, see
    scripts/run_full_sweep.py.
    """
    per_seed = []
    for seed in seeds:
        rng = np.random.default_rng(seed)
        s0 = random_state(n, rng)
        field = divergence_trajectory(s0, a, b, steps)
        per_seed.append(divergence_stats(field))
    agg = {k: float(np.mean([r[k] for r in per_seed]))
           for k in ("final", "peak", "compressibility", "mean")}
    agg["drained"] = bool(np.mean([r["drained"] for r in per_seed]) > 0.5)
    agg.update(rule_a=a, rule_b=b)
    return agg


def sweep(rules: dict[int, str] | None = None, n: int = 100, steps: int = 100,
          seeds: tuple[int, ...] = (11,)) -> list[dict]:
    """Run sweep_pair for every unordered pair of rule keys in `rules`.
    Pass rules=None to use WOLFRAM_CLASS; pass
    rules={i: None for i in range(256)} for the full unlabeled sweep --
    for that scale, prefer scripts/run_full_sweep.py instead (this
    function is serial and unchecked, fine for small/pilot sweeps only).
    """
    if rules is None:
        rules = WOLFRAM_CLASS
    results = []
    for a, b in combinations(rules.keys(), 2):
        agg = sweep_pair(a, b, n=n, steps=steps, seeds=seeds)
        agg.update(class_a=rules[a], class_b=rules[b])
        results.append(agg)
    return results
