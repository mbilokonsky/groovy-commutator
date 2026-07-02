"""The absential Class-IV detector hypothesis, tested where it was actually
framed: 2D Life-like automata with real persistent localized structures
(still lifes, oscillators, gliders), instead of elementary CA where nothing
like a glider exists as an object.

Hypothesis (NOTES.md section 6): the absential field -- off-cells adjacent
to live ones -- should compress in a class-discriminating way. A still
life's absential ring is small and frozen; Class III churn keeps a dense,
incompressible halo; a glider's halo is a compressible moving shape. The 1D
test was inconclusive (raw and absential compressibility tracked each other
closely). This is the fair 2D version.

Setup: seven Life-like rules with well-known informal characters, random
soup starts, compressibility of the raw trajectory vs. the absential-field
trajectory measured over the full run and over a "settled" tail window
(where Class IV should have condensed into structures while Class III is
still churning). Also verifies, as a cross-dimension bonus, that the affine
theorem survives the move to 2D: B1357/S1357 (Replicator) is neighbor
parity -- GF(2)-linear, the 2D analog of rule 90 -- so G2 must vanish
identically (checked against Life as a nonlinear control).

Output:
    results/absential_2d.csv        -- per-run metrics
    site/src/data/absential_2d.json -- per-rule medians for the site card
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.metrics import compressibility  # noqa: E402
from groovy import ca2d  # noqa: E402

# 60x60, NOT 64x64: the parity rule (Replicator) is nilpotent on
# power-of-two tori -- exactly like rule 90 on a 2^k ring -- and would hit
# the all-zero state and read as Class I by accident.
H = W = 60
STEPS = 240
SETTLE_FROM = 140
SEEDS = 8
DENSITY = 0.15

RULES = [
    # key, born, survive, soup density, informal class / why it's here.
    # Day & Night gets 0.5: it's a high-density rule, and 0.15 soup just
    # dies -- which would test the soup, not the rule.
    ("no_birth", set(), {2, 3}, DENSITY, "I — everything dies from soup"),
    ("maze", {3}, {1, 2, 3, 4, 5}, DENSITY, "II — freezes into a static maze"),
    ("life", {3}, {2, 3}, DENSITY, "IV — still lifes, oscillators, gliders"),
    ("highlife", {3, 6}, {2, 3}, DENSITY, "IV — Life plus a replicator"),
    ("daynight", {3, 6, 7, 8}, {3, 4, 6, 7, 8}, 0.5, "III/IV — large-scale churn"),
    ("seeds", {2}, set(), DENSITY, "III — explosive chaos"),
    ("replicator", {1, 3, 5, 7}, {1, 3, 5, 7}, DENSITY, "additive — 2D rule 90"),
]


def glider_grid(n_gliders: int, rng: np.random.Generator) -> np.ndarray:
    """Sparse field of gliders on an empty grid -- the 'moving structure'
    probe the absential hypothesis was originally framed around."""
    g = np.zeros((H, W), dtype=np.uint8)
    cells = [(0, 1), (1, 2), (2, 0), (2, 1), (2, 2)]
    for k in range(n_gliders):
        r0, c0 = rng.integers(0, H - 8), rng.integers(0, W - 8)
        for r, c in cells:
            g[(r0 + r) % H, (c0 + c) % W] = 1
    return g


def blocks_grid(n_blocks: int, rng: np.random.Generator) -> np.ndarray:
    """Sparse field of 2x2 still-life blocks -- the 'static structure' probe."""
    g = np.zeros((H, W), dtype=np.uint8)
    for k in range(n_blocks):
        r0, c0 = rng.integers(0, H - 4), rng.integers(0, W - 4)
        g[r0:r0 + 2, c0:c0 + 2] = 1
    return g


def main() -> None:
    # cross-dimension affine check first (cheap, decisive)
    rng = np.random.default_rng(0)
    odd = {1, 3, 5, 7}
    rep_zero = all(int(ca2d.G2(ca2d.random_grid(32, 32, 0.3, rng), odd, odd).sum()) == 0
                   for _ in range(50))
    life_nonzero = sum(int(ca2d.G2(ca2d.random_grid(32, 32, 0.3, rng), {3}, {2, 3}).sum() > 0)
                       for _ in range(50))
    print(f"G2(Replicator) == 0 on 50 random grids: {rep_zero}; "
          f"G2(Life) nonzero on {life_nonzero}/50 controls")

    rows = []
    for key, born, survive, density, note in RULES:
        for seed in range(SEEDS):
            rng = np.random.default_rng(seed)
            g0 = ca2d.random_grid(H, W, density, rng)
            raw = ca2d.evolve_trajectory_2d(g0, born, survive, STEPS)
            absf = ca2d.absential_trajectory_2d(g0, born, survive, STEPS)
            rows.append(dict(
                rule=key, seed=seed, note=note,
                raw_full=compressibility(raw),
                abs_full=compressibility(absf),
                raw_settled=compressibility(raw[SETTLE_FROM:]),
                abs_settled=compressibility(absf[SETTLE_FROM:]),
                density_settled=float(raw[SETTLE_FROM:].mean()),
            ))
        print(f"{key}: done", flush=True)

    # the structure probes: under Life itself, pure still lifes vs pure
    # gliders vs settled soup -- the hypothesis's own home turf
    probes = []
    for probe_name, maker in (("still_lifes", blocks_grid), ("gliders", glider_grid)):
        raws, abss = [], []
        for seed in range(SEEDS):
            rng = np.random.default_rng(1000 + seed)
            g0 = maker(6, rng)
            raw = ca2d.evolve_trajectory_2d(g0, {3}, {2, 3}, STEPS)
            absf = ca2d.absential_trajectory_2d(g0, {3}, {2, 3}, STEPS)
            raws.append(compressibility(raw))
            abss.append(compressibility(absf))
        probes.append(dict(probe=probe_name,
                           raw=round(float(np.median(raws)), 3),
                           absential=round(float(np.median(abss)), 3)))
        print(f"probe {probe_name}: raw={probes[-1]['raw']} abs={probes[-1]['absential']}")

    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "results" / "absential_2d.csv", index=False)

    med = df.groupby("rule")[["raw_full", "abs_full", "raw_settled", "abs_settled",
                              "density_settled"]].median()
    per_rule = []
    for key, born, survive, density, note in RULES:  # keep lineup order
        m = med.loc[key]
        per_rule.append(dict(
            rule=key, note=note,
            born=sorted(born), survive=sorted(survive),
            raw_settled=round(float(m.raw_settled), 3),
            abs_settled=round(float(m.abs_settled), 3),
            raw_full=round(float(m.raw_full), 3),
            abs_full=round(float(m.abs_full), 3),
            density_settled=round(float(m.density_settled), 3),
        ))

    site_json = dict(
        h=H, w=W, steps=STEPS, settle_from=SETTLE_FROM, seeds=SEEDS, density=DENSITY,
        rules=per_rule,
        probes=probes,
        affine_2d=dict(replicator_g2_zero=bool(rep_zero),
                       life_g2_nonzero_controls=int(life_nonzero), trials=50),
    )
    (ROOT / "site" / "src" / "data" / "absential_2d.json").write_text(
        json.dumps(site_json, indent=1))

    print("\nmedians (settled window, steps 140-240):")
    print(f"{'rule':12s} {'raw':>7s} {'absential':>10s} {'density':>8s}")
    for r in per_rule:
        print(f"{r['rule']:12s} {r['raw_settled']:7.3f} {r['abs_settled']:10.3f} "
              f"{r['density_settled']:8.3f}")


if __name__ == "__main__":
    main()
