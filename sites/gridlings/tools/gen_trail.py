# -*- coding: utf-8 -*-
"""Trail generator — Zip-family path puzzle. Draw one path that visits the
numbered cells in order and fills EVERY cell of the grid.

Board = one Hamiltonian path; clues = K numbered waypoints along it (start and
end always numbered). Same contract as every Gridlings puzzle: published
boards are machine-verified to have exactly ONE solution.

Naming note: LinkedIn filed a trademark on "Zip" (Feb 2025) — the product name
here is Trail; "Zip-style" appears only as a descriptive comparison in copy.

Run modes: daily A B OUT | pool DIFF OUT | merge DIR | validate
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)
DAILY_DAYS = 450
DIRS = ((0, 1), (1, 0), (0, -1), (-1, 0))


def ham_path(n, rng):
    """Random Hamiltonian path via randomized DFS with connectivity pruning."""
    total = n * n
    start = (rng.randrange(n), rng.randrange(n))
    visited = {start}
    path = [start]

    def free_connected(cur):
        # all unvisited cells must be reachable from some neighbor of cur
        free = [(r, c) for r in range(n) for c in range(n) if (r, c) not in visited]
        if not free:
            return True
        seed = None
        for dr, dc in DIRS:
            cand = (cur[0] + dr, cur[1] + dc)
            if 0 <= cand[0] < n and 0 <= cand[1] < n and cand not in visited:
                seed = cand
                break
        if seed is None:
            return False
        seen = {seed}
        stack = [seed]
        fs = set(free)
        while stack:
            r, c = stack.pop()
            for dr, dc in DIRS:
                nx = (r + dr, c + dc)
                if nx in fs and nx not in seen:
                    seen.add(nx)
                    stack.append(nx)
        return len(seen) == len(free)

    def dfs():
        if len(path) == total:
            return True
        cur = path[-1]
        opts = []
        for dr, dc in DIRS:
            nx = (cur[0] + dr, cur[1] + dc)
            if 0 <= nx[0] < n and 0 <= nx[1] < n and nx not in visited:
                opts.append(nx)
        rng.shuffle(opts)
        for nx in opts:
            visited.add(nx)
            path.append(nx)
            if free_connected(nx) and dfs():
                return True
            path.pop()
            visited.remove(nx)
        return False

    return path if dfs() else None


def count_solutions(n, waypoints, limit=2):
    """Count paths visiting all cells with waypoints hit in order.
    waypoints: dict cell->ordinal (1..K). Path must start at ordinal-1 cell and
    end at ordinal-K cell."""
    total = n * n
    K = max(waypoints.values())
    start = next(c for c, o in waypoints.items() if o == 1)
    end = next(c for c, o in waypoints.items() if o == K)
    count = 0
    visited = {start}

    def free_ok(cur, nxt_ord):
        free = [(r, c) for r in range(n) for c in range(n) if (r, c) not in visited]
        if not free:
            return True
        seed = None
        for dr, dc in DIRS:
            cand = (cur[0] + dr, cur[1] + dc)
            if 0 <= cand[0] < n and 0 <= cand[1] < n and cand not in visited:
                seed = cand
                break
        if seed is None:
            return False
        seen = {seed}
        stack = [seed]
        fs = set(free)
        while stack:
            r, c = stack.pop()
            for dr, dc in DIRS:
                nx = (r + dr, c + dc)
                if nx in fs and nx not in seen:
                    seen.add(nx)
                    stack.append(nx)
        return len(seen) == len(free)

    def dfs(cur, filled, nxt_ord):
        nonlocal count
        if count >= limit:
            return
        if filled == total:
            if cur == end and nxt_ord > K:
                count += 1
            return
        for dr, dc in DIRS:
            nx = (cur[0] + dr, cur[1] + dc)
            if not (0 <= nx[0] < n and 0 <= nx[1] < n) or nx in visited:
                continue
            o = waypoints.get(nx)
            if o is not None:
                if o != nxt_ord:
                    continue
                # end waypoint may only be entered on the last cell
                if o == K and filled + 1 != total:
                    continue
            elif nx == end:
                continue
            visited.add(nx)
            if free_ok(nx, nxt_ord):
                dfs(nx, filled + 1, nxt_ord + 1 if o is not None else nxt_ord)
            visited.remove(nx)
            if count >= limit:
                return

    dfs(start, 1, 2)
    return count


def make_puzzle(n, k, rng, max_tries=5000):
    """k = number of waypoints (incl. start & end). Fewer = harder."""
    for _ in range(max_tries):
        path = ham_path(n, rng)
        if not path:
            continue
        total = n * n
        # waypoint ordinals along the path: 0 and last, plus k-2 middles
        idxs = sorted(rng.sample(range(1, total - 1), k - 2))
        marks = [0] + idxs + [total - 1]
        waypoints = {path[p]: i + 1 for i, p in enumerate(marks)}
        if count_solutions(n, waypoints) == 1:
            wp_str = ["0"] * total
            for (r, c), o in waypoints.items():
                wp_str[r * n + c] = format(o, "x")  # hex digit, k <= 15
            sol = "".join(format(r * n + c, "02d") for (r, c) in path)
            return {"n": n, "w": "".join(wp_str), "sol": sol}
    raise RuntimeError("no unique puzzle in max_tries")


def gen_daily_range(a, b, out):
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"trail-daily-{d.isoformat()}")
        k = {0: 12, 1: 11, 2: 11, 3: 10, 4: 10, 5: 9, 6: 9}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(6, k, rng)
        if (i - a) % 25 == 0:
            print(f"daily {d} ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b}: {len(dailies)}")


POOL_SPECS = {"easy": (5, 6, 120), "medium": (6, 11, 120), "hard": (6, 9, 80)}


def gen_pool(diff, out):
    n, k, count = POOL_SPECS[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"trail-pool-{diff}-{i}")
        arr.append(make_puzzle(n, k, rng))
        if i % 20 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff}: {len(arr)}")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("trdaily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS, f"expected {DAILY_DAYS}, got {len(dailies)}"
    pools = {d: json.load(open(os.path.join(parts_dir, f"trpool-{d}.json"))) for d in POOL_SPECS}
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "trail-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "trail-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool")


def validate():
    site = os.path.join(ROOT, "site")

    def check(p, name):
        n = p["n"]; total = n * n
        w = p["w"]; sol = p["sol"]
        assert len(w) == total and len(sol) == total * 2, name
        cells = [int(sol[i:i + 2]) for i in range(0, len(sol), 2)]
        assert sorted(cells) == list(range(total)), f"{name} not hamiltonian"
        for a, b in zip(cells, cells[1:]):
            ra, ca = divmod(a, n); rb, cb = divmod(b, n)
            assert abs(ra - rb) + abs(ca - cb) == 1, f"{name} not contiguous"
        # waypoints appear along path in order; start/end numbered
        ords = [(int(w[c], 16), i) for i, c in enumerate(cells) if w[c] != "0"]
        ks = [o for o, _ in ords]
        assert ks == sorted(ks) and ks[0] == 1, f"{name} waypoint order"
        assert w[cells[0]] != "0" and w[cells[-1]] != "0", f"{name} endpoints unnumbered"

    d = json.load(open(os.path.join(site, "trail-daily.json")))
    for k, p in d["puzzles"].items():
        check(p, k)
    pools = json.load(open(os.path.join(site, "trail-pool.json")))
    for diff, arr in pools.items():
        for i, p in enumerate(arr):
            check(p, f"{diff}-{i}")
    print(f"OK: {len(d['puzzles'])} dailies + {sum(len(v) for v in pools.values())} pool valid")


def main():
    a = sys.argv[1:]
    if not a:
        print("usage: gen_trail.py daily A B OUT | pool DIFF OUT | merge DIR | validate")
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
