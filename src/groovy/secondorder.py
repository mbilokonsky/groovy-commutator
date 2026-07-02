"""Second-order (Margolus-Fredkin style) reversible CA: memory via looking
one step into the rule's own causal past.

    S(t+1) = phi(S(t)) XOR S(t-1)

This is the standard, well-trodden way 1D CA get both memory and
reversibility for free -- S(t-1) = phi(S(t)) XOR S(t+1) recovers the same
relation run backwards, so no information is lost stepping forward. See
Margolus & Toffoli, "Cellular Automata Machines" (MIT Press, 1987), and
Fredkin's reversible-computing program.

The generalization (now implemented): pass the memory through an arbitrary
elementary rule mu before XOR-ing it in,

    S(t+1) = phi(S(t)) XOR mu(S(t-1))

The standard construction is mu = rule 204 (output = center bit, the
identity CA). Inverting the recurrence needs mu(S(t-1)) = phi(S(t)) XOR
S(t+1) and then S(t-1) itself -- so the generalized form is reversible
IFF mu is an invertible CA. The elementary rules invertible on every ring
size are exactly the six trivial reversible ECAs {15, 51, 85, 170, 204,
240} (identity/complement/shift combinations).

The "feed D(t-1) in as the memory term" variant proposed in this module's
original docstring is the special case mu = phi XOR 204, by the prehoc
identity D(., psi) == rule (psi ^ 204). Corollary: D-memory preserves
reversibility exactly for phi in {0, 60, 102, 153, 195, 255} -- the
constant rules, the two-input additive rules 60 (left XOR center) and 102
(center XOR right), and their complements. Verified computationally in
scripts/experiment_memory_variants.py (including the backward
reconstruction for all six).
"""
from __future__ import annotations
import numpy as np
from .ca import apply_rule


def step_second_order(state_t: np.ndarray, state_t_minus_1: np.ndarray, rule_num: int) -> np.ndarray:
    """One reversible second-order step: phi(S(t)) XOR S(t-1)."""
    return np.bitwise_xor(apply_rule(state_t, rule_num), state_t_minus_1)


def run_second_order(state0: np.ndarray, state1: np.ndarray, rule_num: int, steps: int) -> np.ndarray:
    """Run the second-order recurrence forward `steps` times from the two
    seed states (state0 plays S(-1), state1 plays S(0)). Returns the full
    trajectory including the two seeds, shape (steps + 2, n)."""
    n = len(state1)
    traj = np.zeros((steps + 2, n), dtype=np.uint8)
    traj[0] = state0
    traj[1] = state1
    for t in range(steps):
        traj[t + 2] = step_second_order(traj[t + 1], traj[t], rule_num)
    return traj


def step_second_order_mu(state_t: np.ndarray, state_t_minus_1: np.ndarray,
                         rule_num: int, mu_rule: int) -> np.ndarray:
    """Generalized memory step: phi(S(t)) XOR mu(S(t-1)). mu = 204 recovers
    the standard reversible construction; mu = (rule_num ^ 204) is the
    D-memory variant (see module docstring)."""
    return np.bitwise_xor(apply_rule(state_t, rule_num),
                          apply_rule(state_t_minus_1, mu_rule))


def run_second_order_mu(state0: np.ndarray, state1: np.ndarray, rule_num: int,
                        mu_rule: int, steps: int) -> np.ndarray:
    """Forward run of the generalized recurrence, shape (steps + 2, n)."""
    n = len(state1)
    traj = np.zeros((steps + 2, n), dtype=np.uint8)
    traj[0] = state0
    traj[1] = state1
    for t in range(steps):
        traj[t + 2] = step_second_order_mu(traj[t + 1], traj[t], rule_num, mu_rule)
    return traj
