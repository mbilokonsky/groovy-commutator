"""Run the new-instrument experiments (absential detector, meta-evolution
generator comparison, second-order reversibility) and generate every plot
the GitHub Pages site (public/) embeds.

This is the script that turns "instruments" into "findings" -- see
CLAUDE.md / NOTES.md for which is which before this script ran. Writes:
  - results/absential_classes.csv         (compressibility by rule/class)
  - results/metaevolution_generators.csv  (per-seed lineage outcomes)
  - public/assets/img/*.png               (every figure the site uses)

Usage:
    .venv/Scripts/python.exe scripts/build_findings_assets.py
"""
from __future__ import annotations
import csv
import shutil
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np
import pandas as pd

from groovy.ca import apply_rule, random_state
from groovy.classify import WOLFRAM_CLASS
from groovy.metaevolution import lineage, population_count_generator
from groovy.metrics import absential_field, compressibility
from groovy.operators import D, G, absential_trajectory
from groovy.secondorder import run_second_order, step_second_order

ROOT = Path(__file__).resolve().parent.parent
RESULTS_DIR = ROOT / "results"
IMG_DIR = ROOT / "public" / "assets" / "img"
IMG_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

REGIME_COLORS = {
    "commute": "#4C9A6B",
    "crystalline": "#3E7CB1",
    "noisy": "#9A4C9A",
    "structured": "#D98F2B",
    "drain": "#B14C4C",
}
REGIME_ORDER = ["commute", "crystalline", "structured", "noisy", "drain"]


def state_trajectory(state0: np.ndarray, rule_num: int, steps: int) -> np.ndarray:
    n = len(state0)
    state = state0.copy()
    field = np.zeros((steps, n), dtype=np.uint8)
    for t in range(steps):
        field[t] = state
        state = apply_rule(state, rule_num)
    return field


# ---------------------------------------------------------------------------
# 1. Absential field as a candidate Class-IV detector
# ---------------------------------------------------------------------------

def run_absential_detector(n: int = 150, steps: int = 120, seed: int = 7) -> None:
    rules = [0, 4, 30, 110]  # canonical class I, II, III, IV examples
    rng = np.random.default_rng(seed)
    state0 = random_state(n, rng)

    fig, axes = plt.subplots(1, len(rules), figsize=(4 * len(rules), 5))
    rows = []
    for ax, rule in zip(axes, rules):
        raw_field = state_trajectory(state0, rule, steps)
        abs_field = absential_trajectory(state0, rule, steps)
        c_raw = compressibility(raw_field)
        c_abs = compressibility(abs_field)
        rows.append(dict(rule=rule, wolfram_class=WOLFRAM_CLASS.get(rule, "?"),
                          compressibility_raw=c_raw, compressibility_absential=c_abs))

        ax.imshow(abs_field, cmap="binary", aspect="auto", interpolation="nearest")
        ax.set_title(f"Rule {rule} (class {WOLFRAM_CLASS.get(rule, '?')})\n"
                      f"raw={c_raw:.3f}  absential={c_abs:.3f}", fontsize=10)
        ax.set_xticks([])
        ax.set_yticks([])

    fig.suptitle("Absential field over time, by Wolfram class", y=1.02)
    fig.tight_layout()
    fig.savefig(IMG_DIR / "absential_classes.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    with (RESULTS_DIR / "absential_classes.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print("absential detector:")
    for r in rows:
        print(f"  rule {r['rule']:3d} (class {r['wolfram_class']})  "
              f"raw={r['compressibility_raw']:.3f}  absential={r['compressibility_absential']:.3f}")


# ---------------------------------------------------------------------------
# 2. Meta-evolution: does the generator function change time-to-cycle?
# ---------------------------------------------------------------------------

def absential_count_generator(state: np.ndarray) -> int:
    return int(absential_field(state).sum()) % 256


def g90_popcount_generator(state: np.ndarray) -> int:
    """Degenerate control, deliberately kept in the comparison: rule 90 is
    GF(2)-affine with zero bias, so G(state, 90) is the all-zero array for
    EVERY state (the affine theorem, see NOTES.md section 2) -- this
    generator carries no information about state at all, always returns 0.
    Included to show what a zero-information generator does to lineage
    behavior, as a floor for the other generators to beat."""
    return int(G(state, 90).sum()) % 256


def g30_popcount_generator(state: np.ndarray) -> int:
    """Same construction as g90_popcount_generator but with rule 30, which
    is NOT affine -- G(state, 30) does vary with state, so (unlike the g90
    control) this generator carries real information."""
    return int(G(state, 30).sum()) % 256


def d_sample_generator(state: np.ndarray) -> int:
    d = D(state, 90)
    idx = np.linspace(0, len(d) - 1, 8).astype(int)
    bits = d[idx]
    return int(sum(int(b) << i for i, b in enumerate(bits)))


GENERATORS = {
    "population_count": population_count_generator,
    "absential_count": absential_count_generator,
    "g90_popcount (degenerate)": g90_popcount_generator,
    "g30_popcount": g30_popcount_generator,
    "d90_sample": d_sample_generator,
}


def run_metaevolution_comparison(n: int = 64, max_generations: int = 40, steps: int = 80,
                                  seeds: tuple[int, ...] = tuple(range(8)),
                                  rule0: int = 90) -> pd.DataFrame:
    rows = []
    example_history = None
    for gen_name, gen_fn in GENERATORS.items():
        for seed in seeds:
            rng = np.random.default_rng(seed)
            state0 = random_state(n, rng)
            hist = lineage(state0, rule0, generator=gen_fn,
                            max_generations=max_generations, steps=steps)
            if gen_name == "population_count" and seed == 0:
                example_history = hist

            locked = "cycle_period" in hist[-1]
            regimes = [h["regime"] for h in hist]
            row = dict(generator=gen_name, seed=seed,
                       generations_run=len(hist),
                       locked_in=locked,
                       cycle_period=hist[-1].get("cycle_period") if locked else None,
                       generations_to_cycle=len(hist) if locked else None)
            for regime in REGIME_ORDER:
                row[f"frac_{regime}"] = regimes.count(regime) / len(regimes)
            rows.append(row)

    df = pd.DataFrame(rows)
    df.to_csv(RESULTS_DIR / "metaevolution_generators.csv", index=False)
    print("\nmeta-evolution generator comparison:")
    print(df.groupby("generator").agg(
        lock_in_rate=("locked_in", "mean"),
        mean_generations=("generations_run", "mean"),
    ))

    # bar chart: lock-in rate and mean generations run, by generator
    summary = df.groupby("generator").agg(
        lock_in_rate=("locked_in", "mean"),
        mean_generations=("generations_run", "mean"),
    ).reindex(GENERATORS.keys())

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
    ax1.bar(summary.index, summary["lock_in_rate"], color="#3E7CB1")
    ax1.set_title(f"Fraction of {len(seeds)} seeds that locked into a cycle\n(within {max_generations} generations)")
    ax1.set_ylim(0, 1)
    ax1.tick_params(axis="x", rotation=30)

    ax2.bar(summary.index, summary["mean_generations"], color="#D98F2B")
    ax2.set_title("Mean generations run before stopping\n(lock-in or budget exhausted)")
    ax2.tick_params(axis="x", rotation=30)

    fig.tight_layout()
    fig.savefig(IMG_DIR / "metaevolution_generators.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    # lineage trace for one example run (population_count, seed 0)
    if example_history:
        gens = [h["gen"] for h in example_history]
        rule_vals = [h["rule"] for h in example_history]
        colors = [REGIME_COLORS[h["regime"]] for h in example_history]
        fig, ax = plt.subplots(figsize=(9, 4))
        ax.plot(gens, rule_vals, color="#888888", zorder=1, linewidth=1)
        ax.scatter(gens, rule_vals, c=colors, s=60, zorder=2, edgecolor="white", linewidth=0.5)
        for regime, color in REGIME_COLORS.items():
            ax.scatter([], [], c=color, label=regime)
        ax.legend(loc="upper left", bbox_to_anchor=(1.0, 1.0), fontsize=9)
        ax.set_xlabel("generation")
        ax.set_ylabel("active rule")
        last = example_history[-1]
        title = "Meta-evolution lineage (rule 90, population_count generator)"
        if "cycle_period" in last:
            title += f"\nlocked into a period-{last['cycle_period']} cycle at generation {last['gen']}"
        ax.set_title(title)
        fig.tight_layout()
        fig.savefig(IMG_DIR / "metaevolution_lineage.png", dpi=130, bbox_inches="tight")
        plt.close(fig)

    return df


# ---------------------------------------------------------------------------
# 3. Second-order reversible CA: confirm reversibility, illustrate
# ---------------------------------------------------------------------------

def run_second_order_demo(n: int = 150, steps: int = 80, seed: int = 3, rule_num: int = 90) -> None:
    rng = np.random.default_rng(seed)
    s_minus1 = random_state(n, rng)
    s0 = random_state(n, rng)

    traj = run_second_order(s_minus1, s0, rule_num, steps)

    # reversibility check: reconstruct backward from the last two states
    recon = [traj[-1], traj[-2]]
    for t in range(len(traj) - 2):
        prev = step_second_order(recon[-1], recon[-2], rule_num)  # S(t-1) = phi(S(t)) XOR S(t+1), symmetric form
        # the recurrence is symmetric in time: phi(S(t)) XOR S(t-1) = S(t+1)
        # so running it "backward" with (S(t), S(t+1)) recovers S(t-1)
        recon.append(prev)
    recon = np.array(recon[::-1])
    matches = np.array_equal(recon, traj)
    print(f"\nsecond-order reversibility check (rule {rule_num}, n={n}, steps={steps}): "
          f"{'PASS' if matches else 'FAIL'}")

    fig, ax = plt.subplots(figsize=(6, 5))
    ax.imshow(traj, cmap="binary", aspect="auto", interpolation="nearest")
    ax.set_title(f"Second-order (Margolus-Fredkin) rule {rule_num}\nS(t+1) = phi(S(t)) XOR S(t-1)")
    ax.set_xticks([])
    ax.set_yticks([])
    fig.tight_layout()
    fig.savefig(IMG_DIR / "second_order_demo.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# 4. Full-sweep summary plots (no new compute, just visualizing existing results)
# ---------------------------------------------------------------------------

def plot_sweep_summaries() -> None:
    classified_path = RESULTS_DIR / "sweep_full_classified.parquet"
    if not classified_path.exists():
        print(f"skip sweep plots -- {classified_path} not found")
        return
    df = pd.read_parquet(classified_path)

    counts = df["regime"].value_counts().reindex(REGIME_ORDER)
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.bar(counts.index, counts.values, color=[REGIME_COLORS[r] for r in counts.index])
    for i, v in enumerate(counts.values):
        ax.text(i, v + 200, f"{v:,}\n({v / len(df):.0%})", ha="center", fontsize=9)
    ax.set_title(f"Regime counts across all {len(df):,} rule pairs (full 256-rule sweep)")
    ax.set_ylabel("pairs")
    fig.tight_layout()
    fig.savefig(IMG_DIR / "sweep_regime_counts.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    # boxplot: image_ratio doesn't separate the regimes cleanly
    df["min_image_ratio"] = df[["image_ratio_a", "image_ratio_b"]].min(axis=1)
    fig, ax = plt.subplots(figsize=(7, 4.5))
    data = [df.loc[df["regime"] == r, "min_image_ratio"].dropna() for r in REGIME_ORDER]
    bp = ax.boxplot(data, tick_labels=REGIME_ORDER, patch_artist=True, showfliers=False)
    for patch, regime in zip(bp["boxes"], REGIME_ORDER):
        patch.set_facecolor(REGIME_COLORS[regime])
        patch.set_alpha(0.7)
    ax.set_title("min(image_ratio_a, image_ratio_b) by regime\n(overlap = image_ratio alone doesn't predict regime)")
    ax.set_ylabel("min image_ratio")
    fig.tight_layout()
    fig.savefig(IMG_DIR / "regime_image_ratio_boxplot.png", dpi=130, bbox_inches="tight")
    plt.close(fig)

    # 256x256 heatmap of regime by rule pair
    regime_code = {r: i for i, r in enumerate(REGIME_ORDER)}
    n_rules = 256
    matrix = np.full((n_rules, n_rules), -1, dtype=int)
    for _, row in df.iterrows():
        a, b = int(row["rule_a"]), int(row["rule_b"])
        code = regime_code[row["regime"]]
        matrix[a, b] = code
        matrix[b, a] = code

    cmap = mcolors.ListedColormap(["#dddddd"] + [REGIME_COLORS[r] for r in REGIME_ORDER])
    bounds = list(range(-1, len(REGIME_ORDER) + 1))
    norm = mcolors.BoundaryNorm(bounds, cmap.N)

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.imshow(matrix, cmap=cmap, norm=norm, interpolation="nearest")
    ax.set_title("Regime by rule pair, all 256 rules\n(diagonal/self-pairs not computed, shown gray)")
    ax.set_xlabel("rule b")
    ax.set_ylabel("rule a")
    handles = [plt.Rectangle((0, 0), 1, 1, color=REGIME_COLORS[r]) for r in REGIME_ORDER]
    ax.legend(handles, REGIME_ORDER, loc="upper left", bbox_to_anchor=(1.02, 1.0), fontsize=9)
    fig.tight_layout()
    fig.savefig(IMG_DIR / "regime_heatmap.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def copy_existing_figures() -> None:
    for name in ("four_regimes.png", "pair_divergence.png"):
        src = RESULTS_DIR / name
        if src.exists():
            shutil.copy(src, IMG_DIR / name)


def main() -> None:
    copy_existing_figures()
    run_absential_detector()
    run_metaevolution_comparison()
    run_second_order_demo()
    plot_sweep_summaries()
    print(f"\nall assets written to {IMG_DIR}")


if __name__ == "__main__":
    main()
