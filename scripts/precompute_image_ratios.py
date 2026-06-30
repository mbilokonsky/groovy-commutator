"""Precompute metrics.image_ratio for all 256 elementary CA rules, once.

These are rule-level (not pair-level) quantities, reused across the full
sweep's post-hoc analysis (esp. the drain mechanism, see NOTES.md section
4) -- compute once here rather than re-deriving them inside every analysis
that needs them.

Usage:
    .venv/Scripts/python.exe scripts/precompute_image_ratios.py
"""
from __future__ import annotations
import csv
import time
from pathlib import Path

from groovy.metrics import image_ratio

N = 14  # exhaustive enumeration size -- see metrics.image_ratio docstring
OUT_PATH = Path(__file__).resolve().parent.parent / "results" / "image_ratios.csv"


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    t0 = time.time()
    for rule in range(256):
        ratio = image_ratio(rule, n=N)
        rows.append((rule, N, ratio))
        if rule % 32 == 0:
            print(f"rule {rule:3d}/255  image_ratio={ratio:.4f}  "
                  f"({time.time() - t0:.1f}s elapsed)")

    with OUT_PATH.open("w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["rule", "n", "image_ratio"])
        writer.writerows(rows)

    print(f"done in {time.time() - t0:.1f}s -- wrote {len(rows)} rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
