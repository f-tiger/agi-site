# -*- coding: utf-8 -*-
"""Sandwich generator — n×n Latin square; each row/column clue is the sum of
the numbers sandwiched BETWEEN 1 and n in that line. Givens minimized while
uniqueness holds; all 2n sandwich clues always shown (classic presentation).

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


def sandwich(seq, n):
    i, j = seq.index(1), seq.index(n)
    if i > j:
        i, j = j, i
    return sum(seq[i + 1:j])


def count_solutions(n, rows_cl, cols_cl, givens, limit=2):
    grid = [[0] * n for _ in range(n)]
    for (r, c), v in givens.items():
        grid[r][c] = v

    def ok(r, c, v):
        for x in range(n):
            if grid[r][x] == v or grid[x][c] == v:
                return False
        grid[r][c] = v
        good = True
        row = grid[r]
        if all(row) and sandwich(row, n) != rows_cl[r]:
            good = False
        if good:
            col = [grid[x][c] for x in range(n)]
            if all(col) and sandwich(col, n) != cols_cl[c]:
                good = False
        grid[r][c] = 0
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


def make_puzzle(n, n_given, rng, max_tries=200):
    for _ in range(max_tries):
        sol = latin(n, rng)
        rows_cl = [sandwich(sol[r], n) for r in range(n)]
        cols_cl = [sandwich([sol[r][c] for r in range(n)], n) for c in range(n)]
        cells = [(r, c) for r in range(n) for c in range(n)]
        rng.shuffle(cells)
        givens = {rc: sol[rc[0]][rc[1]] for rc in cells[:n_given]}
        if count_solutions(n, rows_cl, cols_cl, givens) != 1:
            continue
        for rc in list(givens):
            v = givens.pop(rc)
            if count_solutions(n, rows_cl, cols_cl, givens) != 1:
                givens[rc] = v
        g_str = "".join(str(givens.get((r, c), 0)) for r in range(n) for c in range(n))
        s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
        return {"n": n, "g": g_str, "rc": ",".join(map(str, rows_cl)), "cc": ",".join(map(str, cols_cl)), "sol": s_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"sandwich-daily-{d.isoformat()}")
        giv = {0: 4, 1: 3, 2: 3, 3: 2, 4: 2, 5: 2, 6: 2}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(5, giv, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 2, 120), "medium": (5, 2, 120), "hard": (5, 1, 80)}


def gen_pool(diff, out):
    n, ng, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"sandwich-pool-{diff}-{i}")
        arr.append(make_puzzle(n, ng, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("sadaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"sapool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "sandwich-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "sandwich-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n = p["n"]
        sol = [int(x) for x in p["sol"]]
        assert len(sol) == n * n, name
        grid = [sol[r * n:(r + 1) * n] for r in range(n)]
        for r in range(n):
            assert sorted(grid[r]) == list(range(1, n + 1)), f"{name} row"
            assert sorted(sol[r::n]) == list(range(1, n + 1)), f"{name} col"
        rows_cl = [int(x) for x in p["rc"].split(",")]
        cols_cl = [int(x) for x in p["cc"].split(",")]
        for r in range(n):
            assert sandwich(grid[r], n) == rows_cl[r], f"{name} rclue {r}"
        for c in range(n):
            assert sandwich([grid[r][c] for r in range(n)], n) == cols_cl[c], f"{name} cclue {c}"
        for g, v in zip(p["g"], sol):
            assert g == "0" or int(g) == v, f"{name} given"

    d = json.load(open(os.path.join(site, "sandwich-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "sandwich-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_sandwich.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
