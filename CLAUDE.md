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

4. **Pilot sweep finding** (`classify.sweep`, n=11 rules, 1 seed/pair — small,
   treat as suggestive not settled): presence of a Class III (chaotic) rule
   in a pair predicts noise-like divergence almost regardless of its partner
   — chaos dominates the pairing. Class II–II pairs are the most
   structured/placid. The drain mechanism correlates with low `image_ratio`
   but is **not fully predicted by it alone** — rule 4 (image_ratio 0.051)
   drains to zero against rules 30, 126, 54, 110, but *not* against rule 18,
   despite rule 18 and rule 126 having identical image_ratio (0.135). Don't
   treat image_ratio as sufficient on its own; the actual mechanism is a
   finer structural compatibility between the specific pair, closer in spirit
   to Moore–Boykett's permutivity conditions than to a scalar score.

## Open task
**Full exhaustive sweep**: all 256 elementary rules, ~32,640 unordered
pairs, multiple seeds each (the pilot used 1 seed/pair, which is noisy).
Use `classify.sweep(rules={i: None for i in range(256)}, seeds=(1,2,3,4,5))`
or similar. This is fully tractable with the vectorized engine. Write
results to `results/` (e.g. as a parquet/csv with columns rule_a, rule_b,
final, peak, compressibility, drained, mean) rather than holding everything
in memory or dumping it into a notebook cell. Worth then re-running the
class-pair aggregation in `classify.WOLFRAM_CLASS` style across the full
sweep once results exist, since the n=11 pilot's class labels are informal
and the sample per cell was small (1–12 pairs).

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
- `public/` — static GitHub Pages export (currently a placeholder). When
  building this out, keep it a *consumer* of `results/` data (e.g. copy
  or symlink generated JSON/CSV in, or have a small build step) rather
  than a second place that recomputes sweeps.
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
