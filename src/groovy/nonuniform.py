"""Non-uniform (heterogeneous) cellular automata: a rule PER CELL instead of
one global rule, making the rule field a first-class, state-shaped object.

This answers the shape question that has been open since the instruments
were added (see CLAUDE.md "New instruments", NOTES.md section 6): D, G, and
the absential mask are all State -> State maps, but the rule sat outside
that space as a fixed 8-bit number. Here the rule field R is an (n,)-array
of rule numbers living alongside the state S -- same index structure, same
diagnostics apply (a rule-field trajectory is 8 bit-planes of state-shaped
binary fields, so classify.compressibility works on it unchanged).

Historically this is the FOUNDING idea of the field, not an exotic variant:
von Neumann's self-reproducing automaton stored construction instructions
as patterns in the same substrate they acted on. The uniform-rule case that
has dominated since is the special case R = constant.

Three regimes of rule-field dynamics, in increasing order of honesty:

1. FROZEN (`apply_rule_field` with a static R): heterogeneous but inert --
   a quenched random medium. Already strictly outside elementary-CA space
   (a frozen two-rule field is exactly prehoc's 4-input selector rule with
   a static x layer).

2. READ FROM THE SAME-TIME STATE (`read_rule_field`): each cell's rule
   number is the byte spelled by the 8 state bits around it, then applied
   to the state. Self-referential -- BUT it provably collapses, by the
   same argument as prehoc's collapse theorem: S(t+1)[i] becomes a fixed
   function of S(t)[i-3..i+4], i.e. just ONE uniform CA with a bigger
   (radius-4) neighborhood. "The state writes the rules" buys nothing new
   unless the rule field remembers.

3. STATE-GATED RULE TRANSPORT (`step_gated_diffusion`): the rule field
   persists (has its own memory) and the state moves it around -- where a
   cell is alive, it copies its left neighbor's rule; where dead, it keeps
   its own. Rules become material that flows through the medium the rules
   themselves are moving. This escapes the collapse for the same reason
   memory and second trajectories escape it in prehoc.py: R(t) depends on
   the whole history, not on S(t)'s local window.

The diagnostics this enables are the point: rule DIVERSITY over time (does
the field collapse to a monoculture -- i.e. back to a uniform CA -- or
sustain a polyculture?), and compressibility applied to the rule field
itself, exactly as if it were a state.
"""
from __future__ import annotations
import numpy as np
from .ca import rule_lut

# All 256 rule LUTs stacked: ALL_LUTS[rule, idx] -> output bit.
ALL_LUTS = np.stack([rule_lut(r) for r in range(256)])


def apply_rule_field(state: np.ndarray, rule_field: np.ndarray) -> np.ndarray:
    """One synchronous step where cell i updates by ITS OWN rule,
    rule_field[i], applied to the usual (left, self, right) neighborhood."""
    l = np.roll(state, 1)
    r = np.roll(state, -1)
    idx = 4 * l + 2 * state + r
    return ALL_LUTS[rule_field, idx]


def read_rule_field(state: np.ndarray) -> np.ndarray:
    """The self-referential reading: cell i's rule number is the byte
    spelled by the 8 state bits S[i-3..i+4] (bit k of the rule = the state
    bit at offset k-3), so instructions are literally patterns in the same
    substrate they act on.

    Collapse warning (the reason this is the dishonest version): composing
    read_rule_field with apply_rule_field makes S(t+1)[i] a fixed function
    of the window S(t)[i-3..i+4] -- definitionally a single UNIFORM CA of
    radius 4. Kept because demonstrating the collapse is part of the
    result."""
    field = np.zeros(len(state), dtype=np.int64)
    for k in range(8):
        field |= np.roll(state, 3 - k).astype(np.int64) << k
    return field


def step_read_from_state(state: np.ndarray) -> np.ndarray:
    """One step of the collapsing self-referential system."""
    return apply_rule_field(state, read_rule_field(state))


def step_gated_diffusion(state: np.ndarray, rule_field: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """One synchronous step of the honest (memory-carrying) construction:
      state:      S(t+1) = per-cell application of R(t)  (apply_rule_field)
      rule field: R(t+1)[i] = R(t)[i-1] where S(t)[i] is alive,
                              R(t)[i]   where S(t)[i] is dead.
    Live cells pull their left neighbor's rule over their own -- the state
    gates transport of rules through the rule medium. R persists where
    nothing is alive, so the pair (S, R) is the true dynamical state."""
    new_state = apply_rule_field(state, rule_field)
    new_field = np.where(state == 1, np.roll(rule_field, 1), rule_field)
    return new_state, new_field


def step_gated_diffusion_right(state: np.ndarray, rule_field: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Mirror image of step_gated_diffusion: live cells pull their RIGHT
    neighbor's rule. Symmetry control for the transport-scheme robustness
    question -- statistics should match the leftward scheme exactly."""
    new_state = apply_rule_field(state, rule_field)
    new_field = np.where(state == 1, np.roll(rule_field, -1), rule_field)
    return new_state, new_field


def step_gated_mix(state: np.ndarray, rule_field: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """A qualitatively different rule-field dynamic: where a cell is alive,
    its rule becomes the XOR of its two neighbors' rules -- GF(2)
    recombination rather than transport. Unlike copying, this can CREATE
    rule values not present at t0, so diversity is no longer bounded above
    by the initial population. Dead cells still keep their rules, so the
    only-live-cells-get-overwritten selection pressure is unchanged."""
    new_state = apply_rule_field(state, rule_field)
    mixed = np.bitwise_xor(np.roll(rule_field, 1), np.roll(rule_field, -1))
    new_field = np.where(state == 1, mixed, rule_field)
    return new_state, new_field


TRANSPORT_SCHEMES = {
    "left": step_gated_diffusion,
    "right": step_gated_diffusion_right,
    "mix": step_gated_mix,
}


def gated_diffusion_trajectory(state0: np.ndarray, rule_field0: np.ndarray,
                               steps: int, scheme: str = "left") -> dict:
    """Run state-gated rule-field dynamics under one of TRANSPORT_SCHEMES,
    recording both trajectories. Returns dict with 'state' (steps, n)
    uint8, 'rules' (steps, n) int64, and 'distinct' (steps,) = number of
    distinct rules present per step."""
    step_fn = TRANSPORT_SCHEMES[scheme]
    n = len(state0)
    s, f = state0.copy(), rule_field0.copy()
    states = np.zeros((steps, n), dtype=np.uint8)
    rules = np.zeros((steps, n), dtype=np.int64)
    distinct = np.zeros(steps, dtype=np.int64)
    for t in range(steps):
        states[t] = s
        rules[t] = f
        distinct[t] = len(np.unique(f))
        s, f = step_fn(s, f)
    return dict(state=states, rules=rules, distinct=distinct)


def rule_field_bitplanes(rules: np.ndarray) -> np.ndarray:
    """A rule-field trajectory (steps, n) of bytes, as 8 stacked state-shaped
    binary fields (8, steps, n) -- the literal sense in which the rule field
    lives in the same space as the state: bit-plane k is the trajectory of
    'does your rule turn neighborhood k on'."""
    return np.stack([((rules >> k) & 1).astype(np.uint8) for k in range(8)])
