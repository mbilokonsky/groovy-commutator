# Interactive CA Explorer — functional spec

Handoff document for design work on a fourth page of the Groovy Commutator
site. This spec defines *what the tool needs to be able to do and why* —
visual language, layout, and the UX solution to the complexity problem
are explicitly out of scope here and left to the design process this
document feeds into.

## Context

- Repo: https://github.com/mbilokonsky/groovy-commutator
- Live site (3 pages today): landing (`public/index.html`), concepts
  (`public/concepts.html`), findings (`public/findings.html`) — static
  HTML/CSS, no build step currently, deployed to GitHub Pages via GitHub
  Actions from `public/`.
- Python reference library: `src/groovy/` — this is the **canonical
  semantics** for every operator below. Any reimplementation (JS or
  otherwise) must match it bit-for-bit; the docstrings in that package
  carry the math and should be treated as the spec for each operator's
  definition, not re-derived.
- Conceptual grounding for all vocabulary used below (`D`, `E`, `G`, `C`,
  absential field, second-order memory, cross-rule divergence) is on the
  existing `concepts.html` page — read that first, it's short and
  establishes the project's voice.
- This is the fourth page: **an interactive explorer**, sitting alongside
  landing/concepts/findings, where a visitor builds and runs these
  instruments themselves instead of only looking at precomputed figures.

## The core idea

Every instrument in this project is a function from one or more
**State → State** sequences to a new **State → State** sequence — same
shape in, same shape out, stackable over time into a space-time field,
renderable as an image. That uniformity (see "Everything is State → State"
on the concepts page) is what makes an open-ended, composable explorer
possible at all: nothing here needs a bespoke UI per instrument, because
every instrument is the same *shape* of thing.

The explorer's atomic unit is a **card**. A card has:

- one or more **inputs** — either a freshly-specified initial condition
  (for a source card) or references to other existing cards' output
  (for a transform/composition card)
- a **rule or operation** — either a CA rule (1D elementary, or a 2D
  rule — see "Dimensionality" below) or one of the instrument operations
  catalogued below
- a **run length** (number of steps)
- a **rendered output** — the resulting space-time field, toggleable on/off
  per card without deleting the card

Any card's output can be selected as the input to a new card. This is
the "lock in a view as a neighbor for a higher-order rule" requirement —
a card has no privileged status as a "base" state; an absential view of a
groovy commutator can itself be coupled against the raw base state in a
new card, indefinitely.

## Card types

### 1. Source cards
Define an initial condition (random w/ seed, hand-drawn/toggled grid,
or a named preset — e.g. a glider for 2D) and a rule, and run it forward.
Produces a State → State trajectory. This is the only card type that
doesn't reference another card.

### 2. Transform cards (pointwise, single input)
Consume **one** upstream trajectory (from any source or other card) and
apply one of these, step by step, producing a new trajectory of the same
shape:

| Operation | Definition | Needs a rule? |
|---|---|---|
| Raw state | identity, pass-through | no |
| `D` (derivative) | `S ⊕ φ(S)` | yes |
| `G` (single-rule commutator) | `C(D(E(S)), E(D(S)))` | yes |
| Absential field | closed-neighborhood dilation minus live set | no |
| Second-order / reversible step | `S(t+1) = φ(S(t)) ⊕ S(t−1)` | yes |

(See `src/groovy/operators.py`, `metrics.py`, `secondorder.py` for exact
implementations.)

### 3. Comparison cards (pointwise, two inputs)
Consume **two** upstream trajectories of matching shape (same `n`, same
step count — the UI should make mismatches obvious/impossible rather
than erroring silently) and XOR them together, step by step:
`C(streamA(t), streamB(t))`. This is the generic "does X disagree with Y
at this moment" card — it doesn't care how either stream was produced,
which is what makes arbitrary composition ("absential view of the
commutator, compared against the base state") possible.

### 4. Coupling cards (generative, two rules + shared IC)
This is **not** the same mechanism as a comparison card, and the UI
should not conflate them. `cross_commutator` / `divergence_trajectory`
(see `operators.py`) drive their own simulation clock: starting from one
shared initial condition, path 1 repeats (apply rule A, then rule B),
path 2 repeats (apply rule B, then rule A), and the two paths are
compared at each step. A coupling card therefore needs:
- one shared initial condition (drawn fresh, or **taken from an existing
  source card's initial condition** — reusing a source card's IC without
  reusing its rule should be supported, since "couple a different ruleset
  against the same starting conditions" is an explicit requirement)
- two rule selections (A and B)
- it produces its own new trajectory (the disagreement field), which can
  then itself feed into transform/comparison cards downstream like
  anything else

## Dimensionality

1D and 2D should both be supported, selected per source card.

- **1D**: existing elementary CA (8-bit Wolfram rule numbering,
  `src/groovy/ca.py`). Rendering: classic space-time diagram (each row =
  one timestep, stacked top to bottom) — this works because all of time
  fits in one static image.
- **2D**: not yet implemented anywhere in this codebase — this page would
  be the first. Needs a 2D rule abstraction (recommend starting with
  Life-like outer-totalistic rules, Moore neighborhood, B/S notation,
  since it covers Conway's Life as the obvious anchoring example and
  generalizes cleanly). Rendering: a 2D grid *per timestep*, so unlike 1D
  there's no single static image for an entire run — needs playback
  (play/pause/step/scrub) or a small-multiples filmstrip.
- All instruments above (`D`, `G`, absential, second-order, comparison,
  coupling) are dimension-agnostic by construction — none of the
  definitions reference 1D-specific structure, they're all just
  neighbor-union / XOR operations on bit arrays of whatever shape the
  state is. The only dimension-specific pieces are (a) the rule
  application itself and (b) rendering.
- **Open architectural question, flagged not resolved**: this project's
  working convention (see `CLAUDE.md`) treats `src/groovy/` as the
  canonical source of truth for the math, with any other implementation
  required to match it. 2D CA doesn't exist there yet. Whoever implements
  this should decide whether 2D semantics get a canonical Python
  definition first (consistent with that convention) or whether this
  explorer is allowed to be the first and only implementation of 2D CA
  in the project. Not this spec's call to make.

## Required interactions (concrete scenarios to design against)

1. Pick 1D or 2D, pick a rule, pick/draw an initial condition, run N
   steps, see the result.
2. Toggle multiple instrument views (raw state / `D` / `G` / absential /
   second-order) for the *same* underlying run, rendered in parallel,
   without re-specifying the rule or IC for each.
3. Run Conway's Life (2D), then couple it against a different 2D
   ruleset, same starting condition, and render the resulting commutator.
4. Add a second coupling of the same two rules against a *different*
   starting condition, rendered alongside the first, for comparison.
5. Take an existing card's absential view of a groovy-commutator card,
   and create a new comparison card that XORs that against the original
   base-state card. (Tests arbitrary-depth composition, not just
   one-hop.)
6. Remove or collapse a card without breaking cards downstream that
   reference it (or: make clear what breaks, if removal is disallowed
   while dependents exist).

## The actual hard problem

Every piece above is individually simple; the danger is a blank canvas
where a curious user spins up a dozen cards, half of them referencing
each other, and loses track of what's driving what or why a given view
looks the way it does. **Solving that is explicitly the design problem
this spec is handed off for** — this document deliberately does not
prescribe a layout, a node-graph-vs-dropdown interaction model, or a
visual language for distinguishing card types. Known constraints to
design within:

- Static site, client-side only, no backend (GitHub Pages).
- Must remain usable on mobile, matching the rest of the site (the
  existing three pages are responsive down to ~375px wide).
- Performance is not the constraint — 1D runs (n~100–300, steps~100–300)
  and 2D runs (~100×100–200×200 grid, ~100–300 steps) are both well within
  real-time budget for client-side JS with typed arrays, even with
  several cards live at once. Don't let perceived performance risk drive
  UX simplification that isn't otherwise warranted.
- Should read as part of the same project as the existing three pages —
  same voice, same honesty-about-confidence ethos (the findings page's
  "Established/Suggestive/Exploratory" framing is a good model for how
  this project talks about itself) — but visual language/design system
  is being defined fresh through this design process and may be applied
  back across all four pages.

## Explicit non-goals

- Not asking for new Python/`src/groovy/` work as part of this spec —
  flagged the 2D-semantics question above but didn't resolve it.
- Not asking the design process to alter the *content* of the existing
  findings (the data and conclusions on `findings.html`), only to
  potentially restyle it as part of a broader visual-system pass.
