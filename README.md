# Groovy Commutator

An operator-commutator framework for cellular automata — generalized from
a single rule's self-commutator to the relationship *between* pairs of
rules. Origin: https://liet-codes.github.io/wet-math/commutator.html

## Layout

- `src/groovy/` — the actual library. Start with `operators.py`'s
  docstring, then `ca.py`, `metrics.py`, `classify.py`.
- `notebooks/01_exploration.ipynb` — narrated walkthrough: the affine
  theorem, the four single-rule regimes, the five pair regimes, the drain
  mechanism, the pilot sweep.
- `NOTES.md` — citations, the QM correspondence, and the open interpretive
  thread.
- `CLAUDE.md` — orientation + established results + open task, for picking
  this up in an agentic coding session.
- `results/` — sweep outputs go here (currently empty; the pilot sweep's
  numbers are in NOTES.md and the notebook, not checked in as data yet).

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .
pip install -r requirements.txt   # adds matplotlib + jupyter for the notebook
jupyter notebook notebooks/01_exploration.ipynb
```

## Quick taste

```python
from groovy import G, divergence_trajectory, divergence_stats
import numpy as np

rng = np.random.default_rng(0)
S = rng.integers(0, 2, size=64).astype("uint8")

G(S, 90)    # all zeros -- rule 90 is affine with no bias, D and E commute
G(S, 165)   # all ones  -- affine with bias, constant nonzero commutator

field = divergence_trajectory(S, 110, 54, steps=150)
divergence_stats(field)   # structured, persistent disagreement -- not noise, not drain
```

## Status
Pilot-scale (11 rules, hand-picked pairs, 1 seed each). The open task is
the full 256-rule exhaustive sweep — see `CLAUDE.md`.
