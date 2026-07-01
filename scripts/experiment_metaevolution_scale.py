"""Scaled-up meta-evolution generator comparison.

The original comparison (scripts/build_findings_assets.py, 8 seeds per
generator, one starting rule) found that richer/more-informative generators
search longer before locking into a rule-space cycle, with the
affine-degenerate G(.,90) control at the floor. Labeled suggestive on the
site. This scales it 15x: same five generators, 40 seeds each, three
starting rules (90, 30, 110), with bootstrap CIs on the mean
generations-to-cycle, so the questions page chart can carry error bars and
an honest robustness statement.

Output:
    results/metaevolution_scale.csv     -- per-lineage outcomes
    site/src/data/metaevolution.json    -- per-generator means + CIs,
                                           lock-in rates, per-start-rule
                                           breakdown
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.ca import random_state  # noqa: E402
from groovy.operators import D, G  # noqa: E402
from groovy.metrics import absential_field  # noqa: E402
from groovy.metaevolution import lineage, population_count_generator  # noqa: E402

N = 64
MAX_GENERATIONS = 40
STEPS = 80
SEEDS = 40
START_RULES = (90, 30, 110)


def absential_count_generator(state):
    return int(absential_field(state).sum()) % 256


def g90_popcount_generator(state):
    return int(G(state, 90).sum()) % 256   # affine theorem: always 0


def g30_popcount_generator(state):
    return int(G(state, 30).sum()) % 256


def d_sample_generator(state):
    d = D(state, 90)
    idx = np.linspace(0, len(d) - 1, 8).astype(int)
    return int(sum(int(b) << i for i, b in enumerate(d[idx])))


GENERATORS = {
    "population_count": population_count_generator,
    "absential_count": absential_count_generator,
    "g90_popcount (degenerate)": g90_popcount_generator,
    "g30_popcount": g30_popcount_generator,
    "d90_sample": d_sample_generator,
}


def bootstrap_ci(vals: np.ndarray, iters: int = 4000, alpha: float = 0.05):
    rng = np.random.default_rng(1)
    means = np.array([rng.choice(vals, size=len(vals), replace=True).mean()
                      for _ in range(iters)])
    return float(np.quantile(means, alpha / 2)), float(np.quantile(means, 1 - alpha / 2))


def main() -> None:
    rows = []
    for gen_name, gen_fn in GENERATORS.items():
        for rule0 in START_RULES:
            for seed in range(SEEDS):
                rng = np.random.default_rng(seed)
                state0 = random_state(N, rng)
                hist = lineage(state0, rule0, generator=gen_fn,
                               max_generations=MAX_GENERATIONS, steps=STEPS)
                locked = "cycle_period" in hist[-1]
                rows.append(dict(generator=gen_name, rule0=rule0, seed=seed,
                                 locked_in=locked,
                                 generations=len(hist),
                                 cycle_period=hist[-1].get("cycle_period")))
        print(f"{gen_name}: done", flush=True)

    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "results" / "metaevolution_scale.csv", index=False)

    out = []
    for gen_name in GENERATORS:
        grp = df[df.generator == gen_name]
        locked = grp[grp.locked_in]
        vals = locked["generations"].to_numpy(dtype=float)
        lo, hi = bootstrap_ci(vals)
        per_rule = {str(r): round(float(locked[locked.rule0 == r]["generations"].mean()), 2)
                    for r in START_RULES}
        out.append(dict(
            generator=gen_name,
            lockin_rate=round(float(grp.locked_in.mean()), 4),
            mean_generations=round(float(vals.mean()), 2),
            ci_low=round(lo, 2), ci_high=round(hi, 2),
            per_start_rule=per_rule,
            n_lineages=int(len(grp)),
        ))

    site_json = dict(n=N, max_generations=MAX_GENERATIONS, steps=STEPS,
                     seeds=SEEDS, start_rules=list(START_RULES),
                     generators=out)
    (ROOT / "site" / "src" / "data" / "metaevolution.json").write_text(
        json.dumps(site_json, indent=1))

    print(f"\n{'generator':28s} {'lock-in':>8s} {'mean gens':>10s} {'95% CI':>14s}")
    for g in out:
        print(f"{g['generator']:28s} {g['lockin_rate']:8.2%} {g['mean_generations']:10.2f} "
              f"[{g['ci_low']:5.2f}, {g['ci_high']:5.2f}]")
    print("\nper start rule (mean gens):")
    for g in out:
        print(f"  {g['generator']:28s} {g['per_start_rule']}")


if __name__ == "__main__":
    main()
