"""Full exhaustive sweep: all 256 elementary CA rules, all 32,640 unordered
pairs, multiple seeds each -- the open task in CLAUDE.md.

Parallelized with multiprocessing across rule pairs (the work is a pure
numerical computation with no per-pair judgment calls, so plain process
parallelism is the right tool -- no need for anything fancier). Writes
incremental checkpoints to results/ so a crash or interrupt doesn't lose
hours of compute; rerun the script and it resumes from the last checkpoint.

Usage:
    .venv/Scripts/python.exe scripts/run_full_sweep.py
    .venv/Scripts/python.exe scripts/run_full_sweep.py --workers 8 --seeds 1 2 3
"""
from __future__ import annotations
import argparse
import time
from itertools import combinations
from multiprocessing import Pool
from pathlib import Path

import pandas as pd

from groovy.classify import sweep_pair

RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
OUT_PATH = RESULTS_DIR / "sweep_full.parquet"
CHECKPOINT_EVERY = 1000  # pairs


def _worker(args: tuple[int, int, int, int, tuple[int, ...]]) -> dict:
    a, b, n, steps, seeds = args
    return sweep_pair(a, b, n=n, steps=steps, seeds=seeds)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n", type=int, default=100, help="lattice size")
    parser.add_argument("--steps", type=int, default=100, help="trajectory length")
    parser.add_argument("--seeds", type=int, nargs="+", default=[1, 2, 3, 4, 5])
    parser.add_argument("--workers", type=int, default=14,
                         help="multiprocessing workers (default leaves a couple cores free)")
    parser.add_argument("--rule-max", type=int, default=256,
                         help="sweep rules [0, rule_max) -- useful for a quick subset test")
    args = parser.parse_args()

    seeds = tuple(args.seeds)
    pairs = list(combinations(range(args.rule_max), 2))

    done_pairs = set()
    rows = []
    if OUT_PATH.exists():
        existing = pd.read_parquet(OUT_PATH)
        rows = existing.to_dict("records")
        done_pairs = {(int(r["rule_a"]), int(r["rule_b"])) for r in rows}
        print(f"resuming: {len(done_pairs)} pairs already in {OUT_PATH}")

    todo = [(a, b, args.n, args.steps, seeds) for a, b in pairs if (a, b) not in done_pairs]
    total = len(pairs)
    print(f"{len(todo)} of {total} pairs remaining "
          f"(n={args.n}, steps={args.steps}, seeds={seeds}, workers={args.workers})")

    if not todo:
        print("nothing to do")
        return

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    since_checkpoint = 0

    with Pool(processes=args.workers) as pool:
        for result in pool.imap_unordered(_worker, todo, chunksize=64):
            rows.append(result)
            since_checkpoint += 1
            if since_checkpoint >= CHECKPOINT_EVERY:
                pd.DataFrame(rows).to_parquet(OUT_PATH, index=False)
                since_checkpoint = 0
                elapsed = time.time() - t0
                rate = len(rows) / elapsed if elapsed else 0
                print(f"{len(rows)}/{total} pairs  "
                      f"({elapsed:.0f}s elapsed, {rate:.1f} pairs/s)")

    pd.DataFrame(rows).to_parquet(OUT_PATH, index=False)
    print(f"done: {len(rows)} pairs written to {OUT_PATH} in {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
