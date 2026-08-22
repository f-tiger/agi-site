# -*- coding: utf-8 -*-
"""Post-bake validator: every puzzle's baked solution must satisfy all four
rules (row/col Latin for animals and colors, orthogonal pairs, no self-touch),
and givens must match the solution. Run after gen_puzzles.py; CI-friendly."""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def check(p, name):
    n = p["n"]
    a = [int(x) for x in p["a"]]
    c = [int(x) for x in p["c"]]
    assert len(a) == len(c) == len(p["m"]) == n * n, f"{name}: bad lengths"
    for r in range(n):
        row_a = [a[r * n + i] for i in range(n)]
        col_a = [a[i * n + r] for i in range(n)]
        row_c = [c[r * n + i] for i in range(n)]
        col_c = [c[i * n + r] for i in range(n)]
        assert sorted(row_a) == sorted(col_a) == list(range(n)), f"{name}: animal latin fail r{r}"
        assert sorted(row_c) == sorted(col_c) == list(range(n)), f"{name}: color latin fail r{r}"
    assert len({(a[i], c[i]) for i in range(n * n)}) == n * n, f"{name}: pairs not orthogonal"
    for i in range(n * n):
        r, cc = divmod(i, n)
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == dc == 0:
                    continue
                r2, c2 = r + dr, cc + dc
                if 0 <= r2 < n and 0 <= c2 < n:
                    assert a[i] != a[r2 * n + c2], f"{name}: animal touches itself at {r},{cc}"
    assert p["m"].count("1") >= 4, f"{name}: too few givens"


def main():
    d = json.load(open(os.path.join(ROOT, "site", "puzzles-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, f"daily {k}")
    pools = json.load(open(os.path.join(ROOT, "site", "puzzles-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff} {i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool puzzles all valid")


if __name__ == "__main__":
    main()
