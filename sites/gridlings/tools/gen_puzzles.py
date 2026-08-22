# -*- coding: utf-8 -*-
"""Gridlings puzzle generator — Graeco-Latin square + no-touch constraint.

Rules of the game (friend-validated shape, original brand):
  - 5×5 grid; every cell holds one animal in one color.
  - Each row and each column contains each animal exactly once and each
    color exactly once (double Latin square).
  - Every (animal, color) pair appears exactly once (orthogonality).
  - The same animal never touches itself, not even diagonally.

Every published puzzle has a PROVABLY UNIQUE solution: givens are removed
one by one and a removal is kept only while the full constraint solver
still counts exactly one solution. That guarantee is the product's honesty
hook ("solvable by pure deduction — no guessing") and must never be
weakened for speed.

Run:  python3 tools/gen_puzzles.py          (bakes site/puzzles-*.json)
Deterministic per seed — regeneration with the same code reproduces the
same files, so dailies never shift under players' feet.
"""
import json, os, random, sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EPOCH = date(2026, 8, 24)          # daily #1 — launch Monday
DAILY_DAYS = 450
DAILY_N = 5


def gen_solution(n, rng):
    """Animal Latin square with no diagonal self-touch, then an orthogonal
    color mate. Returns (A, C) or None if this attempt dead-ends."""
    A = [[None] * n for _ in range(n)]

    def ok_a(r, c, v):
        for cc in range(c):
            if A[r][cc] == v:
                return False
        for rr in range(r):
            if A[rr][c] == v:
                return False
        if r > 0:
            for cc in (c - 1, c, c + 1):
                if 0 <= cc < n and A[r - 1][cc] == v:
                    return False
        return True

    def fill_a(pos):
        if pos == n * n:
            return True
        r, c = divmod(pos, n)
        vals = list(range(n))
        rng.shuffle(vals)
        for v in vals:
            if ok_a(r, c, v):
                A[r][c] = v
                if fill_a(pos + 1):
                    return True
                A[r][c] = None
        return False

    if not fill_a(0):
        return None

    C = [[None] * n for _ in range(n)]
    used_pairs = set()

    def ok_c(r, c, v):
        for cc in range(c):
            if C[r][cc] == v:
                return False
        for rr in range(r):
            if C[rr][c] == v:
                return False
        return (A[r][c], v) not in used_pairs

    def fill_c(pos):
        if pos == n * n:
            return True
        r, c = divmod(pos, n)
        vals = list(range(n))
        rng.shuffle(vals)
        for v in vals:
            if ok_c(r, c, v):
                C[r][c] = v
                used_pairs.add((A[r][c], v))
                if fill_c(pos + 1):
                    return True
                used_pairs.discard((A[r][c], v))
                C[r][c] = None
        return False

    if not fill_c(0):
        return None
    return A, C


def count_solutions(n, givens, limit=2):
    """givens: dict pos -> (a, c). Full-rules solver, counts to `limit`."""
    A = [[None] * n for _ in range(n)]
    C = [[None] * n for _ in range(n)]
    pairs = set()
    for pos, (a, c) in givens.items():
        r, cc = divmod(pos, n)
        A[r][cc], C[r][cc] = a, c
        pairs.add((a, c))

    empties = [p for p in range(n * n) if p not in givens]
    count = 0

    def cands(pos):
        r, c = divmod(pos, n)
        outs = []
        row_a = {A[r][x] for x in range(n) if A[r][x] is not None}
        col_a = {A[x][c] for x in range(n) if A[x][c] is not None}
        row_c = {C[r][x] for x in range(n) if C[r][x] is not None}
        col_c = {C[x][c] for x in range(n) if C[x][c] is not None}
        near = set()
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                if dr == dc == 0:
                    continue
                rr, cc2 = r + dr, c + dc
                if 0 <= rr < n and 0 <= cc2 < n and A[rr][cc2] is not None:
                    near.add(A[rr][cc2])
        for a in range(n):
            if a in row_a or a in col_a or a in near:
                continue
            for col in range(n):
                if col in row_c or col in col_c or (a, col) in pairs:
                    continue
                outs.append((a, col))
        return outs

    def dfs():
        nonlocal count
        if count >= limit:
            return
        best, best_c = None, None
        for p in empties:
            r, c = divmod(p, n)
            if A[r][c] is not None:
                continue
            cs = cands(p)
            if not cs:
                return
            if best_c is None or len(cs) < len(best_c):
                best, best_c = p, cs
                if len(cs) == 1:
                    break
        if best is None:
            count += 1
            return
        r, c = divmod(best, n)
        for a, col in best_c:
            A[r][c], C[r][c] = a, col
            pairs.add((a, col))
            dfs()
            pairs.discard((a, col))
            A[r][c] = C[r][c] = None
            if count >= limit:
                return

    dfs()
    return count


def make_puzzle(n, rng, min_givens):
    sol = None
    while sol is None:
        sol = gen_solution(n, rng)
    A, C = sol
    givens = {p: (A[p // n][p % n], C[p // n][p % n]) for p in range(n * n)}
    order = list(range(n * n))
    rng.shuffle(order)
    for p in order:
        if len(givens) <= min_givens:
            break
        saved = givens.pop(p)
        if count_solutions(n, givens) != 1:
            givens[p] = saved
    a_str = "".join(str(A[r][c]) for r in range(n) for c in range(n))
    c_str = "".join(str(C[r][c]) for r in range(n) for c in range(n))
    m_str = "".join("1" if p in givens else "0" for p in range(n * n))
    assert count_solutions(n, givens) == 1
    return {"n": n, "a": a_str, "c": c_str, "m": m_str}


def gen_daily_range(a, b, out):
    """Shard: dailies [a, b) → JSON part file. Seeded per-date, so shards are
    independent and reproducible."""
    dailies = {}
    for i in range(a, b):
        d = EPOCH + timedelta(days=i)
        rng = random.Random(f"gridlings-daily-{d.isoformat()}")
        # weekday ramp: Mon/Tue gentler boards, weekend leaner givens
        min_g = {0: 12, 1: 11, 2: 10, 3: 10, 4: 9, 5: 8, 6: 8}[d.weekday()]
        dailies[d.isoformat()] = make_puzzle(DAILY_N, rng, min_g)
        if (i - a) % 50 == 0:
            print(f"daily {d} done ({i - a + 1}/{b - a})", flush=True)
    json.dump(dailies, open(out, "w"), separators=(",", ":"))
    print(f"shard {a}-{b} -> {out}: {len(dailies)} puzzles")


# easy is 5×5 with MORE givens, not 4×4: order-4 has only two non-touching
# permutations (2,4,1,3)/(3,1,4,2), so a full 4×4 double-Latin with the
# diagonal no-touch rule is mathematically impossible. Learned 2026-08-22
# when the 4×4 generator span forever — do not "restore" a 4×4 mode.
POOL_SPECS = {"easy": (5, 14, 160), "medium": (5, 10, 160), "hard": (5, 7, 120)}


def gen_pool(diff, out):
    n, min_g, count = POOL_SPECS[diff]
    seed_tag = {"easy": "easy", "medium": "med", "hard": "hard"}[diff]
    arr = []
    for i in range(count):
        rng = random.Random(f"gridlings-pool-{seed_tag}-{i}")
        arr.append(make_puzzle(n, rng, min_g))
        if i % 40 == 0:
            print(f"{diff} {i + 1}/{count}", flush=True)
    json.dump(arr, open(out, "w"), separators=(",", ":"))
    print(f"pool {diff} -> {out}: {len(arr)} puzzles")


def merge(parts_dir):
    site = os.path.join(ROOT, "site")
    dailies = {}
    for f in sorted(os.listdir(parts_dir)):
        if f.startswith("daily-"):
            dailies.update(json.load(open(os.path.join(parts_dir, f))))
    assert len(dailies) == DAILY_DAYS, f"expected {DAILY_DAYS} dailies, got {len(dailies)}"
    pools = {}
    for diff in POOL_SPECS:
        pools[diff] = json.load(open(os.path.join(parts_dir, f"pool-{diff}.json")))
    json.dump({"epoch": EPOCH.isoformat(), "puzzles": dailies},
              open(os.path.join(site, "puzzles-daily.json"), "w"), separators=(",", ":"))
    json.dump(pools, open(os.path.join(site, "puzzles-pool.json"), "w"), separators=(",", ":"))
    print(f"baked {len(dailies)} dailies + {sum(len(v) for v in pools.values())} pool puzzles")


def main():
    args = sys.argv[1:]
    if not args:
        print("usage: gen_puzzles.py daily A B OUT | pool DIFF OUT | merge PARTS_DIR")
        sys.exit(1)
    if args[0] == "daily":
        gen_daily_range(int(args[1]), int(args[2]), args[3])
    elif args[0] == "pool":
        gen_pool(args[1], args[2])
    elif args[0] == "merge":
        merge(args[1])
    else:
        sys.exit(f"unknown mode {args[0]}")


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main()
