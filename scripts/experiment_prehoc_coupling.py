"""Pre-hoc coupling experiment: do 4-input rules, mutually coupled across
two layers, produce behavior that post-hoc (XOR) coupling can't reach?

Setup (see src/groovy/prehoc.py for the construction and the collapse
theorem that motivates it): two layers A and B, each stepped by a 4-input
rule whose fourth input is the OTHER layer's current state. Every 4-input
rule is an ordered pair of elementary rules (x=0 half, x=1 half), so a
random pre-hoc coupling = four random component rules; the post-hoc control
population uses tables of the form (g, g XOR 255) -- exactly the 0.78% of
tables expressible as "compute g, then XOR the other layer in afterward."

Measured, per sample: compressibility of layer A's trajectory and of the
disagreement field C(A,B), plus each component rule's solo-trajectory
compressibility (same initial state) as the "what the parts do alone"
baseline.

Emergence screen: samples where every component rule is boring alone
(solo compressibility < 0.10: fixed points / small cycles) but the coupled
trajectory lands in the structured band (0.15..0.85). These become the
named, reproducible examples the site demo runs live.

Output:
    results/prehoc_coupling.csv        -- per-sample metrics
    site/src/data/prehoc_coupling.json -- histograms + emergent examples
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from groovy.ca import apply_rule  # noqa: E402
from groovy.metrics import compressibility  # noqa: E402
from groovy import prehoc  # noqa: E402

N = 100
STEPS = 100
SAMPLES = 1500
BORING = 0.10
STRUCTURED_LO, STRUCTURED_HI = 0.15, 0.85


def solo_field(state0: np.ndarray, rule: int) -> np.ndarray:
    s = state0.copy()
    out = np.zeros((STEPS, N), dtype=np.uint8)
    for t in range(STEPS):
        out[t] = s
        s = apply_rule(s, rule)
    return out


def main() -> None:
    rng = np.random.default_rng(7)
    solo_cache: dict[tuple[int, int], float] = {}

    def solo_comp(rule: int, seed_idx: int, state0: np.ndarray) -> float:
        key = (rule, seed_idx)
        if key not in solo_cache:
            solo_cache[key] = compressibility(solo_field(state0, rule))
        return solo_cache[key]

    rows = []
    # a small pool of shared initial states so solo baselines cache well
    seeds = [rng.integers(0, 2, N).astype(np.uint8) for _ in range(8)]

    for kind in ("prehoc", "posthoc"):
        for i in range(SAMPLES):
            seed_idx = i % len(seeds)
            s0a = seeds[seed_idx]
            s0b = seeds[(seed_idx + 1) % len(seeds)]
            if kind == "prehoc":
                a0, a1, b0, b1 = (int(r) for r in rng.integers(0, 256, 4))
            else:
                ga, gb = (int(r) for r in rng.integers(0, 256, 2))
                a0, a1 = ga, ga ^ 255
                b0, b1 = gb, gb ^ 255
            ta = prehoc.rule4_from_pair(a0, a1)
            tb = prehoc.rule4_from_pair(b0, b1)
            res = prehoc.coupled_trajectory(s0a, s0b, ta, tb, STEPS)
            comp_a = compressibility(res["a"])
            comp_diff = compressibility(res["diff"])
            max_solo = max(solo_comp(r, seed_idx, s0a) for r in (a0, a1, b0, b1))
            rows.append(dict(kind=kind, seed_idx=seed_idx,
                             a0=a0, a1=a1, b0=b0, b1=b1,
                             comp_a=comp_a, comp_diff=comp_diff,
                             max_solo_comp=max_solo))
        print(f"{kind}: {SAMPLES} samples done", flush=True)

    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "results" / "prehoc_coupling.csv", index=False)

    emergent = df[(df.kind == "prehoc")
                  & (df.max_solo_comp < BORING)
                  & (df.comp_a >= STRUCTURED_LO) & (df.comp_a <= STRUCTURED_HI)]
    emergent = emergent.sort_values("comp_a")
    print(f"\nemergent candidates (all parts boring alone, coupled structured): "
          f"{len(emergent)} of {int((df.kind == 'prehoc').sum())}")
    print(emergent.head(12).to_string())

    bins = np.linspace(0, 1.1, 45)
    hist = {}
    for kind, grp in df.groupby("kind"):
        h, _ = np.histogram(grp["comp_a"], bins=bins)
        hist[kind] = h.tolist()

    boring_parts = df[df.max_solo_comp < BORING]
    frac_structured = {
        kind: round(float(((grp.comp_a >= STRUCTURED_LO) & (grp.comp_a <= STRUCTURED_HI)).mean()), 4)
        for kind, grp in boring_parts.groupby("kind")
    }

    examples = [
        dict(a0=int(r.a0), a1=int(r.a1), b0=int(r.b0), b1=int(r.b1),
             seed_idx=int(r.seed_idx),
             comp_a=round(float(r.comp_a), 3),
             max_solo=round(float(r.max_solo_comp), 3))
        for r in emergent.head(6).itertuples()
    ]

    site_json = dict(
        n=N, steps=STEPS, samples_per_kind=SAMPLES,
        bin_edges=[round(float(b), 4) for b in bins],
        hist_comp_a=hist,
        boring_threshold=BORING,
        structured_band=[STRUCTURED_LO, STRUCTURED_HI],
        n_emergent=int(len(emergent)),
        n_boring_parts=int((boring_parts.kind == "prehoc").sum()),
        frac_structured_given_boring_parts=frac_structured,
        emergent_examples=examples,
    )
    out = ROOT / "site" / "src" / "data" / "prehoc_coupling.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(site_json, indent=1))

    print("\ncomp_a quartiles by kind:")
    print(df.groupby("kind")["comp_a"].describe()[["25%", "50%", "75%"]])
    print(f"\nP(coupled structured | all parts boring alone): {frac_structured}")


if __name__ == "__main__":
    main()
