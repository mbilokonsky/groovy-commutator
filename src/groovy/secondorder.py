"""Second-order (Margolus-Fredkin style) reversible CA: memory via looking
one step into the rule's own causal past.

    S(t+1) = phi(S(t)) XOR S(t-1)

This is the standard, well-trodden way 1D CA get both memory and
reversibility for free -- S(t-1) = phi(S(t)) XOR S(t+1) recovers the same
relation run backwards, so no information is lost stepping forward. See
Margolus & Toffoli, "Cellular Automata Machines" (MIT Press, 1987), and
Fredkin's reversible-computing program.

It composes with the rest of this package without modification: D(t-1)
(operators.D applied to a past state) is just another array, so feeding a
derivative field in as the "memory" term instead of raw S(t-1) is a small,
well-typed variant worth trying -- not implemented here, left as an
extension point.
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
