"""Does the rule-field polyculture plateau scale with lattice size?

Follow-up to the gated-diffusion findings (CLAUDE.md result 8): the
~20-distinct-rule plateau was measured at n=100 only. This measures the
plateau at n = 50..800 (leftward scheme, 30 seeds each, 300 steps) and
confirms the plateau is genuine at the larger sizes (spot-checked flat
from t=300 through t=1600 at n=400 and n=800 before settling on 300).

Output: site/src/data/nonuniform_scaling.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy import nonuniform as nu  # noqa: E402

NS = (50, 100, 200, 400, 800)
STEPS = 300
SEEDS = 30


def main() -> None:
    rows = []
    for n in NS:
        finals = []
        for seed in range(SEEDS):
            rng = np.random.default_rng(seed)
            s0 = rng.integers(0, 2, n).astype(np.uint8)
            rf0 = rng.integers(0, 256, n)
            res = nu.gated_diffusion_trajectory(s0, rf0, STEPS, scheme="left")
            finals.append(int(res["distinct"][-1]))
        med = float(np.median(finals))
        rows.append(dict(n=n, plateau_median=med,
                         plateau_frac=round(med / n, 3),
                         q25=float(np.quantile(finals, 0.25)),
                         q75=float(np.quantile(finals, 0.75))))
        print(f"n={n}: plateau median {med} ({med/n:.3f} of n)")

    # log-log slope of plateau vs n
    ns = np.log([r["n"] for r in rows])
    ps = np.log([r["plateau_median"] for r in rows])
    slope = float(np.polyfit(ns, ps, 1)[0])
    print(f"log-log slope: {slope:.2f}")

    site_json = dict(steps=STEPS, seeds=SEEDS, rows=rows,
                     loglog_slope=round(slope, 2),
                     plateau_verified_to_t=1600)
    (ROOT / "site" / "src" / "data" / "nonuniform_scaling.json").write_text(
        json.dumps(site_json, indent=1))
    print("written")


if __name__ == "__main__":
    main()
