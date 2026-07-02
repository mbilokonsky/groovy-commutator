"""Does the rule-field selection result survive a change of DIMENSION?

The 1D finding (CLAUDE.md result 8): under state-gated rule transport, an
endogenous selection pressure appears -- rules that quiet their host cell
are never displaced -- producing a monotone survival gradient and a stable
polyculture at moderate quietness. Already shown robust across variation
mechanisms (copy direction, XOR recombination). This tests the remaining
axis: dimension. Per-cell Life-like rules (9-bit born + 9-bit survive
masks) on a 2D torus, live cells copying their west neighbor's masks.

Measured: P(born-mask value survives | popcount of the born mask), cell
share by born-popcount at t0 vs end, restless-bit (born-on-0) drift, and
final rule diversity.

Output: site/src/data/nonuniform_2d.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy import ca2d  # noqa: E402

H = W = 64
STEPS = 200
SEEDS = 20
DENSITY = 0.15
POPC = np.array([bin(x).count("1") for x in range(512)])


def main() -> None:
    init_vals = np.zeros(10)
    surv_vals = np.zeros(10)
    cell_init = np.zeros(10)
    cell_final = np.zeros(10)
    b0_init = b0_final = 0
    distinct_finals = []

    for seed in range(SEEDS):
        rng = np.random.default_rng(seed)
        grid = ca2d.random_grid(H, W, DENSITY, rng)
        born = rng.integers(0, 512, (H, W))
        surv = rng.integers(0, 512, (H, W))
        born0, surv0 = born.copy(), surv.copy()
        for _ in range(STEPS):
            grid, born, surv = ca2d.step_gated_transport_2d(grid, born, surv)

        keys_final = (born.astype(np.int64) << 9) | surv
        distinct_finals.append(int(len(np.unique(keys_final))))
        for k in np.unique(born0):
            init_vals[POPC[k]] += 1
        for k in np.unique(born):
            surv_vals[POPC[k]] += 1
        np.add.at(cell_init, POPC[born0.flatten()], 1)
        np.add.at(cell_final, POPC[born.flatten()], 1)
        b0_init += int((born0 & 1).sum())
        b0_final += int((born & 1).sum())

    survival = [round(float(surv_vals[k] / init_vals[k]), 3) if init_vals[k] else None
                for k in range(10)]
    site_json = dict(
        h=H, w=W, steps=STEPS, seeds=SEEDS,
        distinct_final_median=int(np.median(distinct_finals)),
        cells=H * W,
        survival_by_born_popcount=survival,
        cell_share_t0=[round(float(c / cell_init.sum()), 3) for c in cell_init],
        cell_share_final=[round(float(c / cell_final.sum()), 3) for c in cell_final],
        restless_frac_t0=round(b0_init / (SEEDS * H * W), 3),
        restless_frac_final=round(b0_final / (SEEDS * H * W), 3),
        mean_born_popcount_t0=round(float(sum(k * cell_init[k] for k in range(10)) / cell_init.sum()), 2),
        mean_born_popcount_final=round(float(sum(k * cell_final[k] for k in range(10)) / cell_final.sum()), 2),
    )
    (ROOT / "site" / "src" / "data" / "nonuniform_2d.json").write_text(
        json.dumps(site_json, indent=1))

    print("P(born value survives | popcount):", survival)
    print(f"mean born-popcount by cells: {site_json['mean_born_popcount_t0']} -> "
          f"{site_json['mean_born_popcount_final']}")
    print(f"restless: {site_json['restless_frac_t0']} -> {site_json['restless_frac_final']}")
    print(f"distinct rules at end (median): {site_json['distinct_final_median']} of {H*W}")


if __name__ == "__main__":
    main()
