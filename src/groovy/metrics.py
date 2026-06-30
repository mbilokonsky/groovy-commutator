"""Diagnostics for classifying single rules and rule pairs."""
from __future__ import annotations
import zlib
import numpy as np
from .ca import apply_rule_int


def compressibility(field: np.ndarray) -> float:
    """zlib-compressed size / raw size of a binary field, as a crude proxy
    for structure vs. noise. Lower = more compressible = more structured.
    A value near 1.0 means the field is indistinguishable from noise to
    a general-purpose compressor."""
    flat = np.packbits(field.astype(np.uint8))
    return len(zlib.compress(flat.tobytes(), level=9)) / len(flat)


def image_ratio(rule_num: int, n: int = 14) -> float:
    """Exhaustive surjectivity measure: |distinct successor states| / 2**n.
    Low ratio = lossy/contracting rule, rich in Garden-of-Eden configurations
    (states with no predecessor -- Moore-Myhill garden-of-eden theorem).
    Only tractable for small n; n<=16 is fast, n<=18 is slow but feasible,
    don't push much past that without a smarter (non-exhaustive) method."""
    images = set(apply_rule_int(s, n, rule_num) for s in range(2 ** n))
    return len(images) / (2 ** n)


def absential_field(state: np.ndarray) -> np.ndarray:
    """Cells that are OFF but within the radius-1 closed neighborhood of an
    ON cell -- Deacon's "absential": off-ness that is constituted by, and
    does causal work relative to, something present nearby. Distinct from
    "void" (off and outside every live cell's neighborhood, causally inert).

    closed_neighborhood_size(state) == state.sum() + absential_field(state).sum()
    """
    neighborhood = (state | np.roll(state, 1) | np.roll(state, -1)).astype(bool)
    live = state.astype(bool)
    return (neighborhood & ~live).astype(np.uint8)


def divergence_stats(field: np.ndarray, peak_window: int = 20, settle_window: int = 10) -> dict:
    """Summarize a divergence_trajectory field: how much do the two paths
    disagree early on (peak), where do they end up (final), did they
    collapse toward a shared attractor (drained), and is the disagreement
    pattern itself structured or noisy (compressibility)."""
    dens = field.mean(axis=1)
    peak = dens[:peak_window].max()
    final = dens[-settle_window:].mean()
    return dict(
        final=float(final),
        peak=float(peak),
        drained=bool((peak - final) > 0.15),
        compressibility=compressibility(field),
        mean=float(dens.mean()),
    )
