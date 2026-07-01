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
   `classify.classify_regime`'s thresholds have since been checked
   against the real distribution (result 6) and the drain count above has
   a known inflation (result 5).

5. **Drain mechanism, answered — with a label correction** (2026-07-01,
   `scripts/experiment_drain_predictor.py` → `results/drain_predictor.parquet`
   + `site/src/data/drain_predictor.json`). Two findings:
   - **The sweep's drain label conflates two populations.** Of 4,009
     labeled drains, 2,754 never converge (median final disagreement
     0.418 — the `peak - final > 0.15` shape rule fires on early
     transients). True convergence (final = 0 after peak > 0) covers
     2,150 pairs: 1,255 labeled drain + 895 "quiet drains" filed under
     crystalline because their transient peak stayed below 0.15. Honest
     drain census ≈ 2,150 pairs (6.6%), not 4,009 (12.3%).
   - **What predicts true convergence: two properties of the PAIR,
     computed exhaustively at n=12.** (a) The eventual image of the
     composed round map — push all 2^12 states through (phi_b ∘ phi_a)
     repeatedly, dedup between rounds, until the image stops shrinking —
     collapses to a tiny set, AND (b) the two orderings' eventual images
     are the *same* set (Jaccard overlap). Converged pairs: median image
     3 states, median overlap 1.0. Crystalline is the near-miss: similar
     collapse (median 92 states) into *disjoint* attractors (overlap
     0.046). AUC for converged-vs-rest 0.908 by image size (old
     min-image_ratio baseline: 0.692); the crisp rule "shared attractor
     ≤ 4 states" gets precision 0.76 / recall 0.68 — n=12 exhaustive
     structure predicting n=100 sampled behavior. The rule-4
     counterexample fully resolves: 4/30, 4/126, 4/54 collapse to shared
     images of 3, 1, 1 states; 4/18 keeps 67 states at overlap 0.47 and
     doesn't drain. Residual predictor error is real (attractor structure
     depends on ring size), flagged as such on the site.

6. **Classifier thresholds validated against the full distribution**
   (2026-07-01, `scripts/experiment_threshold_check.py` →
   `site/src/data/threshold_check.json`). The compressibility histogram
   of the 27,467 shape-undecided pairs is genuinely bimodal at the low
   end, and `CRYSTALLINE_COMPRESSIBILITY = 0.10` sits in the empirical
   valley (the 0.10–0.12 bin is the histogram minimum). The noisy cut is
   soft — no valley, a smooth ramp into the incompressible spike at 1.0 —
   but the headline "structured is the modal regime" is robust: it holds
   for any noisy cut in [0.60, 0.98] and any crystalline cut up to ~0.20.
   Verdict: keep 0.10/0.85, no refit needed; the structured/noisy split
   specifically should be described as a judgment call, not a natural
   boundary.

7. **Pre-hoc composition (4-input rules): implemented; collapse theorem;
   coupling produces emergence** (2026-07-01, `src/groovy/prehoc.py`,
   JS mirror in `site/src/lib/groovy-engine.js`,
   `scripts/experiment_prehoc_coupling.py` → `results/prehoc_coupling.csv`
   + `site/src/data/prehoc_coupling.json`).
   - A 16-entry 4-input table (indexed `8x + 4l + 2c + r`) is exactly an
     ordered pair of elementary rules — x selects per cell which applies.
     Only 512/65,536 tables (0.8%) are post-hoc separable
     (f = g(l,c,r) XOR h(x)).
   - **Collapse theorem**: if x is any same-time radius-1 function of the
     same state (x = mu(S), mu elementary), the 4-input rule collapses to
     the elementary rule `table[8*mu[idx] + idx]`. The absential field IS
     elementary rule 50; D(·,psi) IS elementary rule psi ^ 204 — so
     feeding a rule its own derivative or absential field pre-hoc buys
     nothing new. Escape requires input from another *time* (memory, cf.
     `secondorder.py`) or another *trajectory*. Verified computationally
     in Python and live in-browser on the questions page.
   - Mutually coupled layers (each layer's x = the other layer's current
     state): 1,500 random pre-hoc samples span the full compressibility
     range (median 0.70) while 1,500 post-hoc XOR controls pile up at
     noise (median 1.01). Three "emergent" examples found where all four
     component rules are boring alone (solo compressibility < 0.10) but
     the coupled system is structured — robust across 20 seeds each:
     (77,55|44,23), (237,93|71,221), (164,235|223,160). Suggestive, not
     established: one sampling run, one (mutual, symmetric) topology, one
     lattice size.

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
  home/concepts/questions/explorer — the questions page was called
  "findings" before a copy pass restructured it around named questions
  each answered by embedded data, per the confidence-labeling convention).
  `site/src/lib/groovy-engine.js` is a hand-ported JS mirror of
  `src/groovy/*.py` (1D functions) plus a 2D Life-like extension the
  Python package doesn't have yet — if you change the Python math, update
  the JS to match, and vice versa. Static figures the site embeds (e.g.
  `regime_heatmap.png`) live in `site/public/assets/img/` (Vite's own
  static-passthrough convention, distinct from the repo-root `public/`)
  and are produced by `scripts/build_findings_assets.py` — keep that
  script as the source of those PNGs rather than letting the site
  recompute full sweeps itself; the site's live-computed charts
  (Questions page) work from small hardcoded/checked-in datasets, not
  from re-running `scripts/`. The Questions page's data-backed charts
  read `site/src/data/*.json`, which are *generated* by the matching
  `scripts/experiment_*.py` — regenerate via the script rather than
  hand-editing the JSON.
  **`vite.config.js`'s `base: '/groovy-commutator/'` is load-bearing** —
  this deploys as a GitHub Pages *project* site, not a user/root site, so
  every Vite-emitted asset URL needs that prefix or it 404s against the
  domain root (this shipped broken once already: HTML loaded, 200, but
  the JS bundle 404'd and the page rendered blank). Internal nav links and
  image `src` in the components are deliberately relative (no leading
  `/`) instead of using the base — don't "fix" them back to absolute.
- `public/` (repo root) — **generated**, gitignored. `npm run build
  --prefix site` produces it; `.github/workflows/pages.yml` does this in
  CI before every deploy. Never edit its contents directly — changes
  belong in `site/`. `.claude/launch.json`'s `site-dev` (Vite, hot reload)
  is the normal way to preview. Its `site-preview` config serves the
  built `public/` directly at the server root, **not** under
  `/groovy-commutator/`, so it can't catch base-path bugs like the one
  above — it's for checking page content/behavior only. To actually
  verify the base path, serve `public/` from inside a `groovy-commutator/`
  subdirectory of some root and load it from there.
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
