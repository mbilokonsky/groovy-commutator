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
     doesn't drain. The residual predictor error is NOT mainly ring-size
     mismatch — measured (`scripts/experiment_drain_scaling.py` →
     `site/src/data/drain_scaling.json`, all 2,150 converged + 6,000
     sampled non-converged): AUC 0.893 / 0.912 / 0.908 / 0.915 at
     n = 8/10/12/14. Saturates by n≈10; even 256 states nearly matches
     16,384. Remaining error is dominated by the ground truth (5 sampled
     seeds per pair at n=100), not the predictor's scale. The best
     operating point does sharpen slowly with n (F1 0.84 at n=8 → 0.88
     at n=14 with threshold scaled to 64 states).

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

8. **Non-uniform CA (rule-as-state): implemented; second collapse
   theorem; selection appears uninvited** (2026-07-01,
   `src/groovy/nonuniform.py`, JS mirror in
   `site/src/lib/groovy-engine.js`, `scripts/experiment_nonuniform.py` →
   `results/nonuniform_rulefield.csv` + `site/src/data/nonuniform.json`).
   Closes the "rule sharing state's dimensionality" open direction.
   - Rule field R = (n,)-array of rule numbers; `apply_rule_field` steps
     each cell by its own rule; `rule_field_bitplanes` exposes R as 8
     state-shaped binary fields (all existing diagnostics apply).
   - **Read-from-state collapses**: rule numbers re-read each step from
     the 8 state bits around each cell (`read_rule_field`) make
     S(t+1)[i] a fixed function of S(t)[i-3..i+4] — i.e. ONE uniform
     radius-4 CA. Verified cell-by-cell against the explicit 256-entry
     window LUT. Same moral as the prehoc collapse theorem: same-time
     self-reference buys nothing; the rule field must have its own
     memory.
   - **State-gated rule transport** (`step_gated_diffusion`: live cell
     copies left neighbor's rule, dead cell keeps its own; R persists):
     60 seeds, n=100, 200 steps. Diversity falls 82 → 20 median distinct
     rules and STABILIZES (never below 15) — sustained polyculture, not
     monoculture. Selection gradient is perfectly monotone:
     P(rule value survives | popcount) = 0.875 at popcount 0 falling to
     0.000 at popcount 8; restless-rule (bit0=1) cell share halves
     (0.498 → 0.189); yet cell share peaks at popcount 2-3, not 0 —
     persistence needs quiescence (only live cells get overwritten) but
     propagation needs live neighbors. Every heterogeneous condition
     (frozen random field 0.16, mosaic 0.11, gated transport 0.14,
     read-from-state 0.26) lands state-trajectory compressibility in the
     structured band, vs uniform baselines at the extremes (rule 4:
     0.03; rules 30/90: 1.00; rule 110: 0.82). Transport-scheme
     robustness now tested (`scripts/experiment_nonuniform_transport.py`
     → `site/src/data/nonuniform_transport.json`, 60 runs each):
     rightward copy reproduces every statistic (symmetry control); gated
     XOR-recombination — which INVENTS rules (57% of final cells carry
     values absent at t0, diversity plateau ~67 not ~20) — still shows
     the same selection direction (final pool enriched 2.1× at popcount
     0, depleted ~3× at the restless end, restless bit 0.50 → 0.25).
     The quiescence pressure belongs to the gate (only live cells get
     overwritten), not the variation mechanism. Plateau-vs-n scaling
     (`scripts/experiment_nonuniform_scaling.py`): median plateau
     10/21.5/36.5/63/96.5 distinct rules at n=50/100/200/400/800,
     log-log slope 0.81, each verified flat out to t=1600 — genuinely
     stable polycultures at every size, sublinear in n. Remaining
     caveats: 1D only; correlation, not proven mechanism.

9. **Absential Class-IV detector: established negative (fair 2D test);
   affine theorem is dimension-free** (2026-07-01, `src/groovy/ca2d.py`
   — Python 2D engine at parity with the JS one,
   `scripts/experiment_absential_2d.py` → `results/absential_2d.csv` +
   `site/src/data/absential_2d.json`). Seven Life-like rules from soup
   (60×60 — NOT 64×64, the parity rule is nilpotent on power-of-two
   tori; Day & Night at 0.5 soup density, it dies at 0.15), settled
   window steps 140-240, 8 seeds. Absential-field compressibility is a
   monotone rescaling of raw-state compressibility in every condition —
   slightly MORE compressible in 1D, slightly LESS in 2D (denser Moore
   halo), never cross-cutting — including the hypothesis's home turf
   (pure still-life fields 0.005 raw / 0.005 abs; pure glider fields
   0.034 / 0.051). Hypothesis dead; stop testing it. Consolation
   results: (a) plain settled-window compressibility bands the informal
   classes on its own (frozen 0.01-0.02, Class IV tight middle band
   0.32-0.36, additive 0.61, chaos 0.79); (b) B1357/S1357 "Replicator"
   is neighbor parity = the 2D rule 90, and G2 ≡ 0 on 50/50 random
   grids (Life nonzero on 50/50 controls) — the affine theorem (result
   1) is not a 1D artifact.

## New instruments (added 2026-06-30, from a separate chat-interface exploration)

Four directions came out of a parallel conversation; two are implemented,
one is a clear extension, one is intentionally left open. See `NOTES.md`
section 6 for the full writeup and citations.

- **Absential field** (`metrics.absential_field`, `operators.absential_trajectory`)
  — cells that are off but adjacent to an on cell (closed-neighborhood
  dilation minus the live set), distinct from "void" cells with no live
  neighbor. The candidate fast Class-IV-detector use is now settled
  negative — see established result 9 (fair 2D test with real gliders
  and still lifes; absential compressibility always tracks raw). The
  field itself remains a fine instrument (it IS elementary rule 50, per
  the prehoc collapse theorem).
- **Second-order / reversible memory** (`secondorder.py`) — Margolus-Fredkin
  style `S(t+1) = phi(S(t)) XOR S(t-1)`, plus the generalized
  `run_second_order_mu`: memory passed through an arbitrary rule mu.
  Exact result (2026-07-01, `scripts/experiment_memory_variants.py` →
  `site/src/data/memory_variants.json`): reversibility holds iff mu is
  invertible; only {15, 51, 85, 170, 204, 240} are invertible at every
  ring size (others sneak in at particular n — e.g. 14-16 bijective
  rules at odd n, exactly 6 at n=12); the D-memory variant is
  mu = phi^204 (prehoc identity), hence reversible exactly for
  phi ∈ {0, 60, 102, 153, 195, 255}. Backward reconstruction verified
  for all six; docstring carries the derivation.
- **Meta-evolution / rules birthing rules** (`metaevolution.py`) — each
  generation derives a child rule from the current state via a generator
  function, classifies the parent→child handoff with `classify_regime`,
  then (replace mode) adopts the child and evolves under it.
  The generator comparison is now run at scale (2026-07-01,
  `scripts/experiment_metaevolution_scale.py` →
  `results/metaevolution_scale.csv` + `site/src/data/metaevolution.json`:
  5 generators × 40 seeds × 3 starting rules = 600 lineages).
  Established: the affine-degenerate control G(·,90) locks in at exactly
  2.0 generations with zero variance (theorem-pinned floor); every
  information-carrying generator searches 3-5× longer with cleanly
  separated bootstrap CIs (g30 5.9 < absential 7.1 < d90_sample 10.1 ≈
  population_count 10.7); ordering stable across starting rules 90/30/110.
  CORRECTION to the old 8-seed reading: "richer generator → longer
  search" does NOT hold beyond the zero/nonzero information split —
  population count ties the 8-bit derivative sample at the top. Lock-in
  is 95-100%; the ~5% of population_count lineages that ran the full
  40-generation budget without cycling are budget-bound unknowns.
- **Non-uniform / heterogeneous CA** (rule space sharing state's
  dimensionality, i.e. per-cell rules instead of one global rule) — now
  implemented, see established result 8 (`nonuniform.py`). The
  historically-grounded framing (von Neumann's self-reproducing automaton
  carried construction instructions as patterns in the same substrate
  they acted on) turned out to have a sharp resolution: same-time
  self-reference collapses to a bigger uniform CA; rule-as-state becomes
  real exactly when the rule field carries its own memory.

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
