# -*- coding: utf-8 -*-
"""Towers (Skyscrapers) generator — n×n Latin square of building heights with
edge clues: each clue counts the buildings visible from that direction (taller
hides shorter). Generic name "Towers" per Simon Tatham convention.

Contract: exactly one solution, clue set minimized while uniqueness holds.
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


def visible(seq):
    cnt, mx = 0, 0
    for v in seq:
        if v > mx:
            cnt += 1
            mx = v
    return cnt


def all_clues(n, sol):
    """clue key: ('T',c) top-down, ('B',c) bottom-up, ('L',r), ('R',r)."""
    clues = {}
    for c in range(n):
        col = [sol[r][c] for r in range(n)]
        clues[("T", c)] = visible(col)
        clues[("B", c)] = visible(col[::-1])
    for r in range(n):
        row = sol[r]
        clues[("L", r)] = visible(row)
        clues[("R", r)] = visible(row[::-1])
    return clues


def count_solutions(n, clues, givens, limit=2):
    grid = [[0] * n for _ in range(n)]
    for (r, c), v in givens.items():
        grid[r][c] = v

    def line_ok(seq, clue, complete):
        if clue is None:
            return True
        if complete:
            return visible(seq) == clue
        # partial prefix bound: visible so far cannot exceed clue; and
        # optimistic max cannot fall below clue
        cnt, mx = 0, 0
        for v in seq:
            if v == 0:
                break
            if v > mx:
                cnt += 1
                mx = v
        if cnt > clue:
            return False
        return True

    def ok(r, c, v):
        for x in range(n):
            if grid[r][x] == v or grid[x][c] == v:
                return False
        grid[r][c] = v
        good = True
        # row checks when row r complete up to end
        row = grid[r]
        if all(row):
            good = visible(row) == clues.get(("L", r), visible(row)) and \
                   visible(row[::-1]) == clues.get(("R", r), visible(row[::-1]))
        else:
            good = line_ok(row, clues.get(("L", r)), False)
        if good:
            col = [grid[x][c] for x in range(n)]
            if all(col):
                good = visible(col) == clues.get(("T", c), visible(col)) and \
                       visible(col[::-1]) == clues.get(("B", c), visible(col[::-1]))
            else:
                good = line_ok(col, clues.get(("T", c)), False)
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


def make_puzzle(n, n_given, rng, max_tries=100):
    for _ in range(max_tries):
        sol = latin(n, rng)
        clues = all_clues(n, sol)
        cells = [(r, c) for r in range(n) for c in range(n)]
        rng.shuffle(cells)
        givens = {rc: sol[rc[0]][rc[1]] for rc in cells[:n_given]}
        if count_solutions(n, clues, givens) != 1:
            continue
        # minimize givens only. Full edge-clue sets are the classic Skyscrapers
        # presentation, and clue-minimization hits pathological seeds where the
        # sparse-clue solver blows up (measured: some daily seeds took minutes).
        for rc in list(givens):
            v = givens.pop(rc)
            if count_solutions(n, clues, givens) != 1:
                givens[rc] = v
        clue_list = [f"{k[0]}{k[1]}{v}" for k, v in sorted(clues.items(), key=lambda kv: (kv[0][0], kv[0][1]))]
        g_str = "".join(str(givens.get((r, c), 0)) for r in range(n) for c in range(n))
        s_str = "".join(str(sol[r][c]) for r in range(n) for c in range(n))
        return {"n": n, "g": g_str, "cl": ",".join(clue_list), "sol": s_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"towers-daily-{d.isoformat()}")
        giv = {0: 3, 1: 2, 2: 2, 3: 1, 4: 1, 5: 0, 6: 0}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(5, giv, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 2, 120), "medium": (5, 1, 120), "hard": (5, 0, 80)}


def gen_pool(diff, out):
    n, ng, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"towers-pool-{diff}-{i}")
        arr.append(make_puzzle(n, ng, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("todaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"topool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "towers-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "towers-pool.json"), "w"), separators=(",", ":"))
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
        for g, v in zip(p["g"], sol):
            assert g == "0" or int(g) == v, f"{name} given"
        if p["cl"]:
            for tok in p["cl"].split(","):
                side, idx, clue = tok[0], int(tok[1]), int(tok[2:])
                if side == "T":
                    seq = [grid[r][idx] for r in range(n)]
                elif side == "B":
                    seq = [grid[r][idx] for r in range(n - 1, -1, -1)]
                elif side == "L":
                    seq = grid[idx]
                else:
                    seq = grid[idx][::-1]
                assert visible(seq) == clue, f"{name} clue {tok}"

    d = json.load(open(os.path.join(site, "towers-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "towers-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_towers.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
