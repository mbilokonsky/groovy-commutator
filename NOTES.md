# Notes — conceptual writeup, citations, open threads

This is the "why," kept separate from `CLAUDE.md` (the "what to build next")
so a session doing pure extension work doesn't have to wade through the
interpretive material, and a session doing interpretive work has it in one
place.

## 1. Origin

The construction starts from https://liet-codes.github.io/wet-math/commutator.html
— five operators (φ rules, D differentiation, I integration, C comparison, E
evolution = derived as `I(S, D(S))`), and the commutator
`G(S) = C(D(E(S)), E(D(S)))`, read against Wolfram's CA classes: G=0 dead,
G≠0 random is noise, G≠0 structured is "the fingerprint of aliveness."

The first reframe: `G(S)` is not merely *analogous* to the quantum operator
commutator `[A,B] = AB - BA` — for `C` = XOR (the group-difference operation),
it *is* that construction, literally: `G = [D, E]` evaluated at S.

## 2. The affine theorem and the kinematic/dynamical split

For elementary CA, `E(S) = phi(S)`, `D(S) = S XOR phi(S)`. Working the
algebra: if `phi` is GF(2)-affine (`phi(X) = M·X ⊕ c` for some GF(2)-linear
M and constant bias c), then `phi(A⊕B) = phi(A)⊕phi(B)⊕c`, and that alone
forces `G(S) = c` for *every* S, not just on average.

**Theorem**: D and E commute identically (for all states) iff phi is
GF(2)-affine. Confirmed computationally for elementary CA rules 0, 90, 150
(c=0, G≡0) and 165, 105 — complements of 90/150, so still affine but with
c=1 — where G(S) is the *same nonzero constant array* for every random S
tested (density 1.000, exact match across trials).

This connects directly to the established theory of additive/linear
cellular automata (the GF(2)[x, x⁻¹] polynomial-ring treatment of CA rules —
rule 90 = x + x⁻¹, rule 150 = x⁻¹+1+x — going back to Martin, Odlyzko &
Wolfram's "Algebraic Properties of Cellular Automata," 1984).

### Correspondence to QM
`[x̂, p̂] = iħ` is *also* a state-independent constant — an operator identity,
not a property of any particular wavefunction. By the framework's own logic
this is the **crystalline** regime (the rule-165 case), not the "Class IV /
aliveness" regime the origin page filed it under. The canonical commutator
is the floor, not the dance.

The genuinely *dynamical* QM commutator is Ehrenfest's: `d⟨Â⟩/dt = (i/ħ)⟨[Ĥ,Â]⟩`.
`E` plays the role of the generator of time-translation here, same as `Ĥ`.
`[Ĥ,Â]=0 ⟺ Â conserved` is Noether's theorem in commutator clothing —
an unplanned back-reference to the Noetherpoetics work (symmetry ⟺
conservation law), arrived at independently via this route.

Where "Class III vs IV" actually shows up in real QM: **spectral
statistics**. Berry–Tabor: integrable systems (lots of operators commuting
with Ĥ) → Poisson level-spacing statistics. Bohigas–Giannoni–Schmit: chaotic
systems (nothing left commuting with Ĥ but Ĥ itself) → random-matrix
(Wigner-Dyson) statistics, level repulsion. And the actual physical address
of "Class IV, structured non-commutation, alive": **quantum scars** /
weak ergodicity breaking (Turner, Michailidis, Abanin et al., the PXP model,
2017–) — chaotic many-body systems that should fully thermalize but certain
states keep returning to something close to where they started.

## 3. Cross-rule commutators (pairs of rules)

The move: instead of `[D, E]` for one rule, ask whether two *different*
rules' evolution operators commute: `cross_commutator(S) = C(phi_a(phi_b(S)), phi_b(phi_a(S)))`.

**This is a real, solved problem with a name**: Cristopher Moore & Timothy
Boykett, "Commuting Cellular Automata," *Complex Systems* 11(1), 1997
(Santa Fe Institute working paper 97-08-076 before that). They give the
algebraic conditions: if either rule is permutive, the other can be written
in terms of it; if either is a group, the other is linear in it; if either
is permutive-and-affine, the other must be affine too. The empirical results
here line up with this exactly, with a confirming wrinkle: among the affine
family, pairs either fully commute or disagree by a fixed constant — never
partially, never randomly (90↔150 commute; 90↔165 disagree by a constant
1-array; 150↔165 and 150↔105 commute; 165↔105 disagree by a constant).

Older root: Hedlund 1969, "Endomorphisms and Automorphisms of the Shift
Dynamical System" — the *centralizer problem*: what is the full set of
things that commute with a given CA? Generic/complex rules have trivial
centralizers; special rules have large ones.

Adjacent but distinct field: confluence theory / Church-Rosser, specifically
the **Hindley-Rosen lemma** — when does the union of two reduction relations
stay confluent, i.e. when do divergent rewrite paths *reconverge*? Different
question (eventual rejoining vs. persistent commutator structure) but
genuinely related — see the "drain" regime below, which behaves like a
confluence phenomenon.

Bridge back to physics: **Trotter-Suzuki product formulas / Baker-Campbell-
Hausdorff**. Simulating two different generators (Hamiltonians) by
alternating them has an error term governed by `[H_A, H_B]` and its nested
commutators — the literal continuous/quantum analog of "same initial
condition, divergent unfoldings, does order matter." The discrete bridge is
**quantum cellular automata** (Schumacher & Werner; Arrighi et al.) — unitary,
causal, shift-invariant local rules, where Lieb-Robinson bounds govern how
fast disagreement between two rules can propagate across a lattice.

## 4. The five empirical pair regimes

From `operators.divergence_trajectory`: same initial state S0, path1 =
repeat(apply A, then B), path2 = repeat(apply B, then A). Track disagreement
density and compressibility of the resulting field over time.

| regime | example pair | shape | compressibility |
|---|---|---|---|
| commute | 90, 150 | flat 0 forever | trivial (all-0 field) |
| crystalline | 90, 165 | instant jump to flat constant 1 | trivial (constant field) |
| noisy divergence | 110, 30 | settles ~0.5, jagged | ~1.0 (indistinguishable from noise) |
| structured divergence | 110, 54 | settles ~0.5, visible regular ripple | ~0.45 (well below noise) |
| drain | 184, 250 | spikes then decays to 0 | low (trivial once collapsed) |

The structured-divergence regime is the one that doesn't exist in the
single-rule case at all — two individually nonzero, individually "alive"
rules producing a *relationship* that's neither identity nor noise. See
section 5 for the interpretive extension this prompted.

### The drain mechanism (not coordination)
Decisive test: two **completely independent** random initial states (48%
Hamming distance, no shared origin) run under (184-then-250 repeated) and
(250-then-184 repeated) converge to the *identical* all-ones state by step
12. Rules out coordination between the paths directly — if it were
coordination, unrelated origins should produce unrelated outcomes.

Mechanism: exhaustive enumeration of `image_ratio` (n=14) shows rule 184 at
0.31 and rule 250 at 0.16 — most of state space is Garden-of-Eden
configurations (no predecessor; Moore–Myhill garden-of-eden theorem, 1962/63).
Composing two lossy maps repeatedly shrinks the reachable region of state
space until there's no room left for two trajectories to stay
distinguishable. It's entropy death, not relationship. Rule 0 is the
totalizing limit case: exactly one possible output ever, so it drains
*everything* instantly, no exceptions.

Caveat, confirmed not to be the whole story: image_ratio alone does not
fully predict drain. Rule 4 (image_ratio 0.051) drains to zero against rules
30, 126, 54, 110 — but not against rule 18 (settles at 0.35), despite rule
18 and rule 126 sharing the same image_ratio (0.135). The actual condition
is a finer structural compatibility between the specific pair, more in the
spirit of Moore-Boykett's permutivity conditions than a scalar lossiness
score.

**Resolved (2026-07-01)** — see CLAUDE.md result 5 for the numbers. The
condition is pairwise and two-part: the *composed* round map's eventual
image (exhaustive at n=12, iterate until the image stops shrinking) must
collapse to a tiny set, and the two orderings must collapse into the *same*
set. Crystalline turns out to be the structural near-miss — a similar
collapse into *disjoint* (constant-offset) attractors — which is a
satisfying echo of the affine picture in section 2: the crystalline
disagreement constant is exactly the fixed offset between the two
attractor copies. The experiment also forced a taxonomy correction: the
sweep's shape-based drain label (peak − final > 0.15) both over-counts
(2,754 "drains" that never converge, median final disagreement 0.418 —
transient decay, not convergence) and under-counts (895 "quiet drains"
filed as crystalline because the transient stayed under the threshold).
"Drain" as a mechanism should be read as: convergence of both orderings
onto a literally shared attractor — entropy death into a shared grave —
and it is visible from a 4,096-state toy computation. The Hindley-Rosen /
confluence analogy in section 3 lands more precisely now: drain is the
confluent case, crystalline the case where the critical pair never
resolves but stays at fixed distance.

## 5. Open interpretive thread: Unus Mundus as rule composition

Not physics — flagged honestly as the speculative edge, prompted by (and
discussed in terms of) the Pauli-Jung correspondence and the unus mundus
concept.

The naive reading of "one world" treats oneness as *sameness of outcome* —
psyche and matter secretly the same substance, hence correspondence. That's
the G=0 / fully-commuting case: agreement with nothing left over to mean
anything.

The reframe this construction suggests: oneness as *sameness of substrate*,
not of outcome. One S0, one shared vocabulary of operations, two different
orderings run out from the same starting condition — not required to agree.
On this reading:
- full commutation (G=0) is pure causal closure, no remainder, nothing to
  call meaningful because nothing is left unexplained
- noisy divergence is coincidence with no spine, forgettable
- structured divergence (110-vs-54 style) is the candidate formal image of
  "meaningful coincidence": two unfoldings off a shared source that never
  fully merge and never fully part, persistently structured, persistently
  recognizable as related without being identical
- drain is explicitly flagged as the false positive to watch for: an
  apparent convergence-into-unity that is actually mutual information
  destruction, not relationship. Worth treating as a standing corrective
  against over-reading convergence as synchronicity.

This thread is sitting at the edge of the walk, not extended into anything
more formal yet. If picked back up, the natural next step is probably
asking what a second `E` (a generator for a second, non-CA process) would
need to look like for `cross_commutator` to even be well-typed across the
two domains, rather than pushing the CA metaphor further on its own.

## 6. New instruments: absential view, second-order memory, meta-evolution

Four ideas surfaced in a separate chat-interface conversation (not this
codebase), each landing on existing literature once stated precisely.
Implementation status and code locations are in `CLAUDE.md`'s "New
instruments" section; this section is the why and the citations.

**Absential cells.** "Absential" is Terrence Deacon's term (*Incomplete
Nature: How Mind Emerged from Matter*, 2011) for absence that does causal
work by virtue of what it's absent *relative to* — distinct from inert
"void." A cell that's off but adjacent to a live cell is absential in
exactly this sense; a cell that's off and far from anything live is void.
Formally this is already standard in two adjacent fields: graph theory's
**closed neighborhood** `N[S] = S ∪ N(S)`, and image processing's
**morphological dilation** (Minkowski sum of the live set with a unit
structuring element). What's novel here isn't the set operation, it's the
proposed *use*: running the structure/noise compressibility diagnostic
(`classify.compressibility`) on the absential field's trajectory instead
of on `G`, as a candidate cheap Class-IV detector — a still life's
absential ring should be small and frozen, a Class III pattern's should
churn at high density with no structure, a glider's should trace a
compressible, persistent moving shape. Untested against known Class I-IV
rules so far.

**Second-order / reversible memory.** `S(t+1) = phi(S(t)) XOR S(t-1)` is
the standard Margolus-Fredkin construction for giving 1D CA both memory
and reversibility (Margolus & Toffoli, *Cellular Automata Machines*, MIT
Press, 1987; see also Fredkin's reversible-computing program) —
well-trodden, not a new result, but it slots into this package cleanly:
the "rule looks one step into its own causal past" intuition is exactly
this, and `D(t-1)` (this package's own derivative, evaluated at a past
state) is just another array that could be fed in as the memory term
instead of raw `S(t-1)`.

**Dimension-preserving views and rule space.** `D`, `G`, and the absential
mask are all `State -> State` maps — same shape, same index structure as
the state itself. The open question this raises: can the *rule* live in
that space too, rather than sitting outside it as a fixed 8-bit number?
For elementary CA the answer is awkward as posed — rule space is fixed at
8 bits regardless of `n`, it has no natural per-cell dimensionality. The
real move that gets there is **non-uniform / heterogeneous cellular
automata**: give every cell its own local rule instead of one shared
global rule, and the rule-field genuinely has the same shape as the
state, sitting right alongside it. This isn't a new idea either — it's
arguably the *founding* idea of the field, abandoned for the cleaner
single-global-rule case that's dominated since: von Neumann's original
self-reproducing automaton had cells whose construction instructions were
themselves patterns of cell states, read and written through the same
substrate they lived in. Not implemented in this package; flagged as open
in `CLAUDE.md`.

**Meta-evolution: rules birthing rules.** The idea: each generation
derives a *candidate child rule* from the current state via some encoding
function, classifies the parent→child relationship with the same
five-regime diagnostic used for ordinary rule pairs, and either the child
"decoheres" — failing to find a stable relationship with its parent,
either **draining** (collapsing into a shared trivial fixed point, no new
layer, pure absorption) or **diverging as noise** (no relationship at all)
— or it **cohcoheres** into a stable new layer, landing in **structured
divergence**: the regime that doesn't exist for a single rule, where
parent and child stay in a persistent, compressible, non-identical
relationship. Whether a given drill stabilizes plausibly depends on
*representational capacity* — does the child rule's state space have
enough room (image_ratio, non-lossiness) to sustain a structured
relationship rather than draining — a quantity this package already
computes (`metrics.image_ratio`).

The real research lineage this sits inside, so the build extends it
rather than rediscovering it from scratch: **open-ended evolution** in
artificial life. Tom Ray's *Tierra* (1991) and Channon's "survivor list"
work both ask what keeps evolutionary search generating novelty instead
of collapsing into a stable, boring attractor; more recently Bert Chan's
exploration of Lenia's rule space asks the same question with continuous
CA — most mutations are dead ends, a few open into sustained complexity,
nobody has a clean predictive theory of which.

A smallest-possible version was run live in the originating conversation
(not yet committed as a script here, see `metaevolution.lineage` for the
implemented version): one lineage, starting at rule 90, each generation's
child rule = population count of the current state mod 256 (replace
mode — child takes over, lineage continues under it), classified with
this package's five-regime diagnostic. It wandered through several
structured and noisy handoffs and then, at generation 10, found a stable
two-cycle in rule space itself: rule 12 generates rule 6, rule 6
generates rule 12, forever. A terminal node — a small, found, stable
attractor, not a runaway Class-IV generative tower. One run, one seed,
one deliberately crude encoding (population count collapses a lot of
distinct states to the same child rule), so this specific cycle shouldn't
be read as cosmically significant — but the phenomenon (explore, then
lock into a small self-sustaining loop) showed up unprompted, on the
first try, in the simplest possible version of the system. Confirmed
reproducible on rerun in this codebase (`metaevolution.lineage`, see
smoke test in commit history).

The obvious lever, and the actual open question: the encoding function.
Population count is close to the lowest-information generator possible.
Swapping it for something built from the absential field, from `G(S)`, or
from `D(S)` sampled at a few positions should plausibly produce both a
larger reachable set of stable platforms and longer searches before
locking in.

**That experiment has now been run** (`scripts/build_findings_assets.py`,
results in `results/metaevolution_generators.csv`): 5 generators × 8 seeds
× 40-generation budget, all starting from rule 90. Every run locked into a
cycle within budget, but mean generations-to-lock-in varied a lot by
generator: `g90_popcount` (a deliberate degenerate control — G(·,90) ≡ 0
for every state by the affine theorem, so this generator carries zero
information) locks in almost immediately (~2 generations); `absential_count`
~5.4; `g30_popcount` (same construction, but rule 30 is non-affine so this
one *does* carry information) ~5.9; `population_count` ~9.1;
`d90_sample` (8 bits sampled from `D(state, 90)`) explores longest, ~10.6
generations before locking in. Small sample (8 seeds), one starting rule,
one starting state distribution — call this suggestive, not settled — but
the direction matches the hypothesis: richer/more-informative generators
search longer before finding a stable platform, and the affine-degenerate
control sits exactly where it should, at the floor. Good first empirical
anchor for "representational capacity" as the thing that's actually being
selected on.

**Absential field as a Class-IV detector — tested, inconclusive so far.**
Ran `absential_trajectory` against one canonical example each of class
I/II/III/IV (rules 0, 4, 30, 110) and compared `compressibility` of the
absential-field trajectory against compressibility of the raw state
trajectory. Result: they track each other closely at this sample size
(e.g. rule 110: raw 0.920 vs. absential 0.828; rule 30: raw 1.005 vs.
absential 0.905) — the absential view is consistently a little more
compressible than the raw state, but not dramatically, and not in an
obviously class-discriminating way beyond what raw-state compressibility
already shows. Doesn't confirm the original hypothesis (a "cheap fast
Class-IV detector" distinct from existing diagnostics) on this small test.
Worth a real test before discarding: more rules per class, the actual
glider/still-life cases the hypothesis was framed around (gliders don't
really exist as objects at the elementary-CA scale the same way they do
in Conway's Life — the closer test would be a CA with known stable
localized structures), not just four representative rules.

## 7. Pre-hoc composition: the fourth input, and what it took to make it real

The open question on the site's questions page ("what if a rule's
neighborhood could include cells from a different layer?") is now
implemented (`src/groovy/prehoc.py`, 2026-07-01). Three things came out of
making it concrete, in increasing order of interest.

**The 4-input rule space is ordered-rule-pair space.** Index the 16-entry
table by `8x + 4l + 2c + r` and the two 8-entry halves are just two
elementary rules — the fourth input is a per-cell, per-step *selector*
between them. This makes the space legible instead of astronomical: 65,536
tables = 256×256 ordered pairs. Only 512 tables (0.8%) are separable into
post-hoc form `g(l,c,r) XOR h(x)` (halves equal or complementary). So
"coupling as a degenerate case of pre-hoc composition" is exactly right,
and it is a *thin* degenerate case.

**The collapse theorem.** The two inputs the original question proposed —
feed in D(S) or the absential field A(S) as the fourth neighbor — turn out
to be self-defeating, provably: any fourth input that is a same-time,
radius-1 function of the same state (x = mu(S) with mu elementary) makes
the 4-input rule collapse to a plain elementary rule,
`eff[idx] = table[8*mu[idx] + idx]`. Both proposed inputs are of that form:
A(S) is elementary rule 50 ((l|r) & ~c), and D(·,psi) is elementary rule
psi ^ 204 (204 outputs the center bit, so the XOR flips exactly the c=1
entries of psi's table). The generalization of the escape routes is clean
and connects to existing lineages: the fourth input must come from another
*time* — which is precisely CA-with-memory (Alonso-Sanz's program, and the
Margolus-Fredkin second-order construction already in `secondorder.py`) —
or another *trajectory*, i.e. a second layer with its own dynamics, which
is where the experiment went.

**Coupled layers, and emergence from boring parts.** Two layers, each
stepped by a 4-input rule whose x is the other layer's current state
(`prehoc.coupled_trajectory`). Sampling 1,500 random pre-hoc couplings vs
1,500 post-hoc XOR controls (`scripts/experiment_prehoc_coupling.py`):
the control population is almost entirely noise (median compressibility
1.01 — XOR-ing an uncorrelated layer into a trajectory is a randomizer),
while pre-hoc couplings span the whole range from frozen to noise (median
0.70). The screen for emergence — all four component rules boring alone
(solo compressibility < 0.10, i.e. fixed or small-cycle) while the coupled
trajectory lands in the structured band — surfaced 3/1,500 samples, each
robust across 20 rerolled initial conditions: (77,55|44,23),
(237,93|71,221), (164,235|223,160). This is the project's clearest
instance of a *relationship* carrying information its relata don't — the
structured-divergence story from section 4, but generative rather than
diagnostic: there the structure showed up in the disagreement field
between two unfoldings; here it shows up in the trajectories themselves,
manufactured by mutual sensitivity between two otherwise-inert dynamics.
The unus-mundus thread in section 5 gains a sharper formal image from
this: "one substrate, two orderings" becomes "two substrates, each
constituted partly by the other's presence" — closer to Deacon's
constitutive absence than the divergence construction ever was, since each
layer's next state is literally a function of what the other layer is.

Honest limits: one sampling run, one coupling topology (mutual, symmetric,
same-time), one lattice size, and "boring/structured" read off the same
zlib compressibility diagnostic used everywhere else — a richer emergence
criterion (transfer entropy between layers, say) is untested. The
selector decomposition also suggests an unexplored bridge back to
meta-evolution: a lineage's generator could emit *pairs* of rules plus a
coupling, instead of single rules.
