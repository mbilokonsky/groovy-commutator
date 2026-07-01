"""Meta-evolution over COUPLED PAIRS: lineages that hand off to two-layer
pre-hoc systems instead of single elementary rules.

The bridge NOTES.md section 7 flagged as unexplored: metaevolution.lineage
searches 8-bit rule space (256 points) and reliably locks into small
cycles within ~2-11 generations (established, see the questions page). The
prehoc decomposition makes a much bigger, structured space available -- a
coupled two-layer system is four component rules (32 bits). Same lineage
protocol, lifted:

  system    = two layers (A, B), each stepped by a 4-input rule whose x is
              the other layer (prehoc.coupled_trajectory)
  generator = derive the four child component rules from the current
              layers (8-bit samples of A, B, A XOR B, absential(A) --
              the d_sample construction from the single-rule comparison)
  handoff   = classify_regime on the disagreement between the old-tables
              and new-tables unfoldings of layer A from the shared
              current layers (the divergence construction, lifted)
  adopt     = replace tables, evolve one step, repeat
  lock-in   = trailing cycle in the 4-byte table sequence

Question: does the lineage still find stable platforms, and how does
time-to-cycle compare to the single-rule case (mean ~10 for the richest
single-rule generators, lock-in 95-100% within a 40-generation budget)?

Output:
    results/metaevolution_pairs.csv
    site/src/data/metaevolution_pairs.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.metrics import absential_field, divergence_stats  # noqa: E402
from groovy.classify import classify_regime  # noqa: E402
from groovy import prehoc  # noqa: E402

N = 64
STEPS = 80
MAX_GENERATIONS = 60
SEEDS = 40
CYCLE_WINDOW = 8


def sample_byte(arr: np.ndarray) -> int:
    idx = np.linspace(0, len(arr) - 1, 8).astype(int)
    return int(sum(int(b) << i for i, b in enumerate(arr[idx])))


def child_tables(layer_a: np.ndarray, layer_b: np.ndarray) -> tuple[int, int]:
    a0 = sample_byte(layer_a)
    a1 = sample_byte(layer_b)
    b0 = sample_byte(np.bitwise_xor(layer_a, layer_b))
    b1 = sample_byte(absential_field(layer_a))
    return prehoc.rule4_from_pair(a0, a1), prehoc.rule4_from_pair(b0, b1)


def coupled_divergence(a0s: np.ndarray, b0s: np.ndarray,
                       old: tuple[int, int], new: tuple[int, int],
                       steps: int) -> np.ndarray:
    """Disagreement field on layer A between the old-tables and new-tables
    unfoldings of the same starting layers."""
    old_run = prehoc.coupled_trajectory(a0s, b0s, old[0], old[1], steps)
    new_run = prehoc.coupled_trajectory(a0s, b0s, new[0], new[1], steps)
    return np.bitwise_xor(old_run["a"], new_run["a"])


def trailing_cycle_period(seq: list[tuple[int, int]], window: int) -> int | None:
    tail = seq[-window:]
    for period in range(1, len(tail) // 2 + 1):
        if tail[-period:] == tail[-2 * period:-period]:
            return period
    return None


def pair_lineage(seed: int) -> dict:
    rng = np.random.default_rng(seed)
    layer_a = rng.integers(0, 2, N).astype(np.uint8)
    layer_b = rng.integers(0, 2, N).astype(np.uint8)
    tables = (prehoc.rule4_from_pair(90, 90), prehoc.rule4_from_pair(90, 90))
    seq = [tables]
    regimes = []
    for gen in range(MAX_GENERATIONS):
        new_tables = child_tables(layer_a, layer_b)
        field = coupled_divergence(layer_a, layer_b, tables, new_tables, STEPS)
        stats = divergence_stats(field)
        regimes.append(classify_regime(stats))
        seq.append(new_tables)
        period = trailing_cycle_period(seq, CYCLE_WINDOW)
        if period is not None:
            return dict(seed=seed, locked_in=True, generations=gen + 1,
                        cycle_period=period, regimes=regimes)
        tables = new_tables
        # coupled_trajectory records states before each step, so with
        # steps=2 the second row is the layers advanced by exactly one step
        adv = prehoc.coupled_trajectory(layer_a, layer_b, tables[0], tables[1], 2)
        layer_a, layer_b = adv["a"][1], adv["b"][1]
    return dict(seed=seed, locked_in=False, generations=MAX_GENERATIONS,
                cycle_period=None, regimes=regimes)


def main() -> None:
    rows = [pair_lineage(seed) for seed in range(SEEDS)]
    df = pd.DataFrame([{k: v for k, v in r.items() if k != "regimes"} for r in rows])
    df.to_csv(ROOT / "results" / "metaevolution_pairs.csv", index=False)

    locked = df[df.locked_in]
    regime_counts: dict[str, int] = {}
    for r in rows:
        for reg in r["regimes"]:
            regime_counts[reg] = regime_counts.get(reg, 0) + 1

    site_json = dict(
        n=N, steps=STEPS, max_generations=MAX_GENERATIONS, seeds=SEEDS,
        lockin_rate=round(float(df.locked_in.mean()), 4),
        mean_generations_locked=round(float(locked.generations.mean()), 2) if len(locked) else None,
        median_generations_locked=float(locked.generations.median()) if len(locked) else None,
        cycle_periods={str(int(p)): int((locked.cycle_period == p).sum())
                       for p in sorted(locked.cycle_period.dropna().unique())} if len(locked) else {},
        handoff_regime_counts=regime_counts,
    )
    (ROOT / "site" / "src" / "data" / "metaevolution_pairs.json").write_text(
        json.dumps(site_json, indent=1))

    print(f"lock-in rate: {site_json['lockin_rate']:.0%}")
    print(f"generations to lock (locked runs): mean {site_json['mean_generations_locked']} "
          f"median {site_json['median_generations_locked']}")
    print(f"cycle periods: {site_json['cycle_periods']}")
    print(f"handoff regimes: {regime_counts}")


if __name__ == "__main__":
    main()
