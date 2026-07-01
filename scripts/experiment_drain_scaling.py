"""Ring-size scaling of the drain/convergence predictor.

The drain-mechanism result (CLAUDE.md result 5) computes the pair's
eventual image and attractor overlap exhaustively at n=12 and predicts
convergence at the sweep's n=100, with AUC ~0.91. The residual error was
*attributed* to ring-size mismatch (attractor structure depends on n) but
that attribution was never tested. This script tests it: compute the same
two structural numbers at n = 8, 10, 12, 14 on a fixed sample of pairs and
watch how the AUC and the operating point move with n.

If the predictor keeps improving with n, the residual is scale mismatch
and the mechanism story is clean. If it plateaus, something other than
ring size limits predictability (e.g. seed sampling in the ground truth,
or genuine sensitivity to initial conditions).

Sample: ALL converged pairs (final = 0 with peak > 0 in the sweep) plus a
random sample of non-converged pairs, so the expensive n=14 pass stays
tractable while the AUC estimate stays honest.

Output: site/src/data/drain_scaling.json (compact, feeds one paragraph +
mini-table on the questions page's drain card).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

NS = [8, 10, 12, 14]
ROUNDS = 48          # generous; dedup makes extra rounds nearly free
N_NEG_SAMPLE = 6000
RNG = np.random.default_rng(0)


def rule_lut(rule_num: int) -> np.ndarray:
    return np.array([(rule_num >> i) & 1 for i in range(8)], dtype=np.uint8)


def apply_rule_batch(states: np.ndarray, lut: np.ndarray) -> np.ndarray:
    l = np.roll(states, 1, axis=1)
    r = np.roll(states, -1, axis=1)
    return lut[4 * l + 2 * states + r]


def make_space(n: int):
    ints = np.arange(2 ** n, dtype=np.uint32)
    states = ((ints[:, None] >> np.arange(n, dtype=np.uint32)[None, :]) & 1).astype(np.uint8)
    pow2 = (1 << np.arange(n, dtype=np.uint64))
    return states, pow2


def eventual_image_keys(lut_first, lut_second, seed_states, pow2, n):
    states = seed_states
    for _ in range(ROUNDS):
        states = apply_rule_batch(apply_rule_batch(states, lut_first), lut_second)
        keys = np.unique((states.astype(np.uint64) * pow2[None, :]).sum(axis=1))
        if len(keys) == len(states):
            return keys
        ints = keys.astype(np.uint32)
        states = ((ints[:, None] >> np.arange(n, dtype=np.uint32)[None, :]) & 1).astype(np.uint8)
    return np.unique((states.astype(np.uint64) * pow2[None, :]).sum(axis=1))


def mann_whitney_auc(pos: np.ndarray, neg: np.ndarray) -> float:
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
    u = ranks[: len(pos)].sum() - len(pos) * (len(pos) + 1) / 2.0
    return u / (len(pos) * len(neg))


def main() -> None:
    sweep = pd.read_parquet(ROOT / "results" / "sweep_full_classified.parquet")
    converged = (sweep["final"] == 0.0) & (sweep["peak"] > 0.0)
    pos = sweep[converged]
    neg = sweep[~converged].sample(N_NEG_SAMPLE, random_state=0)
    sample = pd.concat([pos, neg], ignore_index=True)
    y = np.concatenate([np.ones(len(pos), dtype=bool), np.zeros(len(neg), dtype=bool)])
    print(f"sample: {len(pos)} converged + {len(neg)} non-converged")

    luts = {r: rule_lut(r) for r in range(256)}
    pairs = sample[["rule_a", "rule_b"]].to_numpy()

    results = {}
    for n in NS:
        seed_states, pow2 = make_space(n)
        im = np.empty(len(pairs), dtype=np.int64)
        jac = np.empty(len(pairs), dtype=np.float64)
        for i, (a, b) in enumerate(pairs):
            la, lb = luts[int(a)], luts[int(b)]
            k1 = eventual_image_keys(la, lb, seed_states, pow2, n)
            k2 = eventual_image_keys(lb, la, seed_states, pow2, n)
            inter = len(np.intersect1d(k1, k2, assume_unique=True))
            union = len(k1) + len(k2) - inter
            im[i] = max(len(k1), len(k2))
            jac[i] = inter / union if union else 1.0
            if i % 2000 == 0:
                print(f"n={n}: {i}/{len(pairs)}", flush=True)
        score = -np.log2(im.astype(float))
        auc = mann_whitney_auc(score[y], score[~y])
        # best simple two-factor operating point at this n
        best = None
        for t in [2, 4, 8, 16, 32, 64]:
            for jmin in [0.5, 0.75, 0.9, 0.999]:
                pred = (im <= t) & (jac >= jmin)
                tp = int((pred & y).sum()); fp = int((pred & ~y).sum()); fn = int((~pred & y).sum())
                prec = tp / (tp + fp) if tp + fp else 0.0
                rec = tp / (tp + fn) if tp + fn else 0.0
                f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
                if best is None or f1 > best["f1"]:
                    best = dict(max_image=t, min_jaccard=jmin, precision=round(prec, 3),
                                recall=round(rec, 3), f1=round(f1, 3))
        results[n] = dict(auc_image=round(float(auc), 4), best=best)
        print(f"n={n}: AUC={auc:.4f} best={best}")

    site_json = dict(
        rounds=ROUNDS, n_pos=int(len(pos)), n_neg=int(len(neg)),
        note="AUC is on this sample (all converged + random non-converged), "
             "not the full 32,640 pairs, so n=12 here differs slightly from "
             "the headline full-sweep number.",
        by_n=[dict(n=n, **results[n]) for n in NS],
    )
    (ROOT / "site" / "src" / "data" / "drain_scaling.json").write_text(
        json.dumps(site_json, indent=1))
    print(json.dumps(site_json["by_n"], indent=1))


if __name__ == "__main__":
    main()
