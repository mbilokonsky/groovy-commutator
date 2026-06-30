# Design brief: Groovy Commutator site overhaul

For claude.ai/design. There is no existing component system to sync —
this is a from-scratch design pass over a plain static HTML/CSS site.
Read the live site and the repo before proposing anything; both are
short.

- **Repo**: https://github.com/mbilokonsky/groovy-commutator
- **Live site (current, to be replaced)**: https://mbilokonsky.github.io/groovy-commutator/
  — `index.html`, `concepts.html`, `findings.html`, plain CSS in
  `public/assets/css/site.css`, figures in `public/assets/img/`.
- **New page to design in, not bolt on**: `INTERACTIVE_EXPLORER_SPEC.md`
  at the repo root is a full functional spec for a fourth page — a
  card-based tool for running and composing cellular-automaton
  instruments live in the browser. Read it in full; it explicitly leaves
  layout and UX-for-complexity undecided and hands that problem to this
  design process.
- **Source of truth for the math**: `src/groovy/` (Python). Every
  instrument named on the site (`D`, `E`, `G`, absential field,
  second-order memory, cross-rule divergence) has its canonical
  definition there, with docstrings that carry the derivation. The
  design shouldn't restate the math differently than what's there.

## What this site is for

Four things, in order, and the site's structure should make that order
legible to a first-time visitor:

1. **Define and socialize the boolean calculus and what's built on it.**
   Someone arriving with zero background should be able to build an
   intuition for XOR-over-GF(2), the State→State framing, and each
   instrument (derivative, commutator, absential field, reversible
   memory, cross-rule coupling) one piece at a time.
2. **Ask the novel questions this framework makes askable** — e.g. does
   a rule pair commute, what regime does their disagreement settle into,
   can a "Class IV-ness" indicator be found, what happens when rules
   generate their own successors.
3. **Run experiments that answer those questions** — this is what the
   interactive explorer is for: let a visitor actually run the
   instruments themselves, not just read about precomputed results.
4. **Publish the findings honestly**, including the negative and
   inconclusive ones, with explicit confidence levels (the current site's
   "Established / Suggestive / Exploratory" labeling on the findings page
   is a real content asset worth carrying forward in spirit, even if the
   visual treatment changes completely).

## Hard requirements

- **Visible watermark, on every content page**, stating plainly that the
  page's prose is an LLM-generated description of programmatically
  verifiable code/data — not hand-authored claims, not marketing copy.
  This should be honest and legible, not a buried footnote disclaimer.
- **Remove every reference to "wet-math" / the wet-math project.** The
  current `public/index.html` attributes the construction's origin to an
  external wet-math demo page — that attribution and link should not
  appear anywhere in the new site. (It's fine, and expected, for
  `CLAUDE.md`/`NOTES.md`/`README.md` in the repo to keep that history for
  internal/research purposes — those aren't part of the public site and
  are out of scope for this brief.)
- **Small, accessible, bite-sized components**, not long-form mathy
  prose. A reader unfamiliar with the domain should be able to engage
  with one visualization or one idea at a time and build intuition
  incrementally, rather than facing a wall of text or a dense equation
  block up front. This applies across all four pages, including how the
  interactive explorer introduces its own complexity (see the spec's
  "actual hard problem" section).
- **Responsive**, usable on mobile as well as desktop — the current site
  meets this bar; don't regress it.
- **Client-side only, static hosting** (GitHub Pages, deployed from
  `public/` via the existing GitHub Actions workflow at
  `.github/workflows/pages.yml`) — no backend assumptions anywhere,
  including in the interactive explorer.

## What to preserve in substance (re-express freely, don't drop)

- The five empirical pair regimes (commute / crystalline / noisy /
  structured / drain) and their definitions.
- The affine theorem and its statement.
- The full-sweep findings (32,640 pairs, regime distribution, the
  image_ratio-doesn't-predict-regime result, the regime heatmap).
- The newer, honestly-inconclusive results (absential field as a
  Class-IV detector — tested, didn't pan out, control test showed it was
  a density artifact; the meta-evolution generator comparison).
- The project's voice: confident about what's proven, explicit about
  what's only suggestive or exploratory, comfortable publishing a result
  that didn't confirm the hypothesis rather than hiding it.

Everything else — visual language, layout, navigation, color system,
typography, how the interactive explorer's cards actually look and
behave — is open. Propose freely.
