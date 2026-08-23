# -*- coding: utf-8 -*-
"""KDP book #1 — 'Nonograms Without Guessing': 120 exclusive line-solvable
nonograms (40×10x10, 40×12x12, 40×15x15). Book seeds are disjoint from the
site's daily/pool seeds, so the paid product never duplicates free content.

Outputs book1.json, then render_book1.py builds the print-ready interior.
"""
import json, os, random, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                "..", "..", "sites", "gridlings", "tools"))
import gen_nonogram as ng

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "book1.json")
SPEC = [(10, 40), (12, 40), (15, 40)]


def main():
    puzzles = []
    for n, count in SPEC:
        for i in range(count):
            rng = random.Random(f"kdp-book1-ng-{n}-{i}")
            p = ng.make_puzzle(n, rng)
            # re-verify with the library's own validator logic
            row_cl = [[int(x) for x in c.split(".")] for c in p["r"].split(",")]
            col_cl = [[int(x) for x in c.split(".")] for c in p["c"].split(",")]
            solved = ng.line_solve(n, row_cl, col_cl)
            assert solved is not None
            assert "".join(str(solved[r][c]) for r in range(n) for c in range(n)) == p["sol"]
            puzzles.append(p)
        print(f"{n}x{n}: {count} ok", flush=True)
    json.dump(puzzles, open(OUT, "w"), separators=(",", ":"))
    print(f"book1.json: {len(puzzles)} puzzles")


if __name__ == "__main__":
    main()
