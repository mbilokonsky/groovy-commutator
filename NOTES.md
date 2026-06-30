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
score. Unresolved — a real candidate for further work, not just
under-sampling.

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
