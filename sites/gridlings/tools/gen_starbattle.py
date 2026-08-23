# -*- coding: utf-8 -*-
"""Star Battle generator — N×N grid, N regions, S stars per row/column/region,
no two stars adjacent (including diagonally).

Same product contract as the other Gridlings puzzles: every published board is
machine-verified to have exactly ONE solution. The region layout IS the puzzle
(no givens), so generation = place stars → grow regions around them → keep only
layouts whose solution count is exactly 1.

Formats: easy 8×8 1★ · daily/medium/hard 10×10 2★.
Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate  (like gen_balance)
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450


def row_patterns(n, s):
    """All ways to place s stars in one row with no two horizontally adjacent."""
    out = []
    def rec(start, picked):
        if len(picked) == s:
            out.append(tuple(picked))
            return
        for c in range(start, n):
            if picked and c - picked[-1] < 2:
                continue
            picked.append(c)
            rec(c + 2, picked)
            picked.pop()
    rec(0, [])
    return out


def place_stars(n, s, rng):
    """Random full star placement satisfying row/col counts + adjacency."""
    pats = row_patterns(n, s)
    colc = [0] * n
    rows = []

    def ok(prev, pat):
        for c in pat:
            if colc[c] >= s:
                return False
            if prev:
                for p in prev:
                    if abs(p - c) <= 1:
                        return False
        return True

    def feasible(r):
        # remaining rows must be able to fill remaining column needs
        rem_rows = n - r
        for c in range(n):
            if s - colc[c] > rem_rows:
                return False
        return True

    def dfs(r):
        if r == n:
            return all(colc[c] == s for c in range(n))
        order = pats[:]
        rng.shuffle(order)
        prev = rows[r - 1] if r else None
        for pat in order:
            if not ok(prev, pat):
                continue
            for c in pat:
                colc[c] += 1
            rows.append(pat)
            if feasible(r + 1) and dfs(r + 1):
                return True
            rows.pop()
            for c in pat:
                colc[c] -= 1
        return False

    return rows if dfs(0) else None


def grow_regions(n, s, stars, rng):
    """Partition grid into n regions, each containing exactly s of the stars.
    Seeds: group stars into n groups of s (pair each star with a near one for
    s=2), then multi-source BFS growth."""
    cells = [(r, c) for r in range(n) for c in range(n)]
    star_cells = [(r, c) for r, pat in enumerate(stars) for c in pat]
    rng.shuffle(star_cells)
    groups = []
    if s == 1:
        groups = [[sc] for sc in star_cells]
    else:
        pool = star_cells[:]
        while pool:
            a = pool.pop()
            # nearest remaining
            b = min(pool, key=lambda x: abs(x[0] - a[0]) + abs(x[1] - a[1]) + rng.random())
            pool.remove(b)
            groups.append([a, b])
    region = [[-1] * n for _ in range(n)]
    for i, g in enumerate(groups):
        for (r, c) in g:
            region[r][c] = i
    # contiguity: for 2-star regions the two seeds must be connected inside
    # their own region — carve a BFS corridor between them (avoiding cells
    # already owned by other regions) before growth. Without this, growth can
    # leave a region in two disconnected blobs (caught by validate()).
    if s == 2:
        from collections import deque
        for i, g in enumerate(groups):
            (ar, ac), (br, bc) = g
            q = deque([(ar, ac)])
            prev = {(ar, ac): None}
            found = False
            while q and not found:
                r, c = q.popleft()
                for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                    rr, cc = r + dr, c + dc
                    if not (0 <= rr < n and 0 <= cc < n) or (rr, cc) in prev:
                        continue
                    if region[rr][cc] not in (-1, i):
                        continue
                    prev[(rr, cc)] = (r, c)
                    if (rr, cc) == (br, bc):
                        found = True
                        break
                    q.append((rr, cc))
            if not found:
                return None
            cur = (br, bc)
            while cur is not None:
                region[cur[0]][cur[1]] = i
                cur = prev[cur]
    frontier = []
    for r in range(n):
        for c in range(n):
            if region[r][c] != -1:
                frontier.append((r, c))
    rng.shuffle(frontier)
    while frontier:
        idx = rng.randrange(len(frontier))
        r, c = frontier[idx]
        opts = [(r + dr, c + dc) for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0))
                if 0 <= r + dr < n and 0 <= c + dc < n and region[r + dr][c + dc] == -1]
        if not opts:
            frontier.pop(idx)
            continue
        rr, cc = opts[rng.randrange(len(opts))]
        region[rr][cc] = region[r][c]
        frontier.append((rr, cc))
    if any(region[r][c] == -1 for r in range(n) for c in range(n)):
        return None
    return region


def count_solutions(n, s, region, limit=2):
    """Row-wise DFS with column/region count + adjacency pruning."""
    pats = row_patterns(n, s)
    colc = [0] * n
    regc = [0] * n
    # cells per region per row suffix, for region feasibility pruning
    reg_rows = [[0] * n for _ in range(n)]  # reg_rows[r][g] = cells of region g in row r
    for r in range(n):
        for c in range(n):
            reg_rows[r][region[r][c]] += 1
    reg_suffix = [[0] * n for _ in range(n + 1)]
    for r in range(n - 1, -1, -1):
        for g in range(n):
            reg_suffix[r][g] = reg_suffix[r + 1][g] + reg_rows[r][g]
    count = 0

    def dfs(r, prev):
        nonlocal count
        if count >= limit:
            return
        if r == n:
            if all(colc[c] == s for c in range(n)) and all(regc[g] == s for g in range(n)):
                count += 1
            return
        rem = n - r
        for c in range(n):
            if s - colc[c] > rem:
                return
        for g in range(n):
            need = s - regc[g]
            if need < 0 or need > reg_suffix[r][g]:
                return
        for pat in pats:
            bad = False
            for c in pat:
                if colc[c] >= s:
                    bad = True
                    break
                if prev is not None:
                    for p in prev:
                        if abs(p - c) <= 1:
                            bad = True
                            break
                    if bad:
                        break
            if bad:
                continue
            gs = [region[r][c] for c in pat]
            if s == 2 and gs[0] == gs[1] and regc[gs[0]] > 0:
                continue
            over = False
            for g in gs:
                regc[g] += 1
                if regc[g] > s:
                    over = True
            for c in pat:
                colc[c] += 1
            if not over:
                dfs(r + 1, pat)
            for c in pat:
                colc[c] -= 1
            for g in gs:
                regc[g] -= 1
            if count >= limit:
                return

    dfs(0, None)
    return count


def make_puzzle(n, s, rng, max_tries=50000):
    for _ in range(max_tries):
        stars = place_stars(n, s, rng)
        if not stars:
            continue
        region = grow_regions(n, s, stars, rng)
        if region is None:
            continue
        if count_solutions(n, s, region) == 1:
            reg_str = "".join("abcdefghij"[region[r][c]] for r in range(n) for c in range(n))
            sol_str = "".join("1" if c in stars[r] else "0" for r in range(n) for c in range(n))
            return {"n": n, "s": s, "g": reg_str, "sol": sol_str}
    raise RuntimeError("no unique puzzle found in max_tries")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"starbattle-daily-{d.isoformat()}")
        dailies[d.isoformat()] = make_puzzle(10, 2, rng)
        if (i - a) % 25 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (8, 1, 120), "medium": (10, 2, 120), "hard": (10, 2, 80)}


def gen_pool(diff, out):
    n, s, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"starbattle-pool-{diff}-{i}")
        arr.append(make_puzzle(n, s, rng))
        if i % 20 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("sbdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS, f"expected {DAILY_DAYS}, got {len(dailies)}"
    pools = {d: json.load(open(os.path.join(parts_dir, f"sbpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "starbattle-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "starbattle-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n, s = p["n"], p["s"]
        reg = p["g"]; sol = p["sol"]
        assert len(reg) == n * n and len(sol) == n * n, name
        stars = [i for i, ch in enumerate(sol) if ch == "1"]
        assert len(stars) == n * s, name
        rows = [0] * n; cols = [0] * n; regs = {}
        for i in stars:
            r, c = divmod(i, n)
            rows[r] += 1; cols[c] += 1
            regs[reg[i]] = regs.get(reg[i], 0) + 1
        assert all(v == s for v in rows) and all(v == s for v in cols), f"{name} counts"
        assert len(regs) == n and all(v == s for v in regs.values()), f"{name} regions"
        ss = set(stars)
        for i in stars:
            r, c = divmod(i, n)
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == dc == 0:
                        continue
                    rr, cc = r + dr, c + dc
                    if 0 <= rr < n and 0 <= cc < n and rr * n + cc in ss:
                        raise AssertionError(f"{name} adjacency")
        # region contiguity
        for g in set(reg):
            cells = [i for i, ch in enumerate(reg) if ch == g]
            seen = {cells[0]}; stack = [cells[0]]
            cs = set(cells)
            while stack:
                i = stack.pop()
                r, c = divmod(i, n)
                for dr, dc in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                    j = (r + dr) * n + (c + dc)
                    if 0 <= r + dr < n and 0 <= c + dc < n and j in cs and j not in seen:
                        seen.add(j); stack.append(j)
            assert len(seen) == len(cells), f"{name} region {g} not contiguous"

    d = json.load(open(os.path.join(site, "starbattle-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "starbattle-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_starbattle.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
