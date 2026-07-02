"""Transport-scheme robustness for the rule-as-state selection result.

The gated-diffusion findings (CLAUDE.md result 8) carried the caveat "one
transport scheme (leftward copy)". This runs the same measurements under
three schemes (see nonuniform.TRANSPORT_SCHEMES):

  left  -- live cell copies its left neighbor's rule (the original)
  right -- mirror image (symmetry control: statistics should match left)
  mix   -- live cell's rule becomes XOR of its neighbors' rules, i.e.
           GF(2) recombination. Can create rules absent from the initial
           population, so 'diversity <= initial diversity' no longer holds
           by construction. The selection pressure (only live cells get
           overwritten) is unchanged.

Measured per scheme, 60 seeds each: final distinct-rule count, survival
gradient P(popcount k value survives), restless-bit drift, and state
compressibility.

Output: site/src/data/nonuniform_transport.json (feeds one paragraph on
the rule-as-state card).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.metrics import compressibility  # noqa: E402
from groovy import nonuniform as nu  # noqa: E402

N = 100
STEPS = 200
SEEDS = 60
POPCOUNT = np.array([bin(r).count("1") for r in range(256)])


def main() -> None:
    out = {}
    for scheme in nu.TRANSPORT_SCHEMES:
        init_vals = np.zeros(9)
        surv_vals = np.zeros(9)
        bit0_init = bit0_final = 0
        finals, comps, novel_fracs = [], [], []
        for seed in range(SEEDS):
            rng = np.random.default_rng(seed)
            s0 = rng.integers(0, 2, N).astype(np.uint8)
            rf0 = rng.integers(0, 256, N)
            res = nu.gated_diffusion_trajectory(s0, rf0, STEPS, scheme=scheme)
            final = res["rules"][-1]
            finals.append(len(np.unique(final)))
            comps.append(compressibility(res["state"]))
            novel = ~np.isin(final, rf0)
            novel_fracs.append(float(novel.mean()))
            for r in np.unique(rf0):
                init_vals[POPCOUNT[r]] += 1
            for r in np.unique(final):
                surv_vals[POPCOUNT[r]] += 1
            bit0_init += int((rf0 & 1).sum())
            bit0_final += int((final & 1).sum())
        survival = [round(float(surv_vals[k] / init_vals[k]), 3) if init_vals[k] else None
                    for k in range(9)]
        out[scheme] = dict(
            distinct_final_median=int(np.median(finals)),
            distinct_final_range=[int(min(finals)), int(max(finals))],
            comp_state_median=round(float(np.median(comps)), 3),
            novel_rule_cell_frac_median=round(float(np.median(novel_fracs)), 3),
            survival_by_popcount=survival,
            restless_frac_t0=round(bit0_init / (SEEDS * N), 3),
            restless_frac_final=round(bit0_final / (SEEDS * N), 3),
        )
        print(f"{scheme}: distinct_final={out[scheme]['distinct_final_median']} "
              f"comp={out[scheme]['comp_state_median']} "
              f"novel={out[scheme]['novel_rule_cell_frac_median']} "
              f"restless {out[scheme]['restless_frac_t0']}->{out[scheme]['restless_frac_final']}")
        print(f"  survival: {survival}")

    site_json = dict(n=N, steps=STEPS, seeds=SEEDS, schemes=out)
    (ROOT / "site" / "src" / "data" / "nonuniform_transport.json").write_text(
        json.dumps(site_json, indent=1))
    print("written")


if __name__ == "__main__":
    main()
