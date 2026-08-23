# -*- coding: utf-8 -*-
"""Futoshiki generator — n×n Latin square with inequality clues between
adjacent cells (and a few given digits). Public-domain ruleset/name.

Contract: exactly one solution, clues minimized while uniqueness holds.
Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450


def latin(n, rng):
    grid = [[0] * n for _ in range(n)]

    def dfs(r, c):
        if r == n:
            return True
        nr, nc = (r, c + 1) if c + 1 < n else (r + 1, 0)
        vals = list(range(1, n + 1))
        rng.shuffle(vals)
        for v in vals:
            if any(grid[r][x] == v for x in range(c)) or any(grid[x][c] == v for x in range(r)):
                continue
            grid[r][c] = v
            if dfs(nr, nc):
                return True
            grid[r][c] = 0
        return False

    dfs(0, 0)
    return grid


def edges(n):
    """All adjacent cell pairs: ('h', r, c) = between (r,c) and (r,c+1);
    ('v', r, c) = between (r,c) and (r+1,c)."""
    out = []
    for r in range(n):
        for c in range(n - 1):
            out.append(("h", r, c))
    for r in range(n - 1):
        for c in range(n):
            out.append(("v", r, c))
    return out


def count_solutions(n, givens, ineqs, limit=2):
    """ineqs: dict edge->'<' or '>' meaning first cell < or > second cell."""
    grid = [[0] * n for _ in range(n)]
    for (r, c), v in givens.items():
        grid[r][c] = v

    def ok(r, c, v):
        for x in range(n):
            if grid[r][x] == v or grid[x][c] == v:
                return False
        # inequality checks against already-filled neighbors
        def rel(e, a, b):
            s = ineqs.get(e)
            if s is None or a == 0 or b == 0:
                return True
            return a < b if s == "<" else a > b
        old = grid[r][c]
        grid[r][c] = v
        good = (rel(("h", r, c - 1), grid[r][c - 1] if c else 0, v) and
                rel(("h", r, c), v, grid[r][c + 1] if c + 1 < n else 0) and
                rel(("v", r - 1, c), grid[r - 1][c] if r else 0, v) and
                rel(("v", r, c), v, grid[r + 1][c] if r + 1 < n else 0))
        grid[r][c] = old
        return good

    cells = [(r, c) for r in range(n) for c in range(n) if grid[r][c] == 0]
    count = 0

    def dfs(i):
        nonlocal count
        if count >= limit:
            return
        if i == len(cells):
            count += 1
            return
        r, c = cells[i]
        for v in range(1, n + 1):
            if ok(r, c, v):
                grid[r][c] = v
                dfs(i + 1)
                grid[r][c] = 0
                if count >= limit:
                    return

    dfs(0)
    return count


def make_puzzle(n, n_ineq, n_given, rng, max_tries=50):
    # Start from ALL inequality edges + a few givens (near-certainly unique),
    # then minimize — sparse random starts almost never come out unique, so
    # minimization is the generator, not a polish step. n_ineq is unused but
    # kept in the signature so POOL_SPECS stays readable.
    for _ in range(max_tries):
        sol = latin(n, rng)
        ineqs = {}
        for e in edges(n):
            t, r, c = e
            a = sol[r][c]
            b = sol[r][c + 1] if t == "h" else sol[r + 1][c]
            ineqs[e] = "<" if a < b else ">"
        cells = [(r, c) for r in range(n) for c in range(n)]
        rng.shuffle(cells)
        givens = {rc: sol[rc[0]][rc[1]] for rc in cells[:n_given]}
        if count_solutions(n, givens, ineqs) != 1:
            continue
        # minimize: drop givens then inequalities while unique
        for rc in list(givens):
            v = givens.pop(rc)
            if count_solutions(n, givens, ineqs) != 1:
                givens[rc] = v
        ekeys = list(ineqs)
        rng.shuffle(ekeys)
        for e in ekeys:
            s = ineqs.pop(e)
            if count_solutions(n, givens, ineqs) != 1:
                ineqs[e] = s
        g_str = "".join(str(givens.get((r, c), 0)) for r in range(n) for c in range(n))
        ineq_list = [f"{t}{r}{c}{'L' if s == '<' else 'G'}" for (t, r, c), s in sorted(ineqs.items())]
        s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
        return {"n": n, "g": g_str, "iq": ",".join(ineq_list), "sol": s_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"futoshiki-daily-{d.isoformat()}")
        # weekday ramp: more starting material early week
        giv = {0: 4, 1: 3, 2: 3, 3: 2, 4: 2, 5: 1, 6: 1}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(5, 10, giv, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 6, 3, 120), "medium": (5, 10, 2, 120), "hard": (5, 12, 0, 80)}


def gen_pool(diff, out):
    n, ni, ng, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"futoshiki-pool-{diff}-{i}")
        arr.append(make_puzzle(n, ni, ng, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("fudaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"fupool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "futoshiki-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "futoshiki-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n = p["n"]
        sol = [int(x) for x in p["sol"]]
        assert len(sol) == n * n, name
        for r in range(n):
            assert sorted(sol[r * n:(r + 1) * n]) == list(range(1, n + 1)), f"{name} row"
            assert sorted(sol[r::n]) == list(range(1, n + 1)), f"{name} col"
        for g, v in zip(p["g"], sol):
            assert g == "0" or int(g) == v, f"{name} given mismatch"
        if p["iq"]:
            for tok in p["iq"].split(","):
                t, r, c, s = tok[0], int(tok[1]), int(tok[2]), tok[3]
                a = sol[r * n + c]
                b = sol[r * n + c + 1] if t == "h" else sol[(r + 1) * n + c]
                assert (a < b) if s == "L" else (a > b), f"{name} ineq {tok}"

    d = json.load(open(os.path.join(site, "futoshiki-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "futoshiki-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_futoshiki.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
