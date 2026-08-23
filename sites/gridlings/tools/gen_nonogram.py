# -*- coding: utf-8 -*-
"""Nonogram generator — n×n binary picture grid; row/column clues are the
run-lengths of filled blocks. Acceptance is LINE-SOLVABILITY: repeated
row/column constraint intersection alone must complete the grid. That is
strictly stronger than unique-solution counting and is exactly the site's
no-guessing promise (nonogram players' top complaint about random boards).

Encoding: {n, r:"2.1,3,...", c:"...", sol:"0101..."} — clues dot-separated
within a line, comma-separated between lines; empty line clue = "0".
Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate
"""
import json, os, random, sys
from functools import lru_cache
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450


def clue_of(line):
    runs, k = [], 0
    for v in line:
        if v:
            k += 1
        elif k:
            runs.append(k)
            k = 0
    if k:
        runs.append(k)
    return runs or [0]


def line_patterns(n, clue):
    """All 0/1 tuples of length n matching the clue (memoised per (n, clue))."""
    return _patterns(n, tuple(clue))


@lru_cache(maxsize=None)
def _patterns(n, clue):
    if clue == (0,):
        return [tuple([0] * n)]
    out = []

    def place(i, ci, cur):
        if ci == len(clue):
            out.append(tuple(cur + [0] * (n - i)))
            return
        need = sum(clue[ci:]) + (len(clue) - ci - 1)
        for start in range(i, n - need + 1):
            block = cur + [0] * (start - i) + [1] * clue[ci]
            j = start + clue[ci]
            if ci + 1 < len(clue):
                block = block + [0]
                j += 1
            place(j, ci + 1, block)

    place(0, 0, [])
    return out


def line_solve(n, row_cl, col_cl):
    """Fixpoint of row/col placement intersection. Returns solved grid or None."""
    grid = [[-1] * n for _ in range(n)]  # -1 unknown, 0 empty, 1 filled

    def pass_lines(clues, get, put):
        changed = False
        for i in range(n):
            known = get(i)
            fits = [p for p in line_patterns(n, clues[i])
                    if all(k == -1 or k == p[j] for j, k in enumerate(known))]
            if not fits:
                return None
            for j in range(n):
                v = fits[0][j]
                if known[j] == -1 and all(p[j] == v for p in fits):
                    put(i, j, v)
                    changed = True
        return changed

    while True:
        r = pass_lines(row_cl, lambda i: grid[i],
                       lambda i, j, v: grid[i].__setitem__(j, v))
        if r is None:
            return None
        c = pass_lines(col_cl, lambda i: [grid[x][i] for x in range(n)],
                       lambda i, j, v: grid[j].__setitem__(i, v))
        if c is None:
            return None
        if not r and not c:
            break
    if any(grid[i][j] == -1 for i in range(n) for j in range(n)):
        return None
    return grid


def make_puzzle(n, rng, max_tries=4000):
    for _ in range(max_tries):
        density = rng.uniform(0.48, 0.62)
        sol = [[1 if rng.random() < density else 0 for _ in range(n)] for _ in range(n)]
        row_cl = [clue_of(sol[r]) for r in range(n)]
        col_cl = [clue_of([sol[r][c] for r in range(n)]) for c in range(n)]
        solved = line_solve(n, row_cl, col_cl)
        if solved is None:
            continue
        # line-solve fixpoint completing implies the clue set has exactly this
        # solution AND it is reachable without guessing
        assert solved == sol
        fmt = lambda cls: ",".join(".".join(map(str, c)) for c in cls)
        s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
        return {"n": n, "r": fmt(row_cl), "c": fmt(col_cl), "sol": s_str}
    raise RuntimeError("no line-solvable puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"nonogram-daily-{d.isoformat()}")
        dailies[d.isoformat()] = make_puzzle(10, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (5, 120), "medium": (10, 120), "hard": (12, 80)}


def gen_pool(diff, out):
    n, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"nonogram-pool-{diff}-{i}")
        arr.append(make_puzzle(n, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("ngdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"ngpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "nonogram-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "nonogram-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n = p["n"]
        sol = [int(x) for x in p["sol"]]
        assert len(sol) == n * n, name
        row_cl = [[int(x) for x in c.split(".")] for c in p["r"].split(",")]
        col_cl = [[int(x) for x in c.split(".")] for c in p["c"].split(",")]
        for r in range(n):
            assert clue_of(sol[r * n:(r + 1) * n]) == row_cl[r], f"{name} rclue {r}"
        for c in range(n):
            assert clue_of(sol[c::n]) == col_cl[c], f"{name} cclue {c}"
        solved = line_solve(n, row_cl, col_cl)
        assert solved is not None, f"{name} not line-solvable"
        assert [solved[r][c] for r in range(n) for c in range(n)] == sol, f"{name} mismatch"

    d = json.load(open(os.path.join(site, "nonogram-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "nonogram-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_nonogram.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
        sys.exit(1)
    if a[0] == "daily":
        gen_daily_range(int(a[1]), int(a[2]), a[3])
    elif a[0] == "pool":
        gen_pool(a[1], a[2])
    elif a[0] == "merge":
        merge(a[1])
    elif a[0] == "validate":
        validate()
    else:
        sys.exit("unknown mode")


if __name__ == "__main__":
    sys.setrecursionlimit(100000)
    main()
