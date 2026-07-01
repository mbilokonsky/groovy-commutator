"""2D Life-like (outer-totalistic, Moore-neighborhood, toroidal) CA engine.

Python twin of the 2D half of site/src/lib/groovy-engine.js, which shipped
first (the explorer needed it); this module brings the package back to
parity so 2D claims on the site can be produced by checked-in scripts
instead of living only in the browser.

Rules are B/S ("born/survive") sets of neighbor counts, e.g. Conway's Life
is B{3}/S{2,3}. All operators from the 1D package generalize by swapping
the neighborhood: C is XOR, D(g) = g XOR phi(g), G is the commutator, and
the absential field is off-cells with at least one live Moore neighbor.

The affine theorem (NOTES.md section 2) is dimension-free: a Life-like rule
whose next state is a GF(2)-linear function of the neighborhood must have
G identically zero. B1357/S1357 ("Replicator") is exactly neighbor-parity —
born iff odd live neighbors, survive iff odd live neighbors, i.e.
next = XOR of the 8 Moore neighbors — so it is the 2D analog of rule 90,
and G2D(Replicator) must vanish for every grid. Verified in
scripts/experiment_absential_2d.py.
"""
from __future__ import annotations
import numpy as np


def neighbor_count(grid: np.ndarray) -> np.ndarray:
    """Live-cell count over each cell's 8-cell Moore neighborhood (toroidal)."""
    total = np.zeros_like(grid, dtype=np.int64)
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            total += np.roll(np.roll(grid, dr, axis=0), dc, axis=1)
    return total


def apply_2d_rule(grid: np.ndarray, born: set[int], survive: set[int]) -> np.ndarray:
    """One synchronous step of a Life-like rule."""
    n = neighbor_count(grid)
    born_mask = np.isin(n, list(born)) if born else np.zeros_like(grid, dtype=bool)
    survive_mask = np.isin(n, list(survive)) if survive else np.zeros_like(grid, dtype=bool)
    alive = grid.astype(bool)
    return np.where(alive, survive_mask, born_mask).astype(np.uint8)


def absential_field_2d(grid: np.ndarray) -> np.ndarray:
    """Cells OFF but with at least one live Moore neighbor -- the 2D
    absential field (metrics.absential_field with the neighborhood swapped)."""
    has_live_neighbor = neighbor_count(grid) > 0
    return (has_live_neighbor & ~grid.astype(bool)).astype(np.uint8)


def D2(grid: np.ndarray, born: set[int], survive: set[int]) -> np.ndarray:
    """2D differentiation: grid XOR phi(grid)."""
    return np.bitwise_xor(grid, apply_2d_rule(grid, born, survive))


def G2(grid: np.ndarray, born: set[int], survive: set[int]) -> np.ndarray:
    """2D commutator: C(D(E(g)), E(D(g))), all under one rule."""
    e = apply_2d_rule(grid, born, survive)
    de = D2(e, born, survive)
    ed = apply_2d_rule(D2(grid, born, survive), born, survive)
    return np.bitwise_xor(de, ed)


def evolve_trajectory_2d(grid0: np.ndarray, born: set[int], survive: set[int],
                         steps: int) -> np.ndarray:
    """(steps, h, w) raw-state trajectory."""
    g = grid0.copy()
    out = np.zeros((steps,) + grid0.shape, dtype=np.uint8)
    for t in range(steps):
        out[t] = g
        g = apply_2d_rule(g, born, survive)
    return out


def absential_trajectory_2d(grid0: np.ndarray, born: set[int], survive: set[int],
                            steps: int) -> np.ndarray:
    """(steps, h, w) absential-field trajectory."""
    g = grid0.copy()
    out = np.zeros((steps,) + grid0.shape, dtype=np.uint8)
    for t in range(steps):
        out[t] = absential_field_2d(g)
        g = apply_2d_rule(g, born, survive)
    return out


def random_grid(h: int, w: int, density: float, rng: np.random.Generator) -> np.ndarray:
    return (rng.random((h, w)) < density).astype(np.uint8)
