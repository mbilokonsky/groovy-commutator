"""Core 1D elementary cellular automaton engine.

Vectorized over numpy arrays for the array case; an integer-encoded variant
is provided for exhaustive enumeration over small state spaces (used by
metrics.image_ratio).
"""
from __future__ import annotations
import numpy as np


def rule_lut(rule_num: int) -> np.ndarray:
    """8-entry lookup table for an elementary CA rule (Wolfram rule number),
    indexed by 4*left + 2*center + right."""
    return np.array([(rule_num >> i) & 1 for i in range(8)], dtype=np.uint8)


def apply_rule(state: np.ndarray, rule_num: int) -> np.ndarray:
    """One synchronous step of an elementary CA on a periodic 1D lattice."""
    lut = rule_lut(rule_num)
    l = np.roll(state, 1)
    r = np.roll(state, -1)
    idx = 4 * l + 2 * state + r
    return lut[idx]


def apply_rule_int(state_int: int, n: int, rule_num: int) -> int:
    """Same step on an integer-encoded n-bit state (bit i = cell i).
    Used for exhaustive enumeration over all 2**n states -- only tractable
    for small n (roughly n <= 18 on a laptop)."""
    table = rule_lut(rule_num)
    bits = [(state_int >> i) & 1 for i in range(n)]
    out = 0
    for i in range(n):
        l = bits[(i - 1) % n]
        c = bits[i]
        r = bits[(i + 1) % n]
        out |= int(table[4 * l + 2 * c + r]) << i
    return out


def random_state(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.integers(0, 2, size=n).astype(np.uint8)
