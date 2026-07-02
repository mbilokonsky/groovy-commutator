"""Non-uniform CA experiment: what happens when the rule becomes a
state-shaped field with its own dynamics?

Conditions, per seed (see src/groovy/nonuniform.py for the constructions
and the radius-4 collapse warning about condition 5):

  1. uniform baselines   -- rules 4, 30, 90, 110 (one per Wolfram class-ish)
  2. frozen random field -- every cell its own random rule, quenched
  3. frozen mosaic       -- blocks of 10 cells alternating a random rule pair
  4. gated diffusion     -- random rule field, state-gated rule transport
                            (the honest rule-as-state construction)
  5. read-from-state     -- rules re-read from the state each step
                            (provably just a radius-4 uniform CA; included
                            to show the collapse empirically)

Measured: state-trajectory compressibility everywhere; for condition 4 also
the rule-field's own diversity over time (distinct rules present), the
compressibility of the rule field's bit-planes (the rule field treated AS a
state, which is the whole point), which rules survive to the end, and the
SELECTION analysis: transport only overwrites a cell's rule where the cell
is alive, so rules that quiet their host cell are never displaced --
measured as P(rule value survives | popcount of the rule) and the drift of
the population's mean popcount / restlessness bit (000->1).

Output:
    results/nonuniform_rulefield.csv   -- per-run metrics
    site/src/data/nonuniform.json      -- per-condition summaries, the
                                          median diversity curve, and the
                                          pooled survivor-rule histogram
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.ca import apply_rule  # noqa: E402
from groovy.metrics import compressibility  # noqa: E402
from groovy import nonuniform as nu  # noqa: E402

N = 100
STEPS = 200
SEEDS = 60

POPCOUNT = np.array([bin(r).count("1") for r in range(256)])


def uniform_field(state0: np.ndarray, rule: int) -> np.ndarray:
    s = state0.copy()
    out = np.zeros((STEPS, N), dtype=np.uint8)
    for t in range(STEPS):
        out[t] = s
        s = apply_rule(s, rule)
    return out


def frozen_field(state0: np.ndarray, rule_field: np.ndarray) -> np.ndarray:
    s = state0.copy()
    out = np.zeros((STEPS, N), dtype=np.uint8)
    for t in range(STEPS):
        out[t] = s
        s = nu.apply_rule_field(s, rule_field)
    return out


def read_from_state_field(state0: np.ndarray) -> np.ndarray:
    s = state0.copy()
    out = np.zeros((STEPS, N), dtype=np.uint8)
    for t in range(STEPS):
        out[t] = s
        s = nu.step_read_from_state(s)
    return out


def main() -> None:
    rows = []
    diversity_curves = []
    survivor_counter: Counter[int] = Counter()
    init_vals = np.zeros(9)     # rule VALUES present at t0, by popcount
    surv_vals = np.zeros(9)     # ... still present at the end
    cell_init = np.zeros(9)     # CELLS occupied, by their rule's popcount
    cell_final = np.zeros(9)
    bit0_init = bit0_final = 0  # cells whose rule is restless (000 -> 1)

    for seed in range(SEEDS):
        rng = np.random.default_rng(seed)
        s0 = rng.integers(0, 2, N).astype(np.uint8)

        for rule in (4, 30, 90, 110):
            rows.append(dict(seed=seed, condition=f"uniform_{rule}",
                             comp_state=compressibility(uniform_field(s0, rule))))

        rf_random = rng.integers(0, 256, N)
        rows.append(dict(seed=seed, condition="frozen_random",
                         comp_state=compressibility(frozen_field(s0, rf_random))))

        a, b = (int(r) for r in rng.integers(0, 256, 2))
        mosaic = np.where((np.arange(N) // 10) % 2 == 0, a, b)
        rows.append(dict(seed=seed, condition="frozen_mosaic",
                         comp_state=compressibility(frozen_field(s0, mosaic))))

        rf0 = rng.integers(0, 256, N)
        res = nu.gated_diffusion_trajectory(s0, rf0, STEPS)
        planes = nu.rule_field_bitplanes(res["rules"])
        comp_planes = float(np.mean([compressibility(p) for p in planes]))
        final = res["rules"][-1]
        survivors = np.unique(final)
        survivor_counter.update(int(r) for r in survivors)
        diversity_curves.append(res["distinct"])
        for r in np.unique(rf0):
            init_vals[POPCOUNT[r]] += 1
        for r in survivors:
            surv_vals[POPCOUNT[r]] += 1
        np.add.at(cell_init, POPCOUNT[rf0], 1)
        np.add.at(cell_final, POPCOUNT[final], 1)
        bit0_init += int((rf0 & 1).sum())
        bit0_final += int((final & 1).sum())
        rows.append(dict(seed=seed, condition="gated_diffusion",
                         comp_state=compressibility(res["state"]),
                         comp_rulefield=comp_planes,
                         distinct_t0=int(res["distinct"][0]),
                         distinct_final=int(res["distinct"][-1])))

        rows.append(dict(seed=seed, condition="read_from_state",
                         comp_state=compressibility(read_from_state_field(s0))))

    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "results" / "nonuniform_rulefield.csv", index=False)

    summary = {}
    for cond, grp in df.groupby("condition"):
        q = grp["comp_state"].quantile([0.25, 0.5, 0.75])
        summary[cond] = dict(q25=round(float(q[0.25]), 3), median=round(float(q[0.5]), 3),
                             q75=round(float(q[0.75]), 3))

    curves = np.stack(diversity_curves)
    diversity_median = np.median(curves, axis=0).astype(int).tolist()
    diversity_q25 = np.quantile(curves, 0.25, axis=0).astype(int).tolist()
    diversity_q75 = np.quantile(curves, 0.75, axis=0).astype(int).tolist()

    survival_by_popcount = [round(float(surv_vals[k] / init_vals[k]), 3) if init_vals[k] else None
                            for k in range(9)]
    cell_share_t0 = [round(float(c / cell_init.sum()), 3) for c in cell_init]
    cell_share_final = [round(float(c / cell_final.sum()), 3) for c in cell_final]

    gd = df[df.condition == "gated_diffusion"]
    site_json = dict(
        n=N, steps=STEPS, seeds=SEEDS,
        comp_state_summary=summary,
        comp_rulefield_median=round(float(gd["comp_rulefield"].median()), 3),
        distinct_t0_median=int(gd["distinct_t0"].median()),
        distinct_final_median=int(gd["distinct_final"].median()),
        distinct_final_min=int(gd["distinct_final"].min()),
        distinct_final_max=int(gd["distinct_final"].max()),
        diversity_median=diversity_median,
        diversity_q25=diversity_q25,
        diversity_q75=diversity_q75,
        survivor_top=[[r, c] for r, c in survivor_counter.most_common(16)],
        survival_by_popcount=survival_by_popcount,
        cell_share_t0=cell_share_t0,
        cell_share_final=cell_share_final,
        restless_frac_t0=round(bit0_init / (SEEDS * N), 3),
        restless_frac_final=round(bit0_final / (SEEDS * N), 3),
    )
    out = ROOT / "site" / "src" / "data" / "nonuniform.json"
    out.write_text(json.dumps(site_json, indent=1))

    print("state compressibility by condition:")
    for cond, s in sorted(summary.items()):
        print(f"  {cond:16s} median={s['median']:.3f}  [{s['q25']:.3f}, {s['q75']:.3f}]")
    print(f"\ngated diffusion: distinct rules median {site_json['distinct_t0_median']} -> "
          f"{site_json['distinct_final_median']} (range {site_json['distinct_final_min']}"
          f"-{site_json['distinct_final_max']}) over {STEPS} steps")
    print(f"rule-field bitplane compressibility median: {site_json['comp_rulefield_median']}")
    print("top survivor rules:", survivor_counter.most_common(10))
    print("P(survive | popcount):", survival_by_popcount)
    print(f"cell share by popcount t0:  {cell_share_t0}")
    print(f"cell share by popcount end: {cell_share_final}")
    print(f"restless (000->1) cell fraction: {site_json['restless_frac_t0']} -> "
          f"{site_json['restless_frac_final']}")


if __name__ == "__main__":
    main()
