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

WOLFRAM_CLASS = {
    0: "I", 250: "I",
    4: "II", 108: "II", 184: "II", 232: "II",
    18: "III", 30: "III", 126: "III",
    54: "IV", 110: "IV",
}


def sweep(rules: dict[int, str] | None = None, n: int = 100, steps: int = 100,
          seeds: tuple[int, ...] = (11,)) -> list[dict]:
    """Run divergence_stats for every unordered pair of rule keys in `rules`,
    averaged over `seeds`. Pass rules=None to use WOLFRAM_CLASS; pass
    rules={i: None for i in range(256)} for the full unlabeled sweep.

    NEXT STEP (open task, see CLAUDE.md): the full 256-rule sweep with
    several seeds. ~32,640 unordered pairs; each pair is cheap (the
    vectorized apply_rule makes this fast), but do batch / checkpoint to
    results/ rather than holding everything in memory if you add more seeds
    or a finer-grained metric set.
    """
    if rules is None:
        rules = WOLFRAM_CLASS
    results = []
    for a, b in combinations(rules.keys(), 2):
        per_seed = []
        for seed in seeds:
            rng = np.random.default_rng(seed)
            s0 = random_state(n, rng)
            field = divergence_trajectory(s0, a, b, steps)
            per_seed.append(divergence_stats(field))
        agg = {k: float(np.mean([r[k] for r in per_seed]))
               for k in ("final", "peak", "compressibility", "mean")}
        agg["drained"] = bool(np.mean([r["drained"] for r in per_seed]) > 0.5)
        agg.update(rule_a=a, rule_b=b, class_a=rules[a], class_b=rules[b])
        results.append(agg)
    return results
