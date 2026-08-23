# -*- coding: utf-8 -*-
"""Thermometers generator — the grid holds snake-shaped thermometers; fill
mercury from each bulb continuously; row/column clue = number of filled cells
in that line. Exactly one solution per published board.

Encoding: thermometers as cell sequences (bulb first); solution as 0/1 fill.
Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450
DIRS = ((0, 1), (1, 0), (0, -1), (-1, 0))


def carve_thermos(n, rng, min_len=2, max_len=5):
    """Partition the full grid into snake thermometers of length 2..max_len."""
    unused = {(r, c) for r in range(n) for c in range(n)}
    thermos = []
    while unused:
        # random start with fewest unused neighbours (keeps leftovers rare)
        start = rng.choice(sorted(unused))
        t = [start]
        unused.discard(start)
        length = rng.randint(min_len, max_len)
        while len(t) < length:
            r, c = t[-1]
            opts = [(r + dr, c + dc) for dr, dc in DIRS if (r + dr, c + dc) in unused]
            if not opts:
                break
            nxt = opts[rng.randrange(len(opts))]
            t.append(nxt)
            unused.discard(nxt)
        if len(t) == 1:
            # orphan cell: try attaching to any neighbouring thermo end
            r, c = t[0]
            attached = False
            for th in thermos:
                er, ec = th[-1]
                if abs(er - r) + abs(ec - c) == 1 and len(th) < max_len:
                    th.append((r, c))
                    attached = True
                    break
            if not attached:
                return None
        else:
            thermos.append(t)
    return thermos


def count_solutions(n, thermos, row_cl, col_cl, limit=2):
    T = len(thermos)
    count = 0
    rowf = [0] * n
    colf = [0] * n
    row_cap = [0] * n  # remaining cells per row across undecided thermos
    # per thermo, per fill-level effects; iterate thermos with DFS over levels
    # precompute cumulative row/col contributions per level
    contrib = []
    for t in thermos:
        levels = []
        for lv in range(len(t) + 1):
            rs = [0] * n
            cs = [0] * n
            for (r, c) in t[:lv]:
                rs[r] += 1
                cs[c] += 1
            levels.append((rs, cs))
        contrib.append(levels)
    # suffix max possible additions per row/col
    suf_r = [[0] * n for _ in range(T + 1)]
    suf_c = [[0] * n for _ in range(T + 1)]
    for i in range(T - 1, -1, -1):
        full_r, full_c = contrib[i][len(thermos[i])]
        for x in range(n):
            suf_r[i][x] = suf_r[i + 1][x] + full_r[x]
            suf_c[i][x] = suf_c[i + 1][x] + full_c[x]

    def dfs(i):
        nonlocal count
        if count >= limit:
            return
        if i == T:
            if rowf == row_cl and colf == col_cl:
                count += 1
            return
        # prune: current fill cannot exceed clue; fill + max remaining must reach clue
        for x in range(n):
            if rowf[x] > row_cl[x] or rowf[x] + suf_r[i][x] < row_cl[x]:
                return
            if colf[x] > col_cl[x] or colf[x] + suf_c[i][x] < col_cl[x]:
                return
        for lv in range(len(thermos[i]) + 1):
            rs, cs = contrib[i][lv]
            for x in range(n):
                rowf[x] += rs[x]
                colf[x] += cs[x]
            dfs(i + 1)
            for x in range(n):
                rowf[x] -= rs[x]
                colf[x] -= cs[x]
            if count >= limit:
                return

    dfs(0)
    return count


def make_puzzle(n, rng, max_tries=400):
    for _ in range(max_tries):
        thermos = carve_thermos(n, rng)
        if not thermos:
            continue
        fill = {}
        filled = set()
        for t in thermos:
            lv = rng.randint(0, len(t))
            fill[tuple(t[0])] = lv
            for cell in t[:lv]:
                filled.add(cell)
        row_cl = [sum(1 for c in range(n) if (r, c) in filled) for r in range(n)]
        col_cl = [sum(1 for r in range(n) if (r, c) in filled) for c in range(n)]
        if count_solutions(n, thermos, row_cl, col_cl) == 1:
            th_str = ";".join("".join(f"{r}{c}" for (r, c) in t) for t in thermos)
            sol_str = "".join("1" if (r, c) in filled else "0" for r in range(n) for c in range(n))
            return {"n": n, "t": th_str, "r": ",".join(map(str, row_cl)),
                    "c": ",".join(map(str, col_cl)), "sol": sol_str}
    raise RuntimeError("no unique puzzle")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"thermo-daily-{d.isoformat()}")
        dailies[d.isoformat()] = make_puzzle(6, rng)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (4, 120), "medium": (5, 120), "hard": (6, 80)}


def gen_pool(diff, out):
    n, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"thermo-pool-{diff}-{i}")
        arr.append(make_puzzle(n, rng))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("thdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS
    pools = {d: json.load(open(os.path.join(parts_dir, f"thpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "thermo-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "thermo-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n = p["n"]
        sol = p["sol"]
        assert len(sol) == n * n, name
        thermos = [[(int(seg[i]), int(seg[i + 1])) for i in range(0, len(seg), 2)]
                   for seg in p["t"].split(";")]
        cells = [c for t in thermos for c in t]
        assert sorted(cells) == sorted((r, c) for r in range(n) for c in range(n)), f"{name} partition"
        for t in thermos:
            for a, b in zip(t, t[1:]):
                assert abs(a[0] - b[0]) + abs(a[1] - b[1]) == 1, f"{name} thermo shape"
            # continuity of mercury: filled prefix only
            states = [sol[r * n + c] for (r, c) in t]
            assert "1" not in "".join(states).lstrip("1"), f"{name} mercury gap"
        row_cl = [int(x) for x in p["r"].split(",")]
        col_cl = [int(x) for x in p["c"].split(",")]
        for r in range(n):
            assert sum(1 for c in range(n) if sol[r * n + c] == "1") == row_cl[r], f"{name} rclue"
        for c in range(n):
            assert sum(1 for r in range(n) if sol[r * n + c] == "1") == col_cl[c], f"{name} cclue"

    d = json.load(open(os.path.join(site, "thermo-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "thermo-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_thermo.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
