# Groovy Commutator — project context for Claude Code

## What this is
A generalization of the operator commutator `[A,B] = AB - BA` to discrete
dynamical systems (1D elementary cellular automata) instead of continuous
quantum operators. Origin demo: https://liet-codes.github.io/wet-math/commutator.html

Core construction, for a single CA rule `phi`:

```
D(S) = S XOR phi(S)            differentiation
E(S) = phi(S)                  evolution (I is trivial for elementary CA)
G(S) = C(D(E(S)), E(D(S)))     the commutator
```

`G(S)` is literally the operator commutator `[D, E]` evaluated at the state `S`.
All of this is implemented in `src/groovy/` — read the module docstrings
first, they carry the math. Full interpretive writeup and citations are in
`NOTES.md`, kept separate so this file stays short.

## Established results (don't re-derive these, build on them)

1. **Affine theorem.** `G(S)` is constant across *all* S iff `phi` is
   GF(2)-affine. The constant is 0 iff `phi` has no bias term (rules 90, 150).
   With a bias term (rules 165, 105 — complements of 90/150) `G(S)` is a fixed
   nonzero constant for every S, every time. This is the discrete analog of
   the canonical commutation relation `[x,p] = iħ` being a *constant*
   operator rather than a dynamical one. Verified in
   `src/groovy/operators.py::G`, see `NOTES.md` for the QM correspondence
   (kinematic vs. dynamical commutators, Ehrenfest's theorem, Noether,
   quantum chaos level statistics, quantum scars).

2. **Cross-rule commuting is a real, solved, named problem.** Moore &
   Boykett, "Commuting Cellular Automata," *Complex Systems* 11(1), 1997 —
   algebraic conditions for when two CA rules commute under composition.
   Confirmed empirically here. Related: Hedlund 1969 (the CA centralizer
   problem), the Moore–Myhill Garden of Eden theorem (non-surjectivity /
   lossy rules, relevant to the "drain" regime below).

3. **Five empirical regimes for rule PAIRS**, from
   `operators.divergence_trajectory` (two divergent unfoldings of the *same*
   initial state: path1 = repeat(A, then B), path2 = repeat(B, then A)):
   - **commute** — flat zero disagreement forever
   - **crystalline** — flat *nonzero constant* disagreement (kinematic mismatch)
   - **noisy divergence** — disagreement settles near 0.5, compressibility ≈ 1.0 (indistinguishable from noise)
   - **structured divergence** — disagreement nonzero but compressibility well below 1.0 — the genuinely new regime, doesn't exist in the single-rule case at all
   - **drain** — disagreement spikes then collapses to zero (the two paths fall into a shared trivial attractor)
   The drain regime is NOT coordination between the paths — it's caused by
   both rules independently destroying state-space information (low
   `metrics.image_ratio`, i.e. abundant Garden-of-Eden configurations).
   Confirmed directly: two paths from *unrelated* random initial conditions
   under rules 184/250 still converge to the identical all-ones fixed point
   by step ~12.

4. **Full exhaustive sweep, done** (was the open task, now complete — pilot
   findings below are superseded by this). All 256 rules, all 32,640
   unordered pairs, seeds (1,2,3,4,5), n=100, steps=100. Run via
   `scripts/run_full_sweep.py` (multiprocessing, checkpointed) →
   `results/sweep_full.parquet`; regime-classified and joined with
   per-rule `image_ratio` via `scripts/aggregate_sweep.py` →
   `results/sweep_full_classified.parquet` + `results/sweep_summary.csv`.
   Regime counts: **structured 14751 (45%)**, crystalline 7302 (22%),
   noisy 5414 (17%), drain 4009 (12%), commute 1164 (4%). Structured
   divergence — the regime with no single-rule analog — is the *modal*
   outcome at full scale, not a rare special case. Mean
   `min(image_ratio_a, image_ratio_b)` by regime: drain 0.214, structured
   0.195, commute 0.245, crystalline 0.140, noisy 0.319 — drain's
   image_ratio range overlaps heavily with crystalline and structured,
   reconfirming at full scale (not just the rule-4 counterexample) that
   image_ratio alone does not cleanly separate the regimes.
   `classify.classify_regime`'s thresholds (`CRYSTALLINE_COMPRESSIBILITY`,
   `NOISY_COMPRESSIBILITY`) are still provisional — read off the
   qualitative pilot description, not fit to this distribution. Sanity-
   checking/refitting those cut points against the real compressibility
   histogram is good follow-up work before trusting the regime counts
   above too precisely.

## New instruments (added 2026-06-30, from a separate chat-interface exploration)

Four directions came out of a parallel conversation; two are implemented,
one is a clear extension, one is intentionally left open. See `NOTES.md`
section 6 for the full writeup and citations.

- **Absential field** (`metrics.absential_field`, `operators.absential_trajectory`)
  — cells that are off but adjacent to an on cell (closed-neighborhood
  dilation minus the live set), distinct from "void" cells with no live
  neighbor. Candidate fast Class-IV / structure detector: run
  `classify.compressibility` on an absential-field trajectory instead of
  on `G`. Implemented, not yet validated against known Class I-IV rules.
- **Second-order / reversible memory** (`secondorder.py`) — Margolus-Fredkin
  style `S(t+1) = phi(S(t)) XOR S(t-1)`. Implemented and composable with
  the rest of the package (e.g. feeding `D(t-1)` in as the memory term
  instead of raw `S(t-1)` is a natural unimplemented variant).
- **Meta-evolution / rules birthing rules** (`metaevolution.py`) — each
  generation derives a child rule from the current state via a generator
  function, classifies the parent→child handoff with `classify_regime`,
  then (replace mode) adopts the child and evolves under it.
  `population_count_generator` (deliberately the crudest possible
  generator) reliably wanders through noisy/structured handoffs and then
  locks into a small stable cycle in rule space — confirmed on repeated
  runs here, though only with this one crude generator. Open follow-up:
  try richer generators (built from `absential_field`, `G(S)`, or `D(S)`
  sampled at a few positions) and compare time-to-cycle / cycle diversity
  across them — see `metaevolution.py`'s module docstring.
- **Non-uniform / heterogeneous CA** (rule space sharing state's
  dimensionality, i.e. per-cell rules instead of one global rule) — open,
  not implemented. Historically grounded (von Neumann's self-reproducing
  automaton carried construction instructions as patterns in the same
  substrate they acted on) but genuinely unresolved how to make `rule` a
  first-class citizen of the same `(steps, n)`-shaped space as `state`
  for the *elementary* (8-bit global rule) case used everywhere else in
  this package.

## Conventions
- Use `src/groovy/ca.py`'s vectorized `apply_rule` for anything beyond toy
  scale. The chat-session origin code used a Python-loop CA step; it's
  correct (cross-checked against this package — see git history / NOTES.md)
  but much slower. Don't reintroduce the loop version.
- `image_ratio` is exhaustive enumeration over `2**n` states — only
  tractable up to roughly n=16–18. Don't call it at the n~100-200 scale used
  for `divergence_trajectory`.
- Keep the interpretive/speculative material (the QM correspondence
  detail, the Jung/Pauli/Unus Mundus framing) in `NOTES.md`, not in
  docstrings or the open task list — those are for the math and the code.

## Working guidelines

**Repo layout, what each piece is for:**
- `src/groovy/` — the library. Source of truth for the math; docstrings
  carry derivations, not just usage.
- `notebooks/` — narrated exploration. Good for working out a new regime
  or sanity-checking a sweep, not a substitute for putting real results
  in `results/` or real findings in `NOTES.md`/`CLAUDE.md`.
- `results/` — sweep outputs (parquet/csv) and generated figures. Treat
  this as data, not scratch space — name files so it's clear what
  parameters produced them (rule range, seed count, date if it matters).
- `site/` — the GitHub Pages site's source (React + Vite, four pages:
  home/concepts/findings/explorer). `site/src/lib/groovy-engine.js` is a
  hand-ported JS mirror of `src/groovy/*.py` (1D functions) plus a 2D
  Life-like extension the Python package doesn't have yet — if you change
  the Python math, update the JS to match, and vice versa. Static figures
  the site embeds (e.g. `regime_heatmap.png`) live in
  `site/public/assets/img/` (Vite's own static-passthrough convention,
  distinct from the repo-root `public/`) and are produced by
  `scripts/build_findings_assets.py` — keep that script as the source of
  those PNGs rather than letting the site recompute full sweeps itself;
  the site's live-computed charts (Findings page) work from small
  hardcoded/checked-in datasets, not from re-running `scripts/`.
- `public/` (repo root) — **generated**, gitignored. `npm run build
  --prefix site` produces it; `.github/workflows/pages.yml` does this in
  CI before every deploy. Never edit its contents directly — changes
  belong in `site/`. `.claude/launch.json` has both a `site-dev` (Vite,
  hot reload) and `site-preview` (serves the built `public/` as-is)
  config for `Claude_Preview`/local preview.
- `NOTES.md` — the "why": citations, QM correspondence, the speculative
  interpretive thread. `CLAUDE.md` (this file) — the "what to build
  next" and established results to build on without re-deriving.

**Before adding a new "established result"**: it needs to survive being
checked, not just observed once. Confirm computationally (a script or
notebook cell that reproduces it), then promote it from notebook/scratch
into `CLAUDE.md` with enough detail that a future session doesn't need
to rerun it to trust it. If a finding is suggestive but small-sample
(like the pilot sweep), say so explicitly — don't let pilot-scale
findings read as settled.

**Git workflow:**
- Commit at meaningful checkpoints (a result lands, a sweep finishes, a
  module is added) rather than after every small edit — but don't let
  uncommitted work pile up across sessions either.
- Write commit messages that explain *why* a change happened, not just
  what changed — especially for results commits (what swept, what
  changed since the last one).
- Large sweep outputs are fine to commit if they're the actual
  deliverable of the open task (the whole point is having the full
  256-rule sweep checked in) — just keep them as compact formats
  (parquet over loose CSVs-per-pair) rather than raw dumps.
- Don't force-push or rewrite history on `main` without being asked.
