#!/usr/bin/env python3
"""Build the public reporting inventory from source configuration, without network I/O.

External deployment evidence is a reviewed catalogue, not Cloudflare DNS discovery.
No traffic, account contents, credentials or live business counts belong in this file.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = Path(__file__).with_name("manifest.json")
GA_REGISTRY = "tools/fleet-analytics/registry.json"
ACCOUNT_ALLOWLIST = "tools/fleet-account/config.mjs"
AGI_ID = "541489054"
PROPERTIES = [
    ("AGI", AGI_ID, "G-FZXLMBB5QB"),
    ("ECO", "544688614", "G-E2V0Q9SJ9V"),
    ("BPJ", "547077892", "G-H79D948F4Z"),
    ("TDS", "547130808", "G-2SEHFY33H8"),
    ("BestBlindToys", "491625986", None),
    ("AIChain", "541485670", None),
    ("Zaoqi", "541626444", None),
    ("ListingLift", "545196738", "G-HT123LQLP7"),
]
PROPERTY_BY_MEASUREMENT = {m: p for _, p, m in PROPERTIES if m}
WEB3 = ["web3", "reconcile", "evidence", "route", "protocol", "permit", "compute", "incentives", "proof", "calls", "disclosures"]
VENTURES = ["rfqdesk", "modelmeter", "querysprint", "filinglens"]
SELL = ["agentready", "selltoagents", "closecalc", "agentfront", "mcppulse", "glossary", "x402", "tools"]
SELL_REV = "d62bbcfc334c7613be1891879cbd889fadc69e10"
SELL_BRANCH = "claude/sales-website-research-plan-7i7rc2"
LOCAL_ALIASES = {"www.getecoback.com": "eco"}
MAPPING_STATUSES = {"unverified", "registry_configured_not_backend_verified",
    "source_configured_not_backend_verified", "historical_property_not_backend_verified",
    "observed_hostname_not_deployment_verified"}


def github(repo, path, revision="main"):
    return f"https://github.com/f-tiger/{repo}/blob/{revision}/{path}"


def ga4(measurement=None, property_id=None, status="unverified", evidence=None):
    return {"property_id": property_id or PROPERTY_BY_MEASUREMENT.get(measurement),
            "measurement_id": measurement, "mapping_status": status,
            "source_paths": evidence or [],
            "backend_receipt": "must_verify_each_report"}


def local_host_evidence(root=ROOT):
    """Union of the analytics registry, explicit Worker routes and account allowlist."""
    hosts = {}

    def add(host, path):
        hosts.setdefault(host, set()).add(path)

    registry = json.loads((root / GA_REGISTRY).read_text())
    for cfg in registry.values():
        for host in cfg["hosts"]:
            add(host, GA_REGISTRY)
    for path in sorted((root / "sites").glob("*/wrangler*")):
        content = path.read_text()
        for host in re.findall(r'["\']pattern["\']\s*:\s*["\']([a-z0-9.-]+)(?:/\*)?["\']', content):
            add(host, str(path.relative_to(root)))
    # Match the literal map entries and its explicitly enumerated web3 expansion;
    # never infer membership just because a hostname ends in agiscorecard.com.
    text = (root / ACCOUNT_ALLOWLIST).read_text().split("export const TOKEN", 1)[0]
    for host in re.findall(r"\[\s*'([a-z0-9.-]+\.[a-z]+)'\s*,", text):
        add(host, ACCOUNT_ALLOWLIST)
    for array in re.findall(r"\.\.\.\[([^\]]+)\]\.map\(x=>\[x\+'\.agiscorecard\.com'", text):
        for prefix in re.findall(r"'([a-z0-9-]+)'", array):
            add(prefix + ".agiscorecard.com", ACCOUNT_ALLOWLIST)
    return {host: sorted(paths) for host, paths in sorted(hosts.items())}


def build(root=ROOT):
    registry = json.loads((root / GA_REGISTRY).read_text())
    by_host = {h: (key, cfg) for key, cfg in registry.items() for h in cfg["hosts"]}
    sites = {}

    def add(host, site_id=None, kind="canonical", evidence=(), mapping=None, note=None, url=None):
        site = sites.setdefault(host, {"id": site_id or host.split(".")[0], "hostname": host,
            "canonical_url": url or f"https://{host}/", "site_kind": kind,
            "source_paths": [], "ga4": ga4(), "aggregate_source_ids": [],
            "coverage_status": "uncovered", "reason": "No verified public aggregate endpoint in the reporting manifest."})
        site["source_paths"] = sorted(set(site["source_paths"]) | set(evidence))
        if mapping:
            site["ga4"] = mapping
        if note:
            site.setdefault("notes", []).append(note)
        return site

    for host, evidence in local_host_evidence(root).items():
        if host in LOCAL_ALIASES:
            continue
        key, cfg = by_host.get(host, (host.split(".")[0], None))
        site_id = key if cfg and len(cfg["hosts"]) == 1 else host.split(".")[0]
        add(host, site_id, "canonical", evidence,
            ga4(cfg["id"], status="registry_configured_not_backend_verified", evidence=[GA_REGISTRY]) if cfg else None)

    # External source catalogue. The eight SellSomething route files plus Createjob,
    # SearchFurture, AIStock, SmarterFuture and Zaoqi sources were read on 2026-10-11.
    # Pinned sources describe evidence, not a promise that the live deployment matches.
    for name in SELL:
        route = github("sellSomething", f"sites/{name}/wrangler.jsonc", SELL_BRANCH)
        tag = github("sellSomething", f"sites/{name}/public/index.html", SELL_REV)
        add(f"{name}.agiscorecard.com", evidence=[route, tag],
            mapping=ga4("G-FZXLMBB5QB", status="source_configured_not_backend_verified", evidence=[tag]))
    create_route = github("createjob", "wrangler.jsonc", "claude/startup-research-website-plan-oz7m04")
    add("lens.agiscorecard.com", evidence=[create_route])
    add("agentfront.agiscorecard.com", evidence=[create_route],
        note="Both Createjob and SellSomething declare this host; current deployment ownership requires verification.")
    add("x402.agiscorecard.com", note="Both Finance account integration and SellSomething route configuration name this host; count it once.")
    search_tag = github("searchFurture", "scripts/gen-seo.mjs")
    add("searchfurture.agiscorecard.com", evidence=[github("searchFurture", "wrangler.toml"), search_tag],
        mapping=ga4("G-FZXLMBB5QB", status="source_configured_not_backend_verified", evidence=[search_tag]))
    sun_tag = github("sunPredition", "src/research-page.js", "c89e90073c715d4b56b4f823e022b252cda1ffb0")
    add("invest.agiscorecard.com", evidence=[sun_tag, "tools/fleet-account/README.md"],
        mapping=ga4("G-FZXLMBB5QB", status="source_configured_not_backend_verified", evidence=[sun_tag]),
        note="SunWatch. Research-page tag evidence is not proof that all pages are instrumented.")
    add("compass.agiscorecard.com", evidence=[github("aistock", "lib/site.ts")],
        note="AIChain property is observed on the legacy Netlify host; do not automatically assign it to this canonical host.")
    add("gushen.agiscorecard.com", evidence=["tools/fleet-account/README.md"],
        note="Canonical host supported by the fleet account allowlist; GA4 property mapping unverified.")
    # User-supplied connected property identities are discovery evidence, not live counts.
    add("bestblindtoys.com", site_id="bestblindtoys", kind="historical_property_host",
        evidence=["sites/getecoback/CLAUDE.md"],
        mapping=ga4(property_id="491625986", status="historical_property_not_backend_verified",
                    evidence=["owner-provided Windsor property list, 2026-10-11"]),
        note="Current deployment source unavailable; retain explicitly in report coverage.")
    add("intersolar-booth-scout.netlify.app", site_id="intersolar", kind="external_canonical",
        evidence=[github("intersolar", "COLLAB-SETUP.md", "claude/munich-intersolar-opportunities-5m1v7u")])
    listing_evidence = github("smarterFuture", "launch/ai-realtor/config.js", "b2875b6c7314c1509f6dce19c89c2f56b72dfc15")
    add("f-tiger.github.io", site_id="listinglift", kind="canonical_path",
        url="https://f-tiger.github.io/smarterFuture/launch/ai-realtor/",
        evidence=[listing_evidence, github("smarterFuture", "llms.txt")],
        mapping=ga4("G-HT123LQLP7", status="source_configured_not_backend_verified", evidence=[listing_evidence]),
        note="Filter by hostname AND /smarterFuture/launch/ai-realtor/ page path; github.io hostname alone is not this site.")
    add("zaoqi-blueprints.pages.dev", site_id="zaoqi", kind="observed_property_host",
        evidence=[github("zaoqi-blueprints", "README.md", "master"), "owner report: Windsor hostname/property pair observed 2026-10-11"],
        mapping=ga4(property_id="541626444", status="observed_hostname_not_deployment_verified",
                    evidence=["owner report: Windsor hostname/property pair observed 2026-10-11"]),
        note="GA4 hostname is observed; source repository does not establish the canonical-versus-alias relationship.")

    sources = []

    def source(source_id, url, hosts, contract="legacy-approved", kind="d1-aggregate", paths=(), grouping=None):
        row = {"id": source_id, "url": url, "kind": kind, "read_contract": contract,
            "timezone": "UTC", "source_paths": list(paths), "min_refresh_seconds": 3600,
            "notes": "One GET per reporting run. Respect cache; no cache-busting or business-event probes."}
        if grouping:
            row["grouping"] = grouping
        sources.append(row)
        for host in hosts:
            sites[host]["aggregate_source_ids"].append(source_id)
            sites[host]["coverage_status"] = "aggregate_configured"
            sites[host]["reason"] = "Endpoint configured; each run must report available, missing, failed or stale separately. Configuration is not data coverage."

    legacy = [("agi-pulse", "agiscorecard.com", "/api/pulse"),
              ("bpj-reach", "baipiaoji.com", "/api/reach?days=28"),
              ("eco-pulse", "getecoback.com", "/api/pulse"),
              ("eco-trend", "getecoback.com", "/api/trend"),
              ("tds-pulse", "thedollscout.com", "/api/pulse")]
    legacy += [(s + "-pulse", s + ".agiscorecard.com", "/api/pulse") for s in
               ["goldrush", "play", "source", "games", "35", "learn", "fanzha", "firstjob", "codeword", "powerbill"]]
    special_sources = {"agi-pulse": "sites/agiscorecard/tools/analytics-worker/index.js",
        "bpj-reach": "sites/baipiaoji/functions/api/reach.js",
        "eco-pulse": "sites/getecoback/src/worker.js", "eco-trend": "sites/getecoback/src/worker.js",
        "tds-pulse": "sites/thedollscout/functions/api/pulse.js"}
    for source_id, host, path in legacy:
        key = by_host[host][0]
        evidence = special_sources.get(source_id, f"sites/{key}/worker.js")
        source(source_id, "https://" + host + path, [host], paths=[evidence])
    for name in VENTURES:
        host = name + ".agiscorecard.com"
        source(name + "-pulse", f"https://{host}/api/pulse", [host], "read-only-aggregate",
               paths=["sites/venture-lab/worker.mjs"])
    web3_hosts = [s + ".agiscorecard.com" for s in WEB3]
    grouping = {"field": "site", "values_by_hostname": {h: "hub" if h.startswith("web3.") else h.split(".")[0] for h in web3_hosts}}
    for name in ["growth", "stats"]:
        source("web3-" + name, "https://web3.agiscorecard.com/api/" + name, web3_hosts,
               "read-only-aggregate", paths=["sites/web3-studio/worker.mjs", "sites/web3-studio/public/catalog.mjs"], grouping=grouping)
    source("verify-stats", "https://verify.agiscorecard.com/api/stats", ["verify.agiscorecard.com"],
           "read-only-aggregate", paths=["sites/agent-delivery-lab/worker.mjs"])
    source("localebatch-pulse", "https://localebatch.agiscorecard.com/api/pulse", ["localebatch.agiscorecard.com"],
           "read-only-aggregate", kind="capability-aggregate", paths=["sites/localebatch/src/worker.mjs"])

    aliases = [
        {"hostname": "www.getecoback.com", "site_id": "eco", "kind": "configured_alias", "ga4": ga4(), "source_paths": ["sites/getecoback/wrangler.jsonc", GA_REGISTRY], "notes": "Same deployed Worker as canonical getecoback.com; do not count as an additional site or copy canonical traffic."},
        {"hostname": "aichain-stocks.netlify.app", "site_id": "compass", "kind": "legacy_alias",
         "ga4": ga4(property_id="541485670", status="observed_hostname_not_deployment_verified", evidence=["owner report: Windsor hostname/property pair observed 2026-10-11"]),
         "source_paths": ["sites/agiscorecard/CLAUDE.md"], "notes": "Keep its GA4 row separate; do not copy it to compass or add users across hosts."},
        {"hostname": "gushen-4g2.pages.dev", "site_id": "gushen", "kind": "legacy_alias", "ga4": ga4(), "source_paths": ["sites/agiscorecard/CLAUDE.md"]},
        {"hostname": "dollscout.pages.dev", "site_id": "tds", "kind": "preview_or_legacy_alias", "ga4": ga4(property_id="547130808", status="observed_hostname_not_deployment_verified", evidence=["owner report: Windsor hostname/property pair observed 2026-10-11"]), "source_paths": ["owner report: Windsor hostname/property pair observed 2026-10-11"]},
        {"hostname": "f-tiger.github.io", "path_prefix": "/zaoqi-blueprints/", "site_id": "zaoqi", "kind": "source_documentation_path", "ga4": ga4(), "source_paths": [github("zaoqi-blueprints", "README.md", "master")], "notes": "No proved hostname/property relationship to the Pages deployment."},
        {"hostname": "compound-discovery.pages.dev", "site_id": "listinglift", "kind": "configured_preview_unverified", "ga4": ga4(), "source_paths": [github("smarterFuture", "wrangler.toml")], "notes": "Derived from configured Pages project name; deployment and hostname not live verified."},
    ]
    return {"version": 1, "inventory_reviewed_on": "2026-10-11", "source_catalog_reviewed_on": "2026-10-11",
        "scope": "Union of repository routes, analytics registry, account allowlist, reviewed external source catalogue and observed GA4 hostname identities. Not a DNS/account asset inventory.",
        "ga4_properties": [{"name": n, "property_id": p, "measurement_id": m, "connection_status": "historically_connected_recheck_each_run", "timezone": None} for n, p, m in PROPERTIES],
        "sources": sorted(sources, key=lambda x: x["id"]), "sites": sorted(sites.values(), key=lambda x: x["hostname"]),
        "aliases": aliases,
        "unmapped_sources_notes": ["Read Windsor get_connectors and get_fields before each report; the current connection list overrides the historical property catalogue.",
            "Always preserve returned GA4 hostnames not in this manifest as observed-unmapped rows; never discard them or distribute property totals to sub-sites.",
            "Missing dates, property mappings, database bindings or aggregate endpoints are unknown, not zero.",
            "Aliases/previews are not extra canonical sites; GA4 users must not be added across hosts, dates or hours to claim unique people.",
            "External catalogue configurations were checked without requesting analytics or business endpoints. No private account data is included."]}


def validate(manifest, root=ROOT):
    assert manifest["version"] == 1, "unknown schema version"
    rows, sources = manifest["sites"], manifest["sources"]
    for key in ["id", "hostname"]:
        assert all(n == 1 for n in Counter(s[key] for s in rows).values()), f"duplicate site {key}"
    for key in ["id", "url"]:
        assert all(n == 1 for n in Counter(s[key] for s in sources).values()), f"duplicate source {key}"
    hosts = {s["hostname"] for s in rows}
    assert set(local_host_evidence(root)) - set(LOCAL_ALIASES) <= hosts, "deployed/registered canonical hosts missing"
    by_id = {s["id"]: s for s in sources}
    properties = {p["property_id"] for p in manifest["ga4_properties"]}
    for site in rows:
        assert site["source_paths"], "missing site evidence"
        assert urlparse(site["canonical_url"]).hostname == site["hostname"], "canonical hostname mismatch"
        assert set(site["aggregate_source_ids"]) <= by_id.keys(), "unknown aggregate source"
        mapping = site["ga4"]
        assert mapping["property_id"] is None or mapping["property_id"] in properties, "unknown property"
        assert mapping["mapping_status"] in MAPPING_STATUSES, "source configuration is not live backend verification"
        if mapping["mapping_status"] == "unverified":
            assert mapping["property_id"] is None and mapping["measurement_id"] is None, "inferred GA4 mapping presented as known"
        if mapping["property_id"] or mapping["measurement_id"]:
            assert mapping["source_paths"], "GA4 mapping lacks evidence"
        if mapping["measurement_id"] in PROPERTY_BY_MEASUREMENT:
            assert mapping["property_id"] == PROPERTY_BY_MEASUREMENT[mapping["measurement_id"]], "wrong property for measurement ID"
    for source in sources:
        assert source["read_contract"] in {"legacy-approved", "read-only-aggregate"}, "unknown read contract"
        assert source["min_refresh_seconds"] >= 3600, "cache budget violated"
        refs = [s["hostname"] for s in rows if source["id"] in s["aggregate_source_ids"]]
        assert refs, "unreferenced source"
        if len(refs) > 1:
            grouping = source.get("grouping", {})
            assert grouping.get("field") == "site" and set(grouping.get("values_by_hostname", {})) == set(refs), "shared source lacks exact hostname grouping"
            assert len(set(grouping["values_by_hostname"].values())) == len(refs), "shared-source values duplicated across hosts"
    site_ids = {s["id"] for s in rows}
    alias_keys = [(a["hostname"], a.get("path_prefix", "/")) for a in manifest["aliases"]]
    assert len(set(alias_keys)) == len(alias_keys), "duplicate alias identity"
    for alias in manifest["aliases"]:
        assert alias["site_id"] in site_ids, "alias points to unknown site"
        assert alias["hostname"] not in hosts or alias.get("path_prefix"), "alias counted as a canonical hostname"
    assert set(LOCAL_ALIASES) <= {a["hostname"] for a in manifest["aliases"]}, "deployment alias missing"
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if checked-in inventory is stale")
    args = parser.parse_args()
    manifest = validate(build())
    rendered = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != rendered:
            raise SystemExit("manifest.json is stale; run build_manifest.py")
    else:
        OUTPUT.write_text(rendered)
    configured = sum(bool(s["aggregate_source_ids"]) for s in manifest["sites"])
    print(f"{len(manifest['sites'])} site identities; {configured} aggregate-configured; {len(manifest['sources'])} unique sources; {len(manifest['aliases'])} separate alias/preview records")


if __name__ == "__main__":
    main()
