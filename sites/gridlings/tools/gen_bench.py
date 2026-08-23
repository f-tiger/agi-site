# -*- coding: utf-8 -*-
"""Gridlings-Bench v1 — a machine-verified logic-puzzle evaluation set drawn
from the published free-play pools (never from dailies, so the daily game is
not spoiled). 11 constraint families × up to 100 boards each, every board
carrying its verified unique solution and a difficulty tag.

Output: site/bench-v1.json  (regenerate whenever a pool file changes)
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")

# per game: pool file, rules summary (the exact contract an evaluator needs),
# answer format description
GAMES = {
    "gridlings": {
        "file": "puzzles-pool.json",
        "rules": "N×N grid. Place one animal-color pair in every cell so each row and column contains each animal exactly once and each color exactly once, every animal-color pair appears exactly once in the grid (Graeco-Latin square), and the same animal never appears in two cells that touch, even diagonally. Givens: `ga`/`gc` give the animal/color index per cell, '.' = unknown.",
        "answer": "Object {\"a\": <N*N digits>, \"c\": <N*N digits>} row-major.",
    },
    "balance": {
        "file": "balance-pool.json",
        "rules": "N×N binary grid. Fill every cell with 0 or 1 so each row and column contains exactly N/2 of each symbol and no three equal symbols are adjacent horizontally or vertically. Givens: `g` gives the symbol per cell, '.' = unknown.",
        "answer": "String of N*N characters '0'/'1', row-major.",
    },
    "starbattle": {
        "file": "starbattle-pool.json",
        "rules": "N×N grid divided into N regions. Place stars so each row, each column and each region contains exactly S stars, and no two stars touch, even diagonally. S is given per puzzle.",
        "answer": "String of N*N characters '0'/'1' (1 = star), row-major.",
    },
    "trail": {
        "file": "trail-pool.json",
        "rules": "N×N grid with numbered waypoints (`w`: one hex digit per cell, 0 = no waypoint; waypoint 1 is the path start, the highest waypoint is the path end). Draw a single orthogonally-connected path that visits every cell exactly once and passes through the waypoints in ascending numeric order.",
        "answer": "Concatenated 2-digit row-major cell indices in path order (N*N pairs).",
    },
    "futoshiki": {
        "file": "futoshiki-pool.json",
        "rules": "N×N Latin square: each row and column contains 1..N exactly once, and every inequality sign between adjacent cells must hold.",
        "answer": "String of N*N digits, row-major.",
    },
    "towers": {
        "file": "towers-pool.json",
        "rules": "N×N Latin square of tower heights 1..N. Each outside clue gives the number of towers visible from that direction (taller towers hide shorter ones behind them).",
        "answer": "String of N*N digits, row-major.",
    },
    "minisudoku": {
        "file": "minisudoku-pool.json",
        "rules": "N×N Latin square with boxes of size BR×BC: each row, column and box contains 1..N exactly once.",
        "answer": "String of N*N digits, row-major.",
    },
    "kropki": {
        "file": "kropki-pool.json",
        "rules": "N×N Latin square with dot constraints between adjacent cells: a white dot means the two numbers differ by exactly 1, a black dot means one is double the other, and NO dot means neither relation holds (negative constraint). A 1-2 pair is marked with a black dot.",
        "answer": "String of N*N digits, row-major.",
    },
    "sandwich": {
        "file": "sandwich-pool.json",
        "rules": "N×N Latin square. Each outside clue equals the sum of the numbers strictly between 1 and N (the largest number) in that row or column.",
        "answer": "String of N*N digits, row-major.",
    },
    "thermo": {
        "file": "thermo-pool.json",
        "rules": "N×N grid partitioned into snake-shaped thermometers (bulb first). Fill mercury from each bulb continuously along the tube (a filled cell implies all cells nearer the bulb are filled). Row and column clues give the number of filled cells in that line.",
        "answer": "String of N*N characters '0'/'1' (1 = filled), row-major.",
    },
    "nonogram": {
        "file": "nonogram-pool.json",
        "rules": "N×N binary picture grid. Row and column clues list the lengths of the runs of filled cells in order, with at least one empty cell between runs. Additionally, every board in this set is verified solvable by row/column constraint propagation alone (no search required).",
        "answer": "String of N*N characters '0'/'1' (1 = filled), row-major.",
    },
}

PER_DIFF = {"easy": 30, "medium": 40, "hard": 30}


def main():
    bench = {
        "name": "Gridlings-Bench",
        "version": "1.0",
        "date": "2026-08-23",
        "license": "CC BY 4.0 — cite play.agiscorecard.com/bench",
        "url": "https://play.agiscorecard.com/bench",
        "description": (
            "1,100 constraint-logic puzzles across 11 distinct rule families, every "
            "board machine-verified to have exactly one solution (nonograms further "
            "verified solvable by pure line propagation). Drawn from the Gridlings "
            "free-play pools; the daily boards are excluded. Guessing never helps: "
            "a wrong answer is provably wrong, so exact-match accuracy is a clean "
            "metric. Solutions included for scoring."
        ),
        "scoring": (
            "For each puzzle, produce the answer in the family's answer format. "
            "Score = exact match against `solution`. Report accuracy per family "
            "and overall; families are deliberately diverse so aggregate scores "
            "resist per-family overfitting."
        ),
        "families": {},
        "puzzles": [],
    }
    def split(p, slug):
        """Return (puzzle-without-solution, solution) per family encoding."""
        if slug == "gridlings":
            n, m = p["n"], p["m"]
            ga = "".join(p["a"][i] if m[i] == "1" else "." for i in range(n * n))
            gc = "".join(p["c"][i] if m[i] == "1" else "." for i in range(n * n))
            return {"n": n, "ga": ga, "gc": gc}, {"a": p["a"], "c": p["c"]}
        if slug == "balance":
            n, m = p["n"], p["m"]
            g = "".join(p["s"][i] if m[i] == "1" else "." for i in range(n * n))
            return {"n": n, "g": g}, p["s"]
        q = {k: v for k, v in p.items() if k != "sol"}
        return q, p["sol"]

    total = 0
    for slug, meta in GAMES.items():
        pools = json.load(open(os.path.join(SITE, meta["file"])))
        bench["families"][slug] = {"rules": meta["rules"], "answer_format": meta["answer"]}
        n_added = 0
        for diff, want in PER_DIFF.items():
            arr = pools.get(diff, [])
            take = arr[:want]
            for i, p in enumerate(take):
                q, sol = split(p, slug)
                bench["puzzles"].append({
                    "id": f"{slug}-{diff}-{i}",
                    "family": slug,
                    "difficulty": diff,
                    "puzzle": q,
                    "solution": sol,
                })
                n_added += 1
        total += n_added
        print(f"{slug}: {n_added}")
    bench["count"] = total
    out = os.path.join(SITE, "bench-v1.json")
    json.dump(bench, open(out, "w"), separators=(",", ":"))
    print(f"bench-v1.json: {total} puzzles, {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    main()
