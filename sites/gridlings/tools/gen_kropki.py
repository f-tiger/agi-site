# -*- coding: utf-8 -*-
"""Kropki generator — n×n Latin square with dot clues on adjacent pairs:
white dot = numbers differ by 1; black dot = one is double the other;
NO dot = neither relation holds (negative constraint, standard Kropki).
Uniqueness from the full dot map is checked; givens added only if needed.

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


def dot(a, b):
    # black takes precedence on 1-2 pairs per Kropki convention
    if a == 2 * b or b == 2 * a:
        return "B"
    if abs(a - b) == 1:
        return "W"
    return "N"


def edges(n):
    out = []
    for r in range(n):
        for c in range(n - 1):
            out.append(("h", r, c))
    for r in range(n - 1):
        for c in range(n):
            out.append(("v", r, c))
    return out


def count_solutions(n, dots, givens, limit=2):
    """dots: dict edge->'B'/'W'/'N' (N is a real negative constraint)."""
    grid = [[0] * n for _ in range(n)]
    for (r, c), v in givens.items():
        grid[r][c] = v

    def rel_ok(e, a, b):
        if a == 0 or b == 0:
            return True
        return dot(a, b) == dots[e]

    def ok(r, c, v):
        for x in range(n):
            if grid[r][x] == v or grid[x][c] == v:
                return False
        old = grid[r][c]
        grid[r][c] = v
        good = True
        if c and not rel_ok(("h", r, c - 1), grid[r][c - 1], v):
            good = False
        if good and c + 1 < n and not rel_ok(("h", r, c), v, grid[r][c + 1]):
            good = False
        if good and r and not rel_ok(("v", r - 1, c), grid[r - 1][c], v):
            good = False
        if good and r + 1 < n and not rel_ok(("v", r, c), v, grid[r + 1][c]):
            good = False
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


def make_puzzle(n, n_given, rng, max_tries=100):
    for _ in range(max_tries):
        sol = latin(n, rng)
        dots = {}
        for e in edges(n):
            t, r, c = e
            a = sol[r][c]
            b = sol[r][c + 1] if t == "h" else sol[r + 1][c]
            dots[e] = dot(a, b)
        cells = [(r, c) for r in range(n) for c in range(n)]
        rng.shuffle(cells)
        givens = {rc: sol[rc[0]][rc[1]] for rc in cells[:n_given]}
        if count_solutions(n, dots, givens) != 1:
            continue
        for rc in list(givens):
            v = givens.pop(rc)
            if count_solutions(n, dots, givens) != 1:
                givens[rc] = v
        # serialize only W/B dots; absence = N by convention
        dot_list = [f"{t}{r}{c}{s}" for (t, r, c), s in sorted(dots.items()) if s != "N"]
        g_str = "".join(str(givens.get((r, c), 0)) for r in range(n) for c in range(n))
        s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
        return {"n": n, "g": g_str, "d": ",".join(dot_list), "sol": s_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"kropki-daily-{d.isoformat()}")
        giv = {0: 2, 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(5, giv, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 1, 120), "medium": (5, 0, 120), "hard": (6, 0, 80)}


def gen_pool(diff, out):
    n, ng, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"kropki-pool-{diff}-{i}")
        arr.append(make_puzzle(n, ng, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("krdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"krpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "kropki-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "kropki-pool.json"), "w"), separators=(",", ":"))
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
        dots = {}
        if p["d"]:
            for tok in p["d"].split(","):
                dots[(tok[0], int(tok[1]), int(tok[2]))] = tok[3]
        for r in range(n):
            for c in range(n):
                if c + 1 < n:
                    a, b = sol[r * n + c], sol[r * n + c + 1]
                    assert dots.get(("h", r, c), "N") == dot(a, b), f"{name} h{r}{c}"
                if r + 1 < n:
                    a, b = sol[r * n + c], sol[(r + 1) * n + c]
                    assert dots.get(("v", r, c), "N") == dot(a, b), f"{name} v{r}{c}"
        for g, v in zip(p["g"], sol):
            assert g == "0" or int(g) == v, f"{name} given"

    d = json.load(open(os.path.join(site, "kropki-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "kropki-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_kropki.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
