# -*- coding: utf-8 -*-
"""Mini Sudoku generator — 6×6 Latin square with 2×3 boxes; givens minimized
while uniqueness holds. Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450


def box_of(n, br, bc, r, c):
    return (r // br) * (n // bc) + (c // bc)


def full_grid(n, br, bc, rng):
    grid = [[0] * n for _ in range(n)]

    def dfs(r, c):
        if r == n:
            return True
        nr, nc = (r, c + 1) if c + 1 < n else (r + 1, 0)
        vals = list(range(1, n + 1))
        rng.shuffle(vals)
        for v in vals:
            if any(grid[r][x] == v for x in range(n)) or any(grid[x][c] == v for x in range(n)):
                continue
            b = box_of(n, br, bc, r, c)
            bad = False
            for rr in range(n):
                for cc in range(n):
                    if grid[rr][cc] == v and box_of(n, br, bc, rr, cc) == b:
                        bad = True
                        break
                if bad:
                    break
            if bad:
                continue
            grid[r][c] = v
            if dfs(nr, nc):
                return True
            grid[r][c] = 0
        return False

    dfs(0, 0)
    return grid


def count_solutions(n, br, bc, givens, limit=2):
    grid = [[0] * n for _ in range(n)]
    for (r, c), v in givens.items():
        grid[r][c] = v

    def ok(r, c, v):
        for x in range(n):
            if grid[r][x] == v or grid[x][c] == v:
                return False
        b = box_of(n, br, bc, r, c)
        for rr in range(n):
            for cc in range(n):
                if grid[rr][cc] == v and box_of(n, br, bc, rr, cc) == b:
                    return False
        return True

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


def make_puzzle(n, br, bc, target_givens, rng, max_tries=30):
    for _ in range(max_tries):
        sol = full_grid(n, br, bc, rng)
        cells = [(r, c) for r in range(n) for c in range(n)]
        rng.shuffle(cells)
        givens = {rc: sol[rc[0]][rc[1]] for rc in cells}
        # remove while unique, stop near target
        for rc in cells:
            if len(givens) <= target_givens:
                break
            v = givens.pop(rc)
            if count_solutions(n, br, bc, givens) != 1:
                givens[rc] = v
        if count_solutions(n, br, bc, givens) == 1:
            g_str = "".join(str(givens.get((r, c), 0)) for r in range(n) for c in range(n))
            s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
            return {"n": n, "br": br, "bc": bc, "g": g_str, "sol": s_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"minisudoku-daily-{d.isoformat()}")
        tg = {0: 14, 1: 13, 2: 13, 3: 12, 4: 12, 5: 10, 6: 10}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(6, 2, 3, tg, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 2, 2, 8, 120), "medium": (6, 2, 3, 12, 120), "hard": (6, 2, 3, 9, 80)}


def gen_pool(diff, out):
    n, br, bc, tg, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"minisudoku-pool-{diff}-{i}")
        arr.append(make_puzzle(n, br, bc, tg, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("msdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"mspool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "minisudoku-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "minisudoku-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n, br, bc = p["n"], p["br"], p["bc"]
        sol = [int(x) for x in p["sol"]]
        assert len(sol) == n * n, name
        for r in range(n):
            assert sorted(sol[r * n:(r + 1) * n]) == list(range(1, n + 1)), f"{name} row"
            assert sorted(sol[r::n]) == list(range(1, n + 1)), f"{name} col"
        boxes = {}
        for r in range(n):
            for c in range(n):
                boxes.setdefault(box_of(n, br, bc, r, c), []).append(sol[r * n + c])
        for b, vs in boxes.items():
            assert sorted(vs) == list(range(1, n + 1)), f"{name} box {b}"
        for g, v in zip(p["g"], sol):
            assert g == "0" or int(g) == v, f"{name} given"

    d = json.load(open(os.path.join(site, "minisudoku-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "minisudoku-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_minisudoku.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
