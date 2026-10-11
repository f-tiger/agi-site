#!/usr/bin/env python3
"""Private, read-only fleet aggregates. No retries, redirects or business events."""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "FleetAnalyticsProbe/1.0 (read-only aggregate report; no business events)"
TTL = 3600
MAX_BYTES = 10 * 1024 * 1024
ALLOWED_HOSTS = frozenset({
    "agiscorecard.com", "baipiaoji.com", "getecoback.com", "thedollscout.com",
    *[f"{name}.agiscorecard.com" for name in (
        "goldrush", "play", "source", "games", "35", "learn", "fanzha", "firstjob",
        "codeword", "powerbill", "rfqdesk", "modelmeter", "querysprint", "filinglens",
        "verify", "web3", "calls", "compute", "disclosures", "evidence", "incentives",
        "permit", "proof", "protocol", "reconcile", "route", "localebatch")],
})
ALLOWED_PATHS = frozenset({"/api/pulse", "/api/reach", "/api/trend", "/api/growth", "/api/stats"})
SELECTED_HEADERS = frozenset({"date", "age", "cache-control", "cf-cache-status", "x-cache", "x-cache-status", "expires", "etag", "last-modified", "x-fleet-aggregate-version"})
GENERATION_FIELDS = ("generated", "generated_at", "generatedAt", "asOf", "as_of", "updated_at", "updatedAt")


def utc(timestamp=None):
    return dt.datetime.fromtimestamp(time.time() if timestamp is None else timestamp, dt.timezone.utc).isoformat().replace("+00:00", "Z")


def comparison_dates(timestamp):
    today = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).date()
    return {"timezone": "UTC", "today_partial": str(today), "yesterday": str(today - dt.timedelta(days=1)), "previous_day": str(today - dt.timedelta(days=2))}


def validate_url(url):
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.hostname not in ALLOWED_HOSTS
            or parsed.netloc != parsed.hostname or parsed.path not in ALLOWED_PATHS
            or parsed.fragment or parsed.username or parsed.password):
        raise ValueError("Only explicit fleet HTTPS aggregate URLs are allowed")
    if parsed.query and not (parsed.hostname == "baipiaoji.com" and parsed.path == "/api/reach" and parsed.query == "days=28"):
        raise ValueError("Unexpected aggregate query; authentication and cache-busting are forbidden")
    return url


def private_path(path):
    """Reject any output/cache in a Git worktree, including not-yet-created paths."""
    resolved = Path(path).expanduser().resolve()
    probe = resolved
    while not probe.exists():
        probe = probe.parent
    if not probe.is_dir():
        probe = probe.parent
    result = subprocess.run(["git", "-C", str(probe), "rev-parse", "--is-inside-work-tree"], capture_output=True, text=True, check=False)
    if result.returncode == 0 and result.stdout.strip() == "true":
        raise ValueError("Private report/cache must be outside every Git worktree")
    return resolved


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(path.suffix + f".{os.getpid()}.tmp")
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, path)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def status_for(body, http_status):
    if http_status is None or not 200 <= http_status < 300:
        return "failure"
    if isinstance(body, dict):
        if body.get("ok") is False or body.get("success") is False or body.get("available") is False or body.get("unavailable") is True or body.get("status") in ("error", "unavailable", "failure"):
            return "unavailable"
        if body.get("error"):
            return "failure"
    return "empty" if body is None or body == {} or body == [] else "success"


def fetch_once(url, opener=None, clock=time.time):
    validate_url(url)
    start = clock()
    record = {"url": url, "fetch_started_utc": utc(start), "attempt_timestamp": start,
              "fetch_finished_utc": None, "http_status": None, "status": "failure",
              "error": None, "headers": {}, "source_generated": {}, "body": None}
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"}, method="GET")
    opener = opener or urllib.request.build_opener(NoRedirect())
    response = None
    try:
        try:
            response = opener.open(request, timeout=30)
        except urllib.error.HTTPError as exc:
            response = exc
        with response:
            record["http_status"] = response.code
            record["headers"] = {k.lower(): v for k, v in response.headers.items() if k.lower() in SELECTED_HEADERS or "cache" in k.lower()}
            raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Aggregate response exceeds size limit")
        record["body"] = json.loads(raw)
        record["status"] = status_for(record["body"], record["http_status"])
        if isinstance(record["body"], dict):
            record["source_generated"] = {k: record["body"][k] for k in GENERATION_FIELDS if k in record["body"]}
        if record["status"] in {"failure", "unavailable"}:
            record["error"] = "HTTP or source-reported failure; see private body and HTTP status"
    except (OSError, ValueError, urllib.error.URLError) as exc:
        record["error"] = f"{type(exc).__name__}: {exc}"
        record["status"] = "failure"
    record["fetch_finished_utc"] = utc(clock())
    return record


def cached_fetch(url, cache_dir, opener=None, clock=time.time):
    validate_url(url)
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = hashlib.sha256(url.encode()).hexdigest()
    path = cache_dir / f"{key}.json"
    with (cache_dir / f"{key}.lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        now = clock()
        try:
            existing = json.loads(path.read_text())
            age = now - existing["attempt_timestamp"]
            if existing.get("url") == url and 0 <= age < TTL:
                existing["local_cache"] = {"reused": True, "age_seconds": round(age, 3), "ttl_seconds": TTL}
                return existing
        except (OSError, ValueError, KeyError, TypeError):
            pass
        # Persist even an interrupted attempt, so a crash cannot cause repeated reads.
        write_json(path, {"url": url, "attempt_timestamp": now, "fetch_started_utc": utc(now),
                          "fetch_finished_utc": None, "http_status": None, "status": "failure",
                          "error": "Prior fetch was interrupted before completion", "body": None,
                          "headers": {}, "source_generated": {}})
        record = fetch_once(url, opener=opener, clock=clock)
        record["local_cache"] = {"reused": False, "age_seconds": 0, "ttl_seconds": TTL}
        write_json(path, record)
        return record


def scoped_body(source, hostname, body):
    grouping = source.get("grouping")
    if not grouping:
        return copy.deepcopy(body), None
    if not isinstance(body, dict):
        return None, "Shared source did not return an object"
    field = grouping["field"]
    values = grouping.get("values_by_hostname", {}).get(hostname)
    if values is None:
        return None, "No verified grouping value for hostname"
    if not isinstance(values, list):
        values = [values]
    result = {k: copy.deepcopy(body[k]) for k in (*GENERATION_FIELDS, "timezone", "window", "windowDays", "measurement", "metrics", "qa", "status") if k in body}
    result["scope"] = {"hostname": hostname, "grouping_field": field, "values": values, "allSites": False}
    present = False
    matched = False
    for key in ("groups", "daily", "today"):
        if isinstance(body.get(key), list):
            present = True
            rows = [copy.deepcopy(row) for row in body[key] if isinstance(row, dict) and row.get(field) in values]
            matched = matched or bool(rows)
            result[key] = rows
    if not present:
        return None, "Shared response is missing grouped rows; totals cannot be allocated"
    if not matched:
        return result, "No rows for this hostname; missing is not zero"
    return result, None


def source_list(manifest):
    sources = manifest.get("sources", [])
    return [dict(value, id=key) for key, value in sources.items()] if isinstance(sources, dict) else sources


def collect(manifest, cache_dir, selected=None, opener=None, clock=time.time):
    started = clock()
    sources = source_list(manifest)
    source_ids = [source["id"] for source in sources]
    if len(source_ids) != len(set(source_ids)):
        raise ValueError("Duplicate manifest source IDs")
    for source in sources:
        validate_url(source["url"])
    for site in manifest.get("sites", []):
        ids = site.get("aggregate_source_ids", site.get("sources", site.get("source_ids", [])))
        if set(ids) - set(source_ids):
            raise ValueError("Site references unknown aggregate source IDs")
    if selected is not None:
        unknown = selected - {source["id"] for source in sources}
        if unknown:
            raise ValueError("Unknown source IDs: " + ", ".join(sorted(unknown)))
    records, fetched = {}, {}
    for source in sources:
        if selected is not None and source["id"] not in selected:
            continue
        url = validate_url(source["url"])
        if url not in fetched:
            fetched[url] = cached_fetch(url, cache_dir, opener=opener, clock=clock)
        records[source["id"]] = copy.deepcopy(fetched[url])
    coverage = []
    for site in manifest.get("sites", []):
        hostname = site["hostname"]
        ids = site.get("aggregate_source_ids", site.get("sources", site.get("source_ids", [])))
        entries = []
        for source_id in ids:
            source = next((item for item in sources if item["id"] == source_id), None)
            record = records.get(source_id)
            if not record:
                entries.append({"source_id": source_id, "status": "not_requested", "data": None})
                continue
            status = record["status"]
            body, reason = scoped_body(source, hostname, record["body"]) if status in {"success", "empty"} else (None, record["error"])
            if reason and status in {"success", "empty"}:
                status = "unknown"
            entries.append({"source_id": source_id, "status": status, "reason": reason, "data": body})
        statuses = {entry["status"] for entry in entries}
        status = "uncovered" if not entries else ("success" if statuses == {"success"} else "partial" if "success" in statuses else next(iter(statuses)) if len(statuses) == 1 else "unknown")
        coverage.append({"hostname": hostname, "id": site.get("id"), "status": status, "sources": entries})
    snapshot = {"read_started_utc": utc(started), "read_finished_utc": utc(clock()), "comparison_dates": comparison_dates(started),
                "source_count": len(records), "unique_url_count": len(fetched), "sources": records}
    return snapshot, {"read_started_utc": utc(started), "sites": coverage,
                      "source_statuses": {key: value["status"] for key, value in records.items()}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=Path(__file__).with_name("manifest.json"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--cache-dir", type=Path, default=Path("/tmp/fleet-reporting-cache"))
    parser.add_argument("--sources", help="Comma-separated manifest source IDs; default all sources")
    args = parser.parse_args()
    try:
        output, cache_dir = private_path(args.output), private_path(args.cache_dir)
        manifest = json.loads(args.manifest.read_text())
        selected = {part.strip() for part in args.sources.split(",") if part.strip()} if args.sources else None
        snapshot, coverage = collect(manifest, cache_dir, selected=selected)
        write_json(output / "snapshot.json", snapshot)
        write_json(output / "coverage.json", coverage)
    except (OSError, ValueError, KeyError) as exc:
        parser.error(str(exc))
    counts = {status: sum(site["status"] == status for site in coverage["sites"]) for status in sorted({site["status"] for site in coverage["sites"]})}
    print(json.dumps({"source_count": snapshot["source_count"], "unique_url_count": snapshot["unique_url_count"], "coverage_counts": counts, "source_statuses": coverage["source_statuses"]}, sort_keys=True))


if __name__ == "__main__":
    main()
