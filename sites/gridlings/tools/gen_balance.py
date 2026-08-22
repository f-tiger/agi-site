# -*- coding: utf-8 -*-
"""Balance puzzle generator — 6×6 binary balance grid (Binairo family).

Rules:
  - 6×6 grid; every cell is a sun or a moon.
  - Each row and each column contains exactly three of each.
  - Never three of the same symbol in a row, horizontally or vertically.

Same product contract as Gridlings: every published board is machine-verified
to have exactly ONE solution (givens are removed only while the solver still
counts one). Do not weaken for speed.

Run:  python3 tools/gen_balance.py     (bakes site/balance-daily.json + site/balance-pool.json)
Deterministic per seed — dailies never shift under players.
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450
N = 6
HALF = N // 2


def ok(g, r, c, v):
    # count caps: at most HALF of each symbol per row/column
    if sum(1 for x in range(N) if g[r][x] == v) >= HALF:
        return False
    if sum(1 for x in range(N) if g[x][c] == v) >= HALF:
        return False
    # no three in a row (check both directions around the new cell)
    g[r][c] = v
    bad = False
    for dr, dc in ((0, 1), (1, 0)):
        for off in (-2, -1, 0):
            cells = []
            for k in range(3):
                rr, cc = r + dr * (off + k), c + dc * (off + k)
                if 0 <= rr < N and 0 <= cc < N:
                    cells.append(g[rr][cc])
                else:
                    cells = None
                    break
            if cells and cells[0] is not None and cells[0] == cells[1] == cells[2]:
                bad = True
                break
        if bad:
            break
    g[r][c] = None
    return not bad


def gen_full(rng):
    g = [[None] * N for _ in range(N)]

    def fill(pos):
        if pos == N * N:
            return True
        r, c = divmod(pos, N)
        vals = [0, 1]
        rng.shuffle(vals)
        for v in vals:
            if ok(g, r, c, v):
                g[r][c] = v
                if fill(pos + 1):
                    return True
                g[r][c] = None
        return False

    return g if fill(0) else None


def count_solutions(givens, limit=2):
    g = [[None] * N for _ in range(N)]
    for p, v in givens.items():
        g[p // N][p % N] = v
    empties = [p for p in range(N * N) if p not in givens]
    count = 0

    def dfs(idx):
        nonlocal count
        if count >= limit:
            return
        if idx == len(empties):
            count += 1
            return
        p = empties[idx]
        r, c = divmod(p, N)
        for v in (0, 1):
            if ok(g, r, c, v):
                g[r][c] = v
                dfs(idx + 1)
                g[r][c] = None
                if count >= limit:
                    return

    dfs(0)
    return count


def make_puzzle(rng, min_givens):
    sol = None
    while sol is None:
        sol = gen_full(rng)
    givens = {p: sol[p // N][p % N] for p in range(N * N)}
    order = list(range(N * N))
    rng.shuffle(order)
    for p in order:
        if len(givens) <= min_givens:
            break
        saved = givens.pop(p)
        if count_solutions(givens) != 1:
            givens[p] = saved
    assert count_solutions(givens) == 1
    s_str = "".join(str(sol[r][c]) for r in range(N) for c in range(N))
    m_str = "".join("1" if p in givens else "0" for p in range(N * N))
    return {"n": N, "s": s_str, "m": m_str}


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"balance-daily-{d.isoformat()}")
        min_g = {0: 16, 1: 15, 2: 14, 3: 14, 4: 13, 5: 12, 6: 12}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(rng, min_g)
        if (i - a) % 50 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (18, 160), "medium": (14, 160), "hard": (10, 120)}


def gen_pool(diff, out):
    min_g, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"balance-pool-{diff}-{i}")
        arr.append(make_puzzle(rng, min_g))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("bdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS, f"expected {DAILY_DAYS}, got {len(dailies)}"
    pools = {d: json.load(open(os.path.join(parts_dir, f"bpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "balance-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "balance-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")
    def check(p, name):
        s = [int(x) for x in p["s"]]
        assert len(s) == N * N and len(p["m"]) == N * N, name
        for r in range(N):
            row = [s[r * N + c] for c in range(N)]
            col = [s[c * N + r] for c in range(N)]
            assert row.count(0) == HALF and col.count(0) == HALF, f"{name} count r{r}"
            for i in range(N - 2):
                assert not (row[i] == row[i+1] == row[i+2]), f"{name} 3row"
                assert not (col[i] == col[i+1] == col[i+2]), f"{name} 3col"
        assert p["m"].count("1") >= 6, name
    d = json.load(open(os.path.join(site, "balance-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "balance-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_balance.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
    sys.setrecursionlimit(10000)
    main()
