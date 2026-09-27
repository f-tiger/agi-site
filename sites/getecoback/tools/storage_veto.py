#!/usr/bin/env python3
"""Shared reader for tools/storage_veto.txt (2026-09-27).

The owner took every energy-storage product off this site's shelves. Three
places need the same answer to "is this a storage product?": the shelf builder
(build_structure.py refuses to start with a storage card in its tables), the
homepage rising rail (which turns Trends queries into Amazon chips with nobody
in the loop), and the deploy gate (check_storage_veto.py, which reads the built
pages). One list, one normaliser, so the three cannot disagree.
"""
import html
import os
import urllib.parse

VETO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage_veto.txt")


def load(path=VETO_FILE):
    tokens, allow = [], []
    for line in open(path, encoding="utf-8"):
        line = line.split("#", 1)[0].strip().lower()
        if not line:
            continue
        (allow if line.startswith("!") else tokens).append(line.lstrip("!"))
    return tokens, allow


def norm(text):
    """Lower-case, HTML-unescaped, URL-decoded ('+' → space) form of a query."""
    s = html.unescape(str(text))
    s = urllib.parse.unquote_plus(s)
    return " ".join(s.lower().split())


def is_storage(text, veto=None):
    tokens, allow = veto or load()
    s = norm(text)
    for a in allow:
        s = s.replace(a, " ")
    return next((t for t in tokens if t in s), None)
