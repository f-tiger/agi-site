#!/usr/bin/env python3
"""Deterministic fleet opportunity, membership and data-quality loop.

The script is intentionally conservative. It may refresh measured manifests and
queues, but it never writes editorial prose, changes prices, grants membership,
or treats missing data as zero. A human or an AI session can use the queue for
judgement-heavy work; GitHub Actions can keep the measured layer alive alone.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
EVOLUTION = DATA / "fleet-evolution"

SITE_DIRS = {
    "agiscorecard": "sites/agiscorecard",
    "baipiaoji": "sites/baipiaoji",
    "getecoback": "sites/getecoback",
    "thedollscout": "sites/thedollscout",
    "buysomething": "sites/buysomething",
    "goldrush": "sites/goldrush",
    "gridlings": "sites/gridlings",
    "gamesledger": "sites/gamesledger",
    "after35": "sites/after35",
    "learn": "sites/learn",
    "fanzha": "sites/fanzha",
    "firstjob": "sites/firstjob",
    "codeword": "sites/codeword",
    "powerbill": "sites/powerbill",
}
MEMBER_SITE = {
    "agiscorecard": "agi",
    "baipiaoji": "bpj",
    "getecoback": "eco",
    "thedollscout": "tds",
}


def read_json(path: Path, default: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return default


def integer(value: Any, default: int | None = 0) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def date_value(value: Any) -> dt.date | None:
    if not isinstance(value, str):
        return None
    value = value[:10]
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def age_days(value: Any, today: dt.date) -> int | None:
    parsed = date_value(value)
    return None if parsed is None else max(0, (today - parsed).days)


def load_demand(site: str) -> dict[str, Any]:
    raw = read_json(DATA / "autopilot" / f"{site}-demand.json", {}) or {}
    underserved = raw.get("underserved") if isinstance(raw.get("underserved"), list) else []
    gaps = raw.get("gaps") if isinstance(raw.get("gaps"), list) else []
    hot = raw.get("hot_pages") if isinstance(raw.get("hot_pages"), list) else []
    first_party = raw.get("first_party_demand") if isinstance(raw.get("first_party_demand"), dict) else {}
    return {
        "generated": raw.get("generated"),
        "underserved": underserved,
        "gaps": gaps,
        "hot_pages": hot,
        "first_party_demand": first_party,
        "heat_source": raw.get("heat_source"),
    }


def load_traffic(site: str, site_dir: str, ai_rows: dict[str, dict[str, Any]]) -> dict[str, Any]:
    ai = ai_rows.get(site, {})
    result = {
        "human_pv": integer(ai.get("human_pv"), None),
        "ai_ref": integer(ai.get("ai_ref"), None),
        "reach_humans_referred": None,
    }
    reach = read_json(ROOT / site_dir / "data/reach.json", {}) or {}
    if isinstance(reach, dict) and isinstance(reach.get("humans_referred"), (int, float)):
        result["reach_humans_referred"] = integer(reach["humans_referred"], None)
    return result


def safe_action(kind: str, priority: int, reason: str, evidence: dict[str, Any], mode: str) -> dict[str, Any]:
    return {
        "kind": kind,
        "priority": max(0, min(100, int(priority))),
        "reason": reason,
        "evidence": evidence,
        "mode": mode,
    }


def band(value: Any) -> str | None:
    """Bucket volatile counters so site manifests do not redeploy every day."""
    if value is None:
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if n <= 0:
        return "0"
    if n < 10:
        return "1-9"
    if n < 100:
        return "10-99"
    return "100+"


def positive_flag(value: Any) -> bool | None:
    n = integer(value, None)
    return None if n is None else n > 0


def compact_action(action: dict[str, Any]) -> dict[str, Any]:
    """Keep stable evidence in site files; exact numbers remain in latest.json."""
    compact: dict[str, Any] = {}
    for key, value in (action.get("evidence") or {}).items():
        if key in {"page", "query", "http", "site"}:
            compact[key] = value
        elif key in {"count", "value", "n7", "p7", "human_pv_28d", "ai_ref_28d", "referred_humans_28d", "paid_members", "active_members"}:
            compact[f"{key}_band"] = band(value)
    return {"kind": action.get("kind"), "priority": action.get("priority"), "reason": action.get("reason"), "evidence": compact, "mode": action.get("mode")}


def membership_by_site(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows = snapshot.get("sites") if isinstance(snapshot, dict) else []
    out: dict[str, dict[str, Any]] = {}
    for row in rows if isinstance(rows, list) else []:
        if isinstance(row, dict) and isinstance(row.get("site"), str):
            out[row["site"]] = row
    return out


def build(today: dt.date) -> tuple[dict[str, Any], dict[str, str]]:
    membership = read_json(EVOLUTION / "membership.json", {}) or {}
    membership_rows = membership_by_site(membership)
    health = read_json(DATA / "fleet-health.json", {}) or {}
    health_rows = {
        row.get("site"): row for row in health.get("sites", [])
        if isinstance(row, dict) and isinstance(row.get("site"), str)
    }
    ai = read_json(DATA / "fleet-ai-referrals.json", {}) or {}
    ai_rows = {
        row.get("site"): row for row in ai.get("sites", [])
        if isinstance(row, dict) and isinstance(row.get("site"), str)
    }
    opportunities = read_json(DATA / "autopilot/opportunities.json", {}) or {}
    opportunity_rows = opportunities.get("opportunities") if isinstance(opportunities.get("opportunities"), list) else []
    receipt = read_json(DATA / "autopilot/receipt.json", {}) or {}
    receipt_rows = {
        row.get("site"): row for row in receipt.get("runs", [])
        if isinstance(row, dict) and isinstance(row.get("site"), str)
    }

    input_dates = {
        "membership": membership.get("generated"),
        "health": health.get("generated"),
        "ai_referrals": ai.get("generated"),
        "opportunities": opportunities.get("generated"),
        "autopilot_receipt": receipt.get("today"),
    }
    input_ages = {name: age_days(value, today) for name, value in input_dates.items()}
    stale = [name for name, age in input_ages.items() if age is None or age > (2 if name != "opportunities" else 3)]

    top_opportunities = []
    for row in opportunity_rows:
        if not isinstance(row, dict):
            continue
        top_opportunities.append({
            "theme": row.get("theme"),
            "site": row.get("site") or None,
            "state": row.get("state"),
            "score": row.get("score"),
            "days_seen": len(row.get("days_seen", [])) if isinstance(row.get("days_seen"), list) else None,
            "demand": len(row.get("demand", [])) if isinstance(row.get("demand"), list) else None,
            "supply": len(row.get("supply", [])) if isinstance(row.get("supply"), list) else None,
        })
    top_opportunities.sort(key=lambda row: (float(row.get("score") or 0), integer(row.get("days_seen"))), reverse=True)

    manifests: dict[str, dict[str, Any]] = {}
    actions: list[dict[str, Any]] = []
    for site, site_dir in SITE_DIRS.items():
        demand = load_demand(site)
        traffic = load_traffic(site, site_dir, ai_rows)
        member = membership_rows.get(MEMBER_SITE.get(site, ""), {})
        health_row = health_rows.get(site, {})
        receipt_row = receipt_rows.get(site, {})
        site_actions: list[dict[str, Any]] = []

        if health_row and str(health_row.get("http")) != "200":
            site_actions.append(safe_action("site_health", 100, "live probe is not HTTP 200", {"http": health_row.get("http")}, "alert"))
        if receipt_row.get("outcome") == "failed":
            site_actions.append(safe_action("autopilot_repair", 95, "daily autopilot reported a failed site run", {"receipt": receipt_row.get("notes", [])}, "alert"))

        if site in MEMBER_SITE:
            public = member.get("public", {}) if isinstance(member, dict) else {}
            admin = member.get("admin", {}) if isinstance(member, dict) else {}
            if not public.get("ok") or not public.get("ready"):
                site_actions.append(safe_action("membership_health", 92, "membership API is not ready", {"public_ok": public.get("ok"), "ready": public.get("ready")}, "alert"))
            elif not admin.get("ok"):
                site_actions.append(safe_action("membership_observability", 68, "membership aggregate counters are unavailable", {"admin_ok": admin.get("ok")}, "observe"))
            else:
                paid = integer(admin.get("paid_members"))
                active = integer(admin.get("active_members"))
                pv = traffic.get("reach_humans_referred")
                if paid == 0 and isinstance(pv, int) and pv >= 100:
                    site_actions.append(safe_action("membership_conversion", 64, "ready membership has qualified referred traffic but no paid members", {"referred_humans_28d": pv, "paid_members": paid}, "queue"))
                if active > 0:
                    site_actions.append(safe_action("membership_retention", 58, "active members exist; review renewal and workspace usage", {"active_members": active, "paid_members": paid}, "queue"))

        underserved = demand["underserved"]
        gaps = demand["gaps"]
        hot_pages = demand["hot_pages"]
        if underserved:
            first = underserved[0] if isinstance(underserved[0], dict) else {}
            site_actions.append(safe_action("optimize_existing_page", 80, "measured demand reaches an existing page with zero recent referred readers", {"count": len(underserved), "query": first.get("q"), "page": first.get("page"), "value": first.get("v")}, "queue"))
        if gaps:
            first = gaps[0] if isinstance(gaps[0], dict) else {}
            site_actions.append(safe_action("content_gap", 55, "rising demand has no matching page; editorial judgement is required", {"count": len(gaps), "query": first.get("q"), "value": first.get("v")}, "queue"))
        if hot_pages:
            first = hot_pages[0] if isinstance(hot_pages[0], dict) else {}
            site_actions.append(safe_action("improve_hot_page", 52, "prioritize a page with measured reader heat", {"page": first.get("page"), "n7": first.get("n7"), "p7": first.get("p7")}, "queue"))

        human_pv = traffic.get("human_pv")
        ai_ref = traffic.get("ai_ref")
        if isinstance(human_pv, int) and human_pv >= 100 and ai_ref == 0:
            site_actions.append(safe_action("ai_discovery", 48, "referred traffic exists but no AI-assistant referral is measured", {"human_pv_28d": human_pv, "ai_ref_28d": ai_ref}, "queue"))
        if site in ai_rows and ai_ref is None:
            site_actions.append(safe_action("data_quality", 45, "AI referral snapshot has no numeric value for this site", {"site": site}, "observe"))

        # Only the measured layer is autonomous. These are explicit, reviewable
        # guarantees rather than claims that the script wrote editorial copy.
        autonomous = ["refresh aggregate snapshots", "refresh opportunity and demand queues", "update truthful sitemap lastmod when content hashes change", "submit IndexNow only for changed URLs"]
        site_actions.sort(key=lambda item: (-item["priority"], item["kind"]))
        site_actions = site_actions[:8]
        for item in site_actions:
            actions.append({"site": site, **item})

        manifests[site] = {
            "schema_version": 1,
            "site": site,
            "signals": {
                "membership": {"ready": (member.get("public", {}) or {}).get("ready") if isinstance(member, dict) else None, "has_paid_members": positive_flag((member.get("admin", {}) or {}).get("paid_members")) if isinstance(member, dict) else None, "has_active_members": positive_flag((member.get("admin", {}) or {}).get("active_members")) if isinstance(member, dict) else None},
                "traffic": {"human_pv_band": band(traffic.get("human_pv")), "ai_ref_band": band(traffic.get("ai_ref")), "reach_humans_referred_band": band(traffic.get("reach_humans_referred"))},
                "demand": {"has_underserved": bool(underserved), "has_gaps": bool(gaps), "has_hot_pages": bool(hot_pages), "top_underserved_page": (underserved[0] or {}).get("page") if underserved and isinstance(underserved[0], dict) else None, "top_hot_page": (hot_pages[0] or {}).get("page") if hot_pages and isinstance(hot_pages[0], dict) else None},
                "health": {"http": health_row.get("http"), "stale_deploy": integer(health_row.get("days_since_deploy"), -1) < 0 or integer(health_row.get("days_since_deploy"), -1) >= 7},
            },
            "actions": [compact_action(item) for item in site_actions],
            "autonomous_changes": autonomous,
        }

    actions.sort(key=lambda item: (-item["priority"], item["site"], item["kind"]))
    fleet = {
        "sites": len(SITE_DIRS),
        "healthy": sum(1 for row in health_rows.values() if str(row.get("http")) == "200"),
        "membership_ready": sum(1 for row in membership_rows.values() if (row.get("public", {}) or {}).get("ready")),
        "paid_members": sum(integer((row.get("admin", {}) or {}).get("paid_members")) for row in membership_rows.values()),
        "active_members": sum(integer((row.get("admin", {}) or {}).get("active_members")) for row in membership_rows.values()),
        "opportunities": len(opportunity_rows),
        "stale_inputs": len(stale),
    }
    latest = {
        "schema_version": 1,
        "as_of": today.isoformat(),
        "privacy": "aggregate counts and derived queues only; no customer or raw community content",
        "fleet": fleet,
        "input_dates": input_dates,
        "input_ages_days": input_ages,
        "stale_inputs": stale,
        "membership": membership,
        "opportunities": top_opportunities[:20],
        "actions": actions[:50],
        "site_manifests": {site: {"path": f"{site_dir}/data/fleet-evolution.json", "action_count": len(manifests[site]["actions"])} for site, site_dir in SITE_DIRS.items()},
        "rules": {
            "no_editorial_autowrite": True,
            "no_payment_or_membership_mutation": True,
            "missing_is_unknown": True,
            "site_deploys_only_when_manifest_or_site_content_changes": True,
        },
    }
    markdown = render_markdown(latest)
    site_text = {site: f"{json.dumps(manifests[site], ensure_ascii=False, indent=2)}\n" for site in manifests}
    return {"latest": latest, "markdown": markdown, "manifests": manifests}, site_text


def render_markdown(latest: dict[str, Any]) -> str:
    fleet = latest["fleet"]
    lines = [f"# Fleet evolution report — {latest['as_of']}", "", "Deterministic, aggregate-only report. Missing data remains unknown; no editorial text, payments or membership rights are changed by this job.", "", "## Fleet counters", "", f"- Sites: {fleet['sites']} (healthy probes: {fleet['healthy']})", f"- Membership ready: {fleet['membership_ready']} · paid members: {fleet['paid_members']} · active members: {fleet['active_members']}", f"- Opportunity candidates: {fleet['opportunities']} · stale inputs: {fleet['stale_inputs']}", "", "## Priority actions", "", "| Priority | Site | Action | Mode | Evidence |", "|---:|---|---|---|---|"]
    for row in latest["actions"][:20]:
        evidence = "; ".join(f"{k}={v}" for k, v in row.get("evidence", {}).items() if v is not None)
        lines.append(f"| {row['priority']} | {row['site']} | {row['kind']} | {row['mode']} | {evidence or 'unknown'} |")
    if not latest["actions"]:
        lines.append("| — | — | no measured action | observe | no evidence above thresholds |")
    lines += ["", "## Input freshness", "", "| Input | Date | Age (days) |", "|---|---|---:|"]
    for name, value in latest["input_dates"].items():
        lines.append(f"| {name} | {value or 'unknown'} | {latest['input_ages_days'].get(name) if latest['input_ages_days'].get(name) is not None else 'unknown'} |")
    lines += ["", "## Autonomous boundary", "", "- Refresh measured snapshots and derived queues.", "- Keep sitemap lastmod tied to content hashes and ping only changed URLs.", "- Queue copy, pricing, new products and membership experiments for judgement; do not fabricate evidence.", ""]
    return "\n".join(lines)


def write_if_changed(path: Path, content: str) -> bool:
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--today", default=dt.date.today().isoformat())
    parser.add_argument("--check", action="store_true", help="compute and print without writing")
    args = parser.parse_args()
    today = dt.date.fromisoformat(args.today)
    built, site_text = build(today)
    print(built["markdown"])
    if args.check:
        return 0
    EVOLUTION.mkdir(parents=True, exist_ok=True)
    write_if_changed(EVOLUTION / "latest.json", f"{json.dumps(built['latest'], ensure_ascii=False, indent=2)}\n")
    write_if_changed(EVOLUTION / "latest.md", built["markdown"])
    history_path = EVOLUTION / "history.json"
    history = read_json(history_path, [])
    if not isinstance(history, list):
        history = []
    history = [row for row in history if isinstance(row, dict) and row.get("as_of") != built["latest"]["as_of"]]
    history.append({"as_of": built["latest"]["as_of"], "fleet": built["latest"]["fleet"], "actions": built["latest"]["actions"][:20]})
    write_if_changed(history_path, f"{json.dumps(history[-30:], ensure_ascii=False, indent=2)}\n")
    for site, manifest in built["manifests"].items():
        site_path = ROOT / SITE_DIRS[site] / "data/fleet-evolution.json"
        write_if_changed(site_path, site_text[site])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
