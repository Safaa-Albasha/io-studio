"""Small, dependency-free statistics for the io-hook-meter experiment.

Only the Python standard library is used, so the experiment runs anywhere.

- spearman(x, y)            rank correlation with average ranks for ties
- permutation_p(x, y)       two-sided p-value: exact (n <= 8) or Monte Carlo
- benjamini_hochberg(ps)    false-discovery-rate q-values for many tests
- min_possible_p(n)         the smallest p-value n points can ever give
"""
from __future__ import annotations

import itertools
import math
import random
from typing import Optional, Sequence


def _clean_pairs(x: Sequence, y: Sequence):
    pairs = []
    for a, b in zip(x, y):
        if a is None or b is None:
            continue
        try:
            fa, fb = float(a), float(b)
        except (TypeError, ValueError):
            continue
        if math.isnan(fa) or math.isnan(fb):
            continue
        pairs.append((fa, fb))
    return pairs


def rank(values: Sequence[float]) -> list[float]:
    """Ranks starting at 1; tied values get the average of their ranks."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def pearson(x: Sequence[float], y: Sequence[float]) -> Optional[float]:
    n = len(x)
    if n < 3:
        return None
    mx, my = sum(x) / n, sum(y) / n
    sxx = sum((a - mx) ** 2 for a in x)
    syy = sum((b - my) ** 2 for b in y)
    if sxx == 0 or syy == 0:
        return None  # a constant column has no correlation
    sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
    return sxy / math.sqrt(sxx * syy)


def spearman(x: Sequence, y: Sequence) -> tuple[Optional[float], int]:
    """Returns (rho, n_used). rho is None when undefined (n < 3 or constant)."""
    pairs = _clean_pairs(x, y)
    if len(pairs) < 3:
        return None, len(pairs)
    xs, ys = zip(*pairs)
    return pearson(rank(xs), rank(ys)), len(pairs)


def permutation_p(x: Sequence, y: Sequence, n_perm: int = 10000, seed: int = 7) -> Optional[float]:
    """Two-sided permutation p-value for Spearman's rho.

    Exact (all n! orderings) when n <= 8, otherwise Monte Carlo with n_perm
    shuffles (p = (hits + 1) / (n_perm + 1), never exactly zero).
    """
    pairs = _clean_pairs(x, y)
    n = len(pairs)
    if n < 3:
        return None
    xs, ys = zip(*pairs)
    rx, ry = rank(xs), rank(ys)
    obs = pearson(rx, ry)
    if obs is None:
        return None
    target = abs(obs) - 1e-12
    if n <= 8:
        hits = total = 0
        for perm in itertools.permutations(ry):
            r = pearson(rx, perm)
            total += 1
            if r is not None and abs(r) >= target:
                hits += 1
        return hits / total
    rnd = random.Random(seed)
    ry = list(ry)
    hits = 0
    for _ in range(n_perm):
        rnd.shuffle(ry)
        r = pearson(rx, ry)
        if r is not None and abs(r) >= target:
            hits += 1
    return (hits + 1) / (n_perm + 1)


def min_possible_p(n: int) -> float:
    """Smallest two-sided permutation p-value with n distinct points (rho = +-1)."""
    if n < 2:
        return 1.0
    return min(1.0, 2 / math.factorial(n))


def benjamini_hochberg(pvalues: Sequence[Optional[float]]) -> list[Optional[float]]:
    """q-values (FDR) for a family of tests; None entries are kept as None."""
    idx = [i for i, p in enumerate(pvalues) if p is not None]
    m = len(idx)
    q: list[Optional[float]] = [None] * len(pvalues)
    if not m:
        return q
    ordered = sorted(idx, key=lambda i: pvalues[i])
    prev = 1.0
    for rank_pos in range(m, 0, -1):
        i = ordered[rank_pos - 1]
        val = min(prev, pvalues[i] * m / rank_pos)
        q[i] = val
        prev = val
    return q


def rho_needed(n: int, alpha: float = 0.05) -> Optional[float]:
    """Approximate |rho| needed for significance at alpha (two-sided), t-approximation.

    Useful for telling the creator how strong a pattern must be at their sample size.
    """
    if n < 4:
        return None
    # critical t for df = n - 2 (two-sided); small table + normal fallback
    table = {2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262,
             10: 2.228, 12: 2.179, 15: 2.131, 18: 2.101, 20: 2.086, 25: 2.060, 28: 2.048,
             30: 2.042, 40: 2.021, 60: 2.000, 120: 1.980}
    df = n - 2
    keys = sorted(table)
    t = 1.96
    for k in keys:
        if df <= k:
            t = table[k]
            break
    return t / math.sqrt(df + t * t)
