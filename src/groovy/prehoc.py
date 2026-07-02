"""Pre-hoc composition: 4-input rules, where a rule's own lookup table takes
a fourth binary input alongside the usual three spatial neighbors.

Everything else in this package composes fields POST-HOC: compute each field
independently, then XOR/compare the finished results (D, G, coupling,
reversible memory). A pre-hoc rule is different in kind -- the fourth input
participates in the lookup itself, before phi is ever evaluated.

Representation. A 4-input rule is a 16-entry LUT indexed by
8*x + 4*l + 2*c + r, packed into one integer 0..65535. Reading the two
8-entry halves as elementary rule numbers gives the canonical decomposition:

    table = (rule_x1 << 8) | rule_x0

i.e. EVERY 4-input rule is exactly an ordered pair of elementary rules,
with the fourth input x selecting per cell, per step, which of the two
applies. The 65,536-point 4-input rule space IS ordered-rule-pair space.

Separability. A 4-input rule is post-hoc decomposable -- expressible as
f(l,c,r,x) = g(l,c,r) XOR h(x) -- iff its two halves are equal (x ignored)
or bitwise complements (h(x) = x). That's 2*256 = 512 tables out of 65,536
(0.78%): almost all pre-hoc rules are NOT reachable by post-hoc composition.

Collapse theorem. If the fourth input is any same-time, radius-<=1 function
of the same state -- x_i = mu(S)_i where mu is itself an elementary rule --
then the 4-input rule collapses to an ordinary elementary rule:

    eff(l,c,r) = table[8*mu(l,c,r) + 4l + 2c + r]

Both of the "natural" candidate inputs proposed in the open question are of
this form and therefore buy nothing new:
    absential field:  A(S) = (l|r) & ~c        = elementary rule 50
    derivative:       D(S) = c XOR psi(l,c,r)  = elementary rule (psi ^ 204)
(204 = 0b11001100 is the rule whose output is just the center bit, so
XOR-ing it into psi's table flips exactly the c=1 entries.)

A fourth input escapes the collapse only if it comes from another TIME
(memory, cf. secondorder.py) or another TRAJECTORY (a second layer with its
own dynamics). `coupled_trajectory` implements the second: two layers, each
stepped by a 4-input rule whose x is the *other* layer's current state.
"""
from __future__ import annotations
import numpy as np
from .ca import apply_rule, rule_lut

# Elementary rule numbers for the two collapse-theorem examples.
ABSENTIAL_RULE = 50   # (l|r) & ~c
CENTER_RULE = 204     # output = center bit; D(.,psi) == rule (psi ^ 204)


def rule4_lut(table_num: int) -> np.ndarray:
    """16-entry lookup table for a 4-input rule, indexed by 8x + 4l + 2c + r."""
    return np.array([(table_num >> i) & 1 for i in range(16)], dtype=np.uint8)


def rule4_from_pair(rule_x0: int, rule_x1: int) -> int:
    """Canonical decomposition, inverted: the 4-input rule that applies
    rule_x0 where x=0 and rule_x1 where x=1."""
    return (rule_x1 << 8) | rule_x0


def rule4_pair(table_num: int) -> tuple[int, int]:
    """The ordered pair (rule where x=0, rule where x=1) of a 4-input rule."""
    return table_num & 0xFF, (table_num >> 8) & 0xFF


def is_separable(table_num: int) -> bool:
    """True iff the rule is post-hoc decomposable: f = g(l,c,r) XOR h(x)."""
    x0, x1 = rule4_pair(table_num)
    return x1 == x0 or x1 == (x0 ^ 0xFF)


def apply_rule4(state: np.ndarray, x: np.ndarray, table_num: int) -> np.ndarray:
    """One synchronous step of a 4-input rule on a periodic lattice, with
    the fourth input supplied as an explicit per-cell field x."""
    lut = rule4_lut(table_num)
    l = np.roll(state, 1)
    r = np.roll(state, -1)
    return lut[8 * x + 4 * l + 2 * state + r]


def collapse_to_elementary(table_num: int, mu_rule: int) -> int:
    """The elementary rule a 4-input rule collapses to when its fourth input
    is x = mu(S) for an elementary rule mu (same time, same radius)."""
    lut4 = rule4_lut(table_num)
    mu = rule_lut(mu_rule)
    eff = 0
    for idx in range(8):
        eff |= int(lut4[8 * int(mu[idx]) + idx]) << idx
    return eff


def coupled_trajectory(state_a0: np.ndarray, state_b0: np.ndarray,
                       table_a: int, table_b: int, steps: int) -> dict:
    """Two layers, mutually pre-hoc coupled: each step (synchronous),
    layer A steps by table_a with x = B's current state, and layer B steps
    by table_b with x = A's current state. This is the construction that
    genuinely escapes the collapse theorem -- the fourth input comes from
    another trajectory, not from the layer's own neighborhood.

    Returns dict with 'a', 'b' (each (steps, n)) and 'diff' = C(a, b)."""
    n = len(state_a0)
    a, b = state_a0.copy(), state_b0.copy()
    field_a = np.zeros((steps, n), dtype=np.uint8)
    field_b = np.zeros((steps, n), dtype=np.uint8)
    for t in range(steps):
        field_a[t] = a
        field_b[t] = b
        a, b = apply_rule4(a, b, table_a), apply_rule4(b, a, table_b)
    return dict(a=field_a, b=field_b, diff=np.bitwise_xor(field_a, field_b))
