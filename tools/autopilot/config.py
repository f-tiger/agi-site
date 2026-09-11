#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Autopilot per-site configuration: load, validate, REJECT.

舰队纪律(2026-09-06 执行器事故立的规矩):**消费者不信任生产者的数据文件**,同仓同
作者也是输入。所以这里对 autopilot.json 只有两种结局——通过,或者抛异常。绝不"静默
归一化"一个畸形配置:归一化会把上游 bug 藏起来,而 autopilot 每天对 8 个站点的
sitemap 动手,藏一个 bug 就是每天说一次谎。
"""
import json
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REQUIRED = ("site", "url_base", "publish_root", "sitemap")


class ConfigError(ValueError):
    pass


class SiteConfig:
    def __init__(self, raw, path):
        self.path = path
        for k in REQUIRED:
            if not raw.get(k):
                raise ConfigError("%s: missing required key %r" % (path, k))
        self.site = raw["site"]
        self.url_base = raw["url_base"].rstrip("/")
        if not self.url_base.startswith("https://"):
            raise ConfigError("%s: url_base must be https://, got %r" % (path, self.url_base))
        # publish_root / sitemap are repo-relative so every caller resolves the same
        # file regardless of its own cwd — CI steps and local runs have differed before.
        self.publish_root = os.path.join(REPO, raw["publish_root"])
        self.sitemap = os.path.join(REPO, raw["sitemap"])
        if not os.path.isdir(self.publish_root):
            raise ConfigError("%s: publish_root does not exist: %s" % (path, self.publish_root))
        if not os.path.isfile(self.sitemap):
            raise ConfigError("%s: sitemap does not exist: %s" % (path, self.sitemap))

        self.exclude = [re.compile(p) for p in raw.get("exclude", [])]
        # Regions blanked before hashing: injected site chrome. A nav rewrite across
        # 176 pages is not 176 content updates, and stamping it as such is exactly the
        # dishonest-freshness the fleet forbids.
        self.normalize = []
        for n in raw.get("normalize", []):
            try:
                self.normalize.append(re.compile(n, re.S))
            except re.error as e:
                raise ConfigError("%s: bad normalize regex %r: %s" % (path, n, e))
        # URL-path rewrites for Workers that serve a file under a different path
        # (gridlings: /zh/balance -> balance-zh.html). [pattern, replacement] pairs.
        self.rewrites = []
        for pair in raw.get("rewrites", []):
            if not (isinstance(pair, list) and len(pair) == 2):
                raise ConfigError("%s: rewrites entries must be [pattern, replacement]" % path)
            try:
                self.rewrites.append((re.compile(pair[0]), pair[1]))
            except re.error as e:
                raise ConfigError("%s: bad rewrite regex %r: %s" % (path, pair[0], e))

        # Worker-served paths (gridlings). Parsed from the worker, never re-typed.
        self.worker_map = {}
        wr = raw.get("worker_routes")
        if wr:
            self.worker_map = worker_routes(os.path.join(REPO, wr))
            if not self.worker_map:
                raise ConfigError("%s: worker_routes %s yielded no routes — the parser "
                                  "no longer matches that file's shape" % (path, wr))

        # An unresolvable <loc> is left alone, never guessed. But if too many are
        # unresolvable the mapping itself is wrong, and correcting the rest would be
        # writing dates we cannot justify — so the run fails instead.
        self.max_unresolved = int(raw.get("max_unresolved", 0))
        self.indexnow = bool(raw.get("indexnow", True))
        # Sites whose sitemap is already rebuilt by their own generator every deploy
        # (baipiaoji, gamesledger, getecoback) set this false: two writers on one file
        # is a merge conflict every night, and their generators are the authority.
        self.fix_sitemap = bool(raw.get("fix_sitemap", True))
        self.demand_files = raw.get("demand_files", [])
        self.demand_geo = raw.get("demand_geo", "")
        self.vocabulary = raw.get("vocabulary", [])
        self.enabled = bool(raw.get("enabled", True))
        self.raw = raw

    # ---- URL <-> file -------------------------------------------------------
    def rel_for_url(self, url):
        """Return the publish_root-relative file for a sitemap <loc>, or None."""
        if not url.startswith(self.url_base):
            return None
        rel = url[len(self.url_base):].lstrip("/")
        mapped = self.worker_map.get(rel) or self.worker_map.get(rel.rstrip("/"))
        if mapped and os.path.isfile(os.path.join(self.publish_root, mapped)):
            return mapped
        for pat, repl in self.rewrites:
            if pat.search(rel):
                rel = pat.sub(repl, rel)
                break
        if rel == "":
            cands = ["index.html"]
        else:
            cands = [rel, rel + ".html", os.path.join(rel, "index.html")]
        for c in cands:
            if c and os.path.isfile(os.path.join(self.publish_root, c)):
                return c
        return None

    def url_for_rel(self, rel):
        return self.url_base + "/" + rel.replace(os.sep, "/")

    def is_excluded(self, rel):
        return any(p.search(rel) for p in self.exclude)


def load(site):
    path = os.path.join(REPO, "sites", site, "autopilot.json")
    if not os.path.isfile(path):
        raise ConfigError("no autopilot config for %r at %s" % (site, path))
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    return SiteConfig(raw, path)


def all_sites():
    base = os.path.join(REPO, "sites")
    return sorted(
        d for d in os.listdir(base)
        if os.path.isfile(os.path.join(base, d, "autopilot.json"))
    )


# --- Worker route table --------------------------------------------------------
# gridlings serves /zh/balance from balance-zh.html and /download from downloads.html
# through an explicit if/else chain in worker.js. Hand-copying that table into
# autopilot.json would drift the first time a game is added — and drift here is not
# cosmetic: an unresolved <loc> makes this tool refuse to write any date for the site.
# So parse the worker's own chain instead. It is the authority; we read it.
WORKER_ROUTE = re.compile(
    r'url\.pathname\s*===\s*"(/[^"]*)"'          # === "/download"
    r'(?:[^{]*?===\s*"(?:/[^"]*)")?'             # optional  || === "/download/"
    r'\s*\)\s*\{[^}]*?new URL\(\s*"(/[^"]+)"',   # ... new URL("/downloads.html"
    re.S,
)


def worker_routes(path):
    """{url-path-without-leading-slash: asset-path-without-leading-slash}."""
    if not os.path.isfile(path):
        raise ConfigError("worker_routes file not found: %s" % path)
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    out = {}
    for url_path, asset in WORKER_ROUTE.findall(src):
        key = url_path.strip("/")
        if key and asset.endswith((".html", ".htm")):
            out[key] = asset.lstrip("/")
    return out
