#!/usr/bin/env python3
"""Reviewed pain points -> bounded existing-site work, never raw community data.
A queue entry is permission to investigate, not customer/payment validation.
"""
from __future__ import annotations
import datetime as dt
import json
import re
from pathlib import Path

ID = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9-]{0,79}\Z")
STATES = {"queued", "working", "done", "blocked", "rejected"}

def date(value):
    if not isinstance(value, str):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None

def fresh(value, today, limit):
    observed = date(value)
    return observed is not None and 0 <= (today - observed).days <= limit

def load(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}

def text(value, limit=600):
    return value[:limit] if isinstance(value, str) else ""

def strings(value, limit=6):
    return [text(v) for v in value[:limit] if isinstance(v, str) and v.strip()] if isinstance(value, list) else []

def evaluate(data, today, sites):
    """Pure, allowlisted projection; future/unknown/stale evidence cannot authorize build."""
    if not isinstance(data, dict) or data.get("schema_version") != 1:
        return []
    items = data.get("items")
    if not isinstance(items, list):
        return []
    # Duplicate task identities fail closed, rather than arbitrarily selecting one.
    ids = [r.get("id") for r in items if isinstance(r, dict) and isinstance(r.get("id"), str)]
    # A malformed working record must not silently release the same-site lock.
    working_sites = {r["site"] for r in items if isinstance(r, dict)
                     and r.get("status") == "working" and isinstance(r.get("site"), str)
                     and r["site"] in sites}
    rows = []
    for r in items:
        if not isinstance(r, dict):
            continue
        identity, site = r.get("id"), r.get("site")
        if not isinstance(identity, str) or not ID.fullmatch(identity) or ids.count(identity) != 1 or not isinstance(site, str) or site not in sites:
            continue
        status = r.get("status")
        if not isinstance(status, str) or status not in STATES:
            continue
        paths = strings(r.get("scope"))
        prefix = f"sites/{site}/"
        if not paths or any(not p.startswith(prefix) or ".." in p.split("/") or "\\" in p for p in paths):
            continue
        acceptance = strings(r.get("acceptance"))
        if not acceptance or not text(r.get("task")):
            continue
        sources = r.get("sources") if isinstance(r.get("sources"), list) else []
        seen, verified, current = set(), set(), set()
        duplicate_source = False
        for s in sources:
            if not isinstance(s, dict) or not isinstance(s.get("id"), str) or not ID.fullmatch(s["id"]):
                continue
            sid = s["id"]
            if sid in seen:
                duplicate_source = True
            seen.add(sid)
            if fresh(s.get("reviewed_at"), today, 14):
                current.add(sid)
                if s.get("original_verified") is True and fresh(s.get("published_at"), today, 180):
                    verified.add(sid)
        # Bounds are code-owned; editing a JSON threshold cannot bypass them.
        decision = "hold" if status != "queued" else "verify"
        reasons = []
        if status != "queued":
            reasons.append("status is " + status)
        elif not current:
            reasons.append("missing, future or stale source review")
        elif duplicate_source:
            reasons.append("duplicate source identity; reconcile evidence")
        elif len(verified) < 2:
            reasons.append("fewer than two distinct current original sources")
        elif r.get("site_fit_verified") is not True:
            reasons.append("site/customer fit remains unverified")
        else:
            decision = "extend"
        if status == "queued" and site in working_sites:
            decision = "hold"
            reasons.append("existing working record owns this site; reconcile it first")
        priority = r.get("priority")
        priority = max(0, min(85, priority)) if type(priority) is int else 50
        rows.append({
            "id": identity, "site": site, "status": status, "decision": decision,
            "title": text(r.get("title"), 160), "pain": text(r.get("pain")),
            "task": text(r.get("task")), "scope": paths, "acceptance": acceptance,
            "priority": priority, "verified_sources": len(verified),
            "source_refs": sorted(seen), "gate_reasons": reasons,
            "next_review": r.get("next_review") if date(r.get("next_review")) else None,
            "commercial_hypothesis": text(r.get("commercial_hypothesis")),
            "counter_evidence": text(r.get("counter_evidence")),
        })
    return sorted(rows, key=lambda r: (-r["priority"], r["id"]))

def actions(rows):
    result, selected = [], set()
    busy = {r["site"] for r in rows if r["status"] == "working"}
    for r in sorted(rows, key=lambda r: (-r["priority"], r["id"])):
        if r["decision"] == "hold" or r["site"] in selected or r["site"] in busy:
            continue
        selected.add(r["site"])
        result.append({
            "site": r["site"], "kind": "pain_point_extension" if r["decision"] == "extend" else "pain_point_verification",
            "priority": r["priority"], "reason": r["task"], "mode": "queue",
            "evidence": {"pain_id": r["id"], "scope": r["scope"], "acceptance": r["acceptance"],
                         "source_refs": r["source_refs"], "gate_reasons": r["gate_reasons"],
                         "verified_sources": r["verified_sources"]},
        })
    return result

def markdown(rows):
    out = ["## 用户痛点雷达 → Jarvis 站点扩展", "",
           "研究复核记录；不是实时 Reddit 抓取，也不是独立客户或付费验证。原始社区材料保留在私有工作记录。",
           "每站最多一个待执行项；核验不足只派复核，已完成/进行中/阻塞/否决的任务不重复派发。", ""]
    for r in rows:
        out += [f"- **{r['site']} · {r['title']}** [{r['decision']}]",
                f"  - ID: {r['id']}；原帖与日期门通过来源数: {r['verified_sources']}；复盘: {r['next_review'] or 'unknown'}",
                f"  - 下一步: {r['task']}",
                f"  - 门槛/反证: {'; '.join(r['gate_reasons']) or '来源与适配门通过，仍需工程验收'}；{r['counter_evidence']}"]
    if not rows:
        out.append("- 无可读取的已复核痛点；缺失不记为需求为零。")
    return "\n".join(out) + "\n"
