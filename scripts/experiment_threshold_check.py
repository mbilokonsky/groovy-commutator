"""Threshold sanity check for classify.classify_regime's cut points.

CLAUDE.md flags CRYSTALLINE_COMPRESSIBILITY (0.10) and NOISY_COMPRESSIBILITY
(0.85) as provisional -- read off the qualitative pilot, never fit to the
real distribution. This script holds them up against the actual
compressibility histogram of the full 32,640-pair sweep (drain and commute
excluded, since those are decided by trajectory shape before compressibility
is ever consulted) and measures how sensitive the headline regime counts are
to moving each cut.

Output: site/src/data/threshold_check.json -- the binned histogram + a
sensitivity table (structured/noisy/crystalline counts as each cut point
sweeps through a range), for the live chart on the questions page.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

CRYSTALLINE_CUT = 0.10
NOISY_CUT = 0.85


def main() -> None:
    df = pd.read_parquet(ROOT / "results" / "sweep_full_classified.parquet")
    sub = df[~df.regime.isin(["drain", "commute"])]
    c = sub["compressibility"].to_numpy()

    nbins = 60
    hist, edges = np.histogram(c, bins=nbins, range=(0.0, 1.2))

    # sensitivity of the three counts to each cut point (other cut held fixed)
    crys_sweep = []
    for cut in np.arange(0.04, 0.30 + 1e-9, 0.01):
        crys = int((c < cut).sum())
        noisy = int((c > NOISY_CUT).sum())
        crys_sweep.append(dict(cut=round(float(cut), 2), crystalline=crys,
                               structured=len(c) - crys - noisy, noisy=noisy))
    noisy_sweep = []
    for cut in np.arange(0.60, 0.98 + 1e-9, 0.01):
        crys = int((c < CRYSTALLINE_CUT).sum())
        noisy = int((c > cut).sum())
        noisy_sweep.append(dict(cut=round(float(cut), 2), crystalline=crys,
                                structured=len(c) - crys - noisy, noisy=noisy))

    # is "structured is the modal regime" robust? worst case over both sweeps
    # (drain=4009, commute=1164 are fixed)
    min_structured = min(min(r["structured"] for r in crys_sweep),
                         min(r["structured"] for r in noisy_sweep))
    runner_up = max(7302, 5414, 4009, 1164)  # crystalline count at current cuts

    site_json = dict(
        bins=hist.tolist(),
        bin_start=0.0, bin_width=round(float(edges[1] - edges[0]), 5),
        crystalline_cut=CRYSTALLINE_CUT, noisy_cut=NOISY_CUT,
        n_pairs=int(len(c)),
        crystalline_sweep=crys_sweep,
        noisy_sweep=noisy_sweep,
        min_structured_over_sweeps=int(min_structured),
    )
    out = ROOT / "site" / "src" / "data" / "threshold_check.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(site_json, indent=1))

    print(f"pairs classified by compressibility: {len(c)}")
    print(f"structured count at current cuts: "
          f"{int(((c >= CRYSTALLINE_CUT) & (c <= NOISY_CUT)).sum())}")
    print(f"worst-case structured over both sweeps: {min_structured} "
          f"(largest other regime at current cuts: {runner_up})")
    print("\nnoisy-cut sensitivity:")
    for r in noisy_sweep:
        print(f"  cut={r['cut']:.2f}  structured={r['structured']:6d}  noisy={r['noisy']:6d}")


if __name__ == "__main__":
    main()
