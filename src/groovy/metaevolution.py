"""Meta-evolution: rules birthing rules.

Each generation derives a new "child" rule from the current CA state via a
generator function `g: state -> rule_num`, classifies the parent -> child
handoff with the same five-regime diagnostic used for ordinary rule pairs
(classify.classify_regime), then -- in "replace" mode, the only mode
implemented here -- adopts the child rule and evolves state forward under
it before deriving the next generation's child.

Lineages either keep generating novelty, drain into a fixed point,
dissolve into noise, or -- the interesting case -- lock into a small
self-sustaining cycle in RULE SPACE itself (a stable platform, not a
runaway tower). This is the open-ended-evolution question -- Tom Ray's
Tierra, Channon's "survivor list" work, Bert Chan's Lenia rule-space
exploration all ask versions of "what keeps evolutionary search generating
novelty instead of collapsing into a stable, boring attractor" -- run here
in this substrate.

`population_count_generator` is deliberately the crudest possible g
(population count is a coarse statistic; lots of distinct states collapse
to the same child rule). The open question carried over from this thread:
do richer state-summaries as the generator -- built from absential_field,
from G(S), or from D(S) sampled at a few positions -- produce a larger
reachable set of stable platforms, and/or longer searches before locking
in? Worth running the same lineage with several `g` functions and comparing
generations-to-cycle and cycle period; not yet done in this codebase.
"""
from __future__ import annotations
import numpy as np
from .ca import apply_rule
from .operators import divergence_trajectory
from .metrics import divergence_stats
from .classify import classify_regime


def population_count_generator(state: np.ndarray) -> int:
    """Default, deliberately crude rule generator: child rule = popcount(state) mod 256."""
    return int(state.sum()) % 256


def lineage(state0: np.ndarray, rule0: int, generator=population_count_generator,
            max_generations: int = 50, steps: int = 100,
            cycle_window: int = 6) -> list[dict]:
    """Run a meta-evolution lineage in "replace" mode.

    At each generation: derive new_rule = generator(state), classify the
    (rule -> new_rule) handoff at this specific state via
    divergence_trajectory + classify_regime, then adopt new_rule and
    evolve state forward one CA step under it.

    Stops at max_generations, or earlier if the trailing rule sequence
    (within the last `cycle_window` generations) locks into a repeating
    period -- the last history entry then carries `cycle_period`.
    """
    state = state0.copy()
    rule = rule0
    history: list[dict] = []
    rule_sequence = [rule0]

    for gen in range(max_generations):
        new_rule = generator(state)
        field = divergence_trajectory(state, rule, new_rule, steps)
        stats = divergence_stats(field)
        regime = classify_regime(stats)
        history.append(dict(gen=gen, rule=rule, new_rule=new_rule, regime=regime,
                             final=stats["final"], compressibility=stats["compressibility"]))

        rule_sequence.append(new_rule)
        period = _trailing_cycle_period(rule_sequence, cycle_window)
        if period is not None:
            history[-1]["cycle_period"] = period
            break

        state = apply_rule(state, new_rule)
        rule = new_rule

    return history


def _trailing_cycle_period(rule_sequence: list[int], window: int) -> int | None:
    """If the tail of rule_sequence (last `window` entries) is periodic,
    return the smallest period; else None."""
    tail = rule_sequence[-window:]
    for period in range(1, len(tail) // 2 + 1):
        if tail[-period:] == tail[-2 * period:-period]:
            return period
    return None
