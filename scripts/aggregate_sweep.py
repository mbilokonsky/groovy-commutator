"""Post-process results/sweep_full.parquet: join in per-rule image_ratio,
assign each pair to one of the five empirical regimes (NOTES.md section 4),
and write summary tables.

Regime thresholds live in groovy.classify (classify_regime) -- provisional,
not yet validated against the full-sweep distribution. Once this runs,
sanity-check the bucket sizes and the histogram of `compressibility` before
trusting the cut points, and update CLAUDE.md with whatever the full-sweep
numbers turn out to support.

Usage:
    .venv/Scripts/python.exe scripts/aggregate_sweep.py
"""
from __future__ import annotations
from pathlib import Path

import pandas as pd

from groovy.classify import classify_regime

RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
SWEEP_PATH = RESULTS_DIR / "sweep_full.parquet"
IMAGE_RATIO_PATH = RESULTS_DIR / "image_ratios.csv"


def main() -> None:
    if not SWEEP_PATH.exists():
        raise SystemExit(f"{SWEEP_PATH} not found -- run run_full_sweep.py first")
    if not IMAGE_RATIO_PATH.exists():
        raise SystemExit(f"{IMAGE_RATIO_PATH} not found -- run precompute_image_ratios.py first")

    sweep = pd.read_parquet(SWEEP_PATH)
    ratios = pd.read_csv(IMAGE_RATIO_PATH)[["rule", "image_ratio"]]

    sweep = sweep.merge(ratios.rename(columns={"rule": "rule_a", "image_ratio": "image_ratio_a"}),
                         on="rule_a", how="left")
    sweep = sweep.merge(ratios.rename(columns={"rule": "rule_b", "image_ratio": "image_ratio_b"}),
                         on="rule_b", how="left")
    sweep["regime"] = sweep.apply(lambda row: classify_regime(row.to_dict()), axis=1)

    classified_path = RESULTS_DIR / "sweep_full_classified.parquet"
    sweep.to_parquet(classified_path, index=False)
    print(f"wrote {len(sweep)} classified pairs to {classified_path}")

    print("\nregime counts:")
    print(sweep["regime"].value_counts())

    print("\nmean min(image_ratio_a, image_ratio_b) by regime "
          "(lower = more lossy/Garden-of-Eden-rich):")
    sweep["min_image_ratio"] = sweep[["image_ratio_a", "image_ratio_b"]].min(axis=1)
    print(sweep.groupby("regime")["min_image_ratio"].agg(["mean", "median", "count"]))

    summary_path = RESULTS_DIR / "sweep_summary.csv"
    sweep.groupby("regime")["min_image_ratio"].agg(["mean", "median", "count"]).to_csv(summary_path)
    print(f"\nwrote regime summary to {summary_path}")


if __name__ == "__main__":
    main()
