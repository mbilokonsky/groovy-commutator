"""The groovy commutator: D (differentiate), E (evolve), C (compare), and G
(the commutator), for a single rule -- plus the cross-rule generalization to
pairs of rules.

Single-rule construction (phi = an elementary CA rule):
    D(S) = S XOR phi(S)            differentiation
    E(S) = phi(S)                  evolution (I is trivial for elementary CA)
    G(S) = C(D(E(S)), E(D(S)))     the commutator

G(S) is literally the operator commutator [D, E] evaluated at the state S.
See NOTES.md for the derivation of the affine theorem (G(S) is constant
across all S iff phi is GF(2)-affine) and its correspondence to kinematic
vs. dynamical commutators in quantum mechanics.

Cross-rule construction (phi_a, phi_b = two different rules):
    cross_commutator(S) = C(phi_a(phi_b(S)), phi_b(phi_a(S)))
        -- does composition order matter, at this S?
    divergence_trajectory(S0, ...) -- two divergent unfoldings of the SAME
        initial state under the two different orderings, watched over time.
        This is the construction that produced the five empirical pair
        regimes documented in NOTES.md (commute / crystalline / noise /
        structured / drain).
"""
from __future__ import annotations
import numpy as np
from .ca import apply_rule


def C(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Comparison operator. XOR over GF(2)."""
    return np.bitwise_xor(a, b)


def D(state: np.ndarray, rule_num: int) -> np.ndarray:
    """Differentiation: S XOR phi(S)."""
    return C(state, apply_rule(state, rule_num))


def E(state: np.ndarray, rule_num: int) -> np.ndarray:
    """Evolution: phi(S)."""
    return apply_rule(state, rule_num)


def G(state: np.ndarray, rule_num: int) -> np.ndarray:
    """Single-rule commutator: C(D(E(S)), E(D(S)))."""
    return C(D(E(state, rule_num), rule_num), E(D(state, rule_num), rule_num))


def cross_commutator(state: np.ndarray, rule_a: int, rule_b: int) -> np.ndarray:
    """C(phi_a(phi_b(S)), phi_b(phi_a(S))) -- does composition order matter
    between two DIFFERENT rules, at this S?"""
    ab = apply_rule(apply_rule(state, rule_b), rule_a)
    ba = apply_rule(apply_rule(state, rule_a), rule_b)
    return C(ab, ba)


def divergence_trajectory(state0: np.ndarray, rule_a: int, rule_b: int, steps: int) -> np.ndarray:
    """Two divergent unfoldings from one shared initial state:
    path1 repeats (apply A, then B); path2 repeats (apply B, then A).
    Returns the disagreement field over time, shape (steps, n)."""
    n = len(state0)
    path1, path2 = state0.copy(), state0.copy()
    field = np.zeros((steps, n), dtype=np.uint8)
    for t in range(steps):
        field[t] = C(path1, path2)
        path1 = apply_rule(apply_rule(path1, rule_a), rule_b)
        path2 = apply_rule(apply_rule(path2, rule_b), rule_a)
    return field
