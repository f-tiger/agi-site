"""Bounded publisher-feed monitoring. Counts describe observed articles, never deals.

No paid APIs, third-party model calls, browser scraping, or public data artifacts.
"""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import math
import os
import random
import re
import statistics
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

UTC = dt.timezone.utc
MINIMUM_DAYS = 56
PROMOTION_THRESHOLD = 0.95
ORIGIN = "https://agiscorecard.com"
ENDPOINT = ORIGIN + "/api/capital-radar/runner"
SOURCES = (
    {"id": "techcrunch", "name": "TechCrunch", "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "host": "techcrunch.com"},
    {"id": "crunchbase", "name": "Crunchbase News", "url": "https://news.crunchbase.com/feed/", "host": "news.crunchbase.com"},
    {"id": "venturebeat", "name": "VentureBeat", "url": "https://venturebeat.com/feed", "host": "venturebeat.com"},
)
AI = re.compile(r"\b(ai|artificial intelligence|machine learning|large language model|llm|generative|robotics|autonomous agent)\b", re.I)
FUNDING = re.compile(r"\b(raises?|raised|funding|financing|seed round|series [a-h]|venture capital|investment round)\b", re.I)
STARTUP = re.compile(r"\b(startup|start-up|launches?|launched|stealth|founded|founder)\b", re.I)
BAY = re.compile(r"\b(san francisco|silicon valley|bay area|palo alto|menlo park|mountain view|sunnyvale|san jose|redwood city|san mateo|santa clara|cupertino|berkeley|oakland)\b", re.I)
MAX_BYTES = 3_000_000


class SafeError(Exception):
    """Only fixed, non-secret diagnostics may reach public runner logs."""


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def text(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def canonical(url, host):
    if not isinstance(url, str) or len(url) > 2000:
        return None
    try:
        parsed = urllib.parse.urlsplit(url)
        invalid = parsed.scheme != "https" or parsed.hostname not in {host, "www." + host} or parsed.username or parsed.password or parsed.port
    except ValueError:
        return None
    if invalid:
        return None
    return urllib.parse.urlunsplit(("https", host, parsed.path.rstrip("/") + "/", "", ""))


def parse_date(value, now):
    try:
        parsed = email.utils.parsedate_to_datetime(value)
    except (ValueError, TypeError):
        try:
            parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    if parsed.tzinfo is None:
        return None
    parsed = parsed.astimezone(UTC)
    # Feed future timestamps and old archive entries never become fresh evidence.
    if parsed > now + dt.timedelta(minutes=5) or parsed < now - dt.timedelta(days=45):
        return None
    return iso(parsed)


def sector_for(value):
    for name, pattern in (("robotics", r"robot|humanoid"), ("infrastructure", r"chip|gpu|data cent|compute|infrastructure"), ("agents", r"agent|agentic"), ("models", r"foundation|language model|\bllm\b")):
        if re.search(pattern, value, re.I):
            return name
    return "applications"


def parse_feed(body, source, now):
    # stdlib parser doesn't expand external entities; reject DTD/entity payloads too.
    if len(body) > MAX_BYTES or b"<!DOCTYPE" in body.upper() or b"<!ENTITY" in body.upper():
        raise SafeError("feed_invalid")
    try:
        root = ET.fromstring(body)
    except ET.ParseError:
        raise SafeError("feed_invalid") from None
    if root.tag.rsplit("}", 1)[-1] not in {"rss", "feed", "RDF"}:
        raise SafeError("feed_invalid")
    records = []
    for entry in [x for x in root.iter() if x.tag.rsplit("}", 1)[-1] in {"item", "entry"}][:200]:
        fields = {}
        for node in entry:
            key = node.tag.rsplit("}", 1)[-1]
            if key == "link" and node.get("href"):
                if node.get("rel", "alternate") == "alternate":
                    fields[key] = node.get("href")
            elif node.text:
                fields[key] = node.text
        title = text(fields.get("title"))[:300]
        summary = text(fields.get("description") or fields.get("summary") or fields.get("encoded") or fields.get("content"))[:2000]
        combined = title + " " + summary
        if not title or not AI.search(combined) or not (FUNDING.search(combined) or STARTUP.search(combined)):
            continue
        url = canonical(fields.get("link", ""), source["host"])
        published = parse_date(fields.get("pubDate") or fields.get("published") or fields.get("updated") or fields.get("date") or "", now)
        if not url or not published:
            continue
        records.append({"id": hashlib.sha256(url.encode()).hexdigest()[:24], "title": title, "url": url,
                        "source": source["name"], "publishedAt": published, "discoveredAt": iso(now),
                        "kind": "funding" if FUNDING.search(combined) else "startup", "sector": sector_for(combined),
                        "geography": "sf-bay-area" if BAY.search(combined) else "unconfirmed",
                        "evidence": "rss-rule-match", "summary": summary[:360]})
    return records


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Credentials and feed allowlists never follow an unverified destination.
        return None


def request(url, *, method="GET", data=None, token=None):
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode() if data is not None else None
    headers = {"User-Agent": "AGICapitalRadar/1.0 (+https://agiscorecard.com/capital-radar)", "Accept": "application/json, application/rss+xml, application/atom+xml, text/xml"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = "Bearer " + token
    try:
        with urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, data=payload, headers=headers, method=method), timeout=25) as response:
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise SafeError("response_too_large")
            return body
    except urllib.error.HTTPError as error:
        raise SafeError("http_" + str(error.code)) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise SafeError("network_error") from None


def mean_prediction(values):
    return statistics.fmean(values[-7:])


class TinyMLP:
    """7 lag inputs -> 6 tanh neurons -> log1p count; deterministic SGD."""
    def __init__(self, values):
        transformed = [math.log1p(x) for x in values]
        self.mean = statistics.fmean(transformed)
        self.scale = max(statistics.pstdev(transformed), 0.25)
        normalized = [(x - self.mean) / self.scale for x in transformed]
        rng = random.Random(4317)
        self.weights = [[rng.uniform(-0.15, 0.15) for _ in range(7)] for _ in range(6)]
        self.biases = [0.0] * 6
        self.output = [rng.uniform(-0.15, 0.15) for _ in range(6)]
        self.bias = 0.0
        samples = [(normalized[i-7:i], normalized[i]) for i in range(7, len(normalized))]
        for epoch in range(100):
            learning = 0.015 / (1 + epoch / 50)
            for inputs, target in samples:
                hidden = [math.tanh(sum(a*b for a, b in zip(row, inputs)) + bias) for row, bias in zip(self.weights, self.biases)]
                predicted = sum(a*b for a, b in zip(hidden, self.output)) + self.bias
                error = max(-3.0, min(3.0, predicted - target))
                old_output = self.output[:]
                for h in range(6):
                    self.output[h] -= learning * (error * hidden[h] + 0.001*self.output[h])
                    gradient = error * old_output[h] * (1 - hidden[h]**2)
                    for j in range(7):
                        self.weights[h][j] -= learning * (gradient * inputs[j] + 0.001*self.weights[h][j])
                    self.biases[h] -= learning * gradient
                self.bias -= learning * error

    def predict(self, values):
        inputs = [(math.log1p(x) - self.mean) / self.scale for x in values[-7:]]
        hidden = [math.tanh(sum(a*b for a, b in zip(row, inputs)) + bias) for row, bias in zip(self.weights, self.biases)]
        predicted = sum(a*b for a, b in zip(hidden, self.output)) + self.bias
        return max(0.0, min(math.expm1(min(15.0, predicted*self.scale + self.mean)), max(values)*3 + 1))


def forecasts(history, today=None):
    # Any coverage gap breaks continuity; missing days are never silently zero-filled.
    today = today or dt.datetime.now(UTC).date()
    contiguous = []
    previous = None
    for point in history:
        date = dt.date.fromisoformat(point["date"])
        if previous is not None and (date - previous).days != 1:
            contiguous = []
        if not point["complete"]:
            if date != today:
                contiguous = []
        else:
            contiguous.append(point)
        previous = date
    result = {"status": "insufficient_history", "minimumDays": MINIMUM_DAYS, "observedDays": len(contiguous),
              "target": "daily qualified article mentions", "horizonDays": 7, "points": []}
    model = {"status": "waiting_for_history", "promotionThreshold": PROMOTION_THRESHOLD}
    if len(contiguous) < MINIMUM_DAYS:
        return result, model
    values = [x["count"] for x in contiguous][-180:]
    if sum(values) < 20 or len(set(values)) < 3:
        result["status"] = "insufficient_variation"
        return result, model
    baseline_errors, candidate_errors = [], []
    # Every fold fits scaling and weights only on the prefix. No random time split.
    for cut in range(len(values) - 14, len(values)):
        train, target = values[:cut], values[cut]
        baseline_errors.append(abs(mean_prediction(train) - target))
        candidate_errors.append(abs(TinyMLP(train).predict(train) - target))
    baseline_mae, candidate_mae = statistics.fmean(baseline_errors), statistics.fmean(candidate_errors)
    promoted = candidate_mae < baseline_mae * PROMOTION_THRESHOLD
    chosen = TinyMLP(values) if promoted else None
    residuals = candidate_errors if promoted else baseline_errors
    radius = sorted(residuals)[math.ceil(len(residuals)*0.9)-1]
    future = values[:]
    points = []
    last_date = dt.date.fromisoformat(contiguous[-1]["date"])
    for step in range(1, 8):
        value = chosen.predict(future) if chosen else mean_prediction(future)
        band = radius * math.sqrt(step)
        points.append({"date": (last_date + dt.timedelta(days=step)).isoformat(), "estimate": round(value, 2),
                       "low": round(max(0, value-band), 2), "high": round(value+band, 2)})
        future.append(value)
    version = hashlib.sha256(json.dumps(contiguous, sort_keys=True).encode()).hexdigest()[:12]
    result.update(status="ready", method="lag7-mlp-v1" if promoted else "trailing-7-day-mean", points=points,
                  intervalNote="Historical 90th-percentile one-step absolute errors, widened by sqrt(horizon); illustrative range, not calibrated confidence or deal-volume prediction.")
    model.update(status="candidate_promoted" if promoted else "baseline_retained", version=version, trainingEnd=contiguous[-1]["date"],
                 baselineMAE=round(baseline_mae, 4), candidateMAE=round(candidate_mae, 4), validationPoints=14,
                 architecture="7 lag inputs / 6 tanh neurons / 1 log-count output", trainingSamples=len(values)-7)
    return result, model


def collect(previous, now, fetch=request):
    previous = previous or {}
    known = {x["id"]: x for x in previous.get("items", [])}
    seen = dict(previous.get("internal", {}).get("seen", {key: item["discoveredAt"][:10] for key, item in known.items()}))
    new_ids, sources = [], []
    coverage = previous.get("internal", {}).get("coverage", {})
    today = now.date().isoformat()
    covered = set(coverage.get(today, []))
    for source in SOURCES:
        status = {k: source[k] for k in ("id", "name", "url")}
        status.update(ok=False, fetchedAt=iso(now), matched=0, error=None)
        try:
            records = parse_feed(fetch(source["url"]), source, now)
            status.update(ok=True, matched=len(records))
            covered.add(source["id"])
            for item in records:
                if item["id"] not in seen:
                    known[item["id"]] = item
                    seen[item["id"]] = today
                    new_ids.append(item["id"])
        except SafeError as error:
            status["error"] = str(error)
        sources.append(status)
    coverage[today] = sorted(covered)
    # 180 days of observed coverage; retention limits do not rewrite older daily counts.
    cutoff = (now.date() - dt.timedelta(days=180)).isoformat()
    coverage = {key: value for key, value in coverage.items() if key >= cutoff}
    counts = {x["date"]: x["count"] for x in previous.get("history", [])}
    counts[today] = counts.get(today, 0) + len(new_ids)
    first = min(coverage)
    date = dt.date.fromisoformat(first)
    history = []
    while date <= now.date():
        key = date.isoformat()
        warmup = previous.get("internal", {}).get("firstSeenAt", iso(now))[:10]
        history.append({"date": key, "count": counts.get(key, 0), "complete": key != warmup and date < now.date() and len(coverage.get(key, [])) == len(SOURCES)})
        date += dt.timedelta(days=1)
    forecast, model = forecasts(history, now.date())
    notification = dict(previous.get("notifications", {}))
    # Delivery belongs to the existing SunWatch Worker. The API overlays actual
    # relay readiness and receipts; this collector has no Telegram credential.
    notification.update(configured=True, channel="sunwatch")
    notification.setdefault("deliveryStatus", "waiting")
    snapshot = {"schemaVersion": 1, "generatedAt": iso(now), "items": sorted(known.values(), key=lambda x: x["publishedAt"], reverse=True)[:1000],
                "sources": sources, "history": history, "forecast": forecast, "model": model, "notifications": notification,
                "internal": {"coverage": coverage, "seen": {key: value for key, value in seen.items() if value >= cutoff}, "firstSeenAt": previous.get("internal", {}).get("firstSeenAt", iso(now)),
                             "notificationOutbox": previous.get("internal", {}).get("notificationOutbox"),
                             "notificationPolicy": dict(previous.get("internal", {}).get("notificationPolicy", {}))}}
    return snapshot, new_ids


def forecast_summary(snapshot):
    forecast = snapshot["forecast"]
    if forecast["status"] != "ready":
        return None
    return {"total": sum(x["estimate"] for x in forecast["points"]), "method": forecast["method"]}


def digest(snapshot, bay, initial, reasons):
    lines = ["AGI 资本雷达 | " + snapshot["generatedAt"][:10]]
    if initial:
        lines.extend(["SunWatch 通道首次状态确认。",
                      f"当前保留 {len(snapshot['items'])} 条 AI 融资/创业候选报道；这是现有监控状态，不表示这些报道刚刚发生或刚刚新增。"])
    elif bay:
        lines.append(f"新发现并待提醒的湾区融资候选报道 {len(bay)} 条（标题/摘要提及湾区，未逐条确认交易或公司总部）。")
        for item in bay[:3]:
            lines.extend([item["title"][:180], item["url"]])
    if reasons:
        lines.append("核心变化：" + "；".join(reasons) + "。")
    health = sum(x["ok"] for x in snapshot["sources"])
    lines.append(f"本次来源检查 {health}/{len(snapshot['sources'])} 可用；失败来源保留历史记录，不补造数据。")
    forecast = snapshot["forecast"]
    current = forecast_summary(snapshot)
    if current:
        total = current["total"]
        lines.append(f"未来 7 日候选报道量模型估计 {total:.1f} 条；不是融资交易量或投资回报预测。")
    else:
        lines.append(f"预测暂不发布：完整观测 {forecast['observedDays']}/{MINIMUM_DAYS} 天，且需足够变化。")
    lines.append(ORIGIN + "/capital-radar")
    return "\n".join(lines)[:4000]


def prepare_notification(snapshot, new_ids):
    """Queue fixed-content owner signals. Never send and never discard pending.

    The admin GET overlays status=sent only for the outbox ID acknowledged by
    SunWatch. A failed relay therefore survives later collection/refresh cycles.
    """
    internal = snapshot["internal"]
    notification = snapshot["notifications"]
    policy = internal.get("notificationPolicy", {})
    initialized = policy.get("version") == "sunwatch-v1"
    if not initialized:
        policy = {"version": "sunwatch-v1", "initialized": False, "pendingBayIds": []}
    initial = not policy.get("initialized", False)
    known_pending = set(policy.get("pendingBayIds", []))
    discovered = set(new_ids)
    for item in snapshot["items"]:
        if item["id"] in discovered and item["geography"] == "sf-bay-area" and item["kind"] == "funding":
            known_pending.add(item["id"])
    policy["pendingBayIds"] = sorted(known_pending)
    internal["notificationPolicy"] = policy
    outbox = internal.get("notificationOutbox")
    if outbox and outbox.get("status") == "pending" and outbox.get("message") and outbox.get("createdAt"):
        # Never replace a previous message with a newer forecast or news batch.
        notification["deliveryStatus"] = "pending"
        return False
    # The comparison baseline means last acknowledged notification, not the last
    # attempted message. Expired/failed messages cannot advance that baseline.
    if outbox and outbox.get("status") == "sent" and policy.get("queuedForecast"):
        policy["lastForecast"] = policy["queuedForecast"]
    policy.pop("queuedForecast", None)
    internal["notificationOutbox"] = None  # acknowledged or legacy direct sender
    notification["deliveryStatus"] = "waiting"
    today = snapshot["generatedAt"][:10]
    if policy.get("lastQueuedDate") == today or (notification.get("lastSentAt") or "")[:10] == today:
        return False
    bay = [x for x in snapshot["items"] if x["id"] in known_pending]
    current, previous = forecast_summary(snapshot), policy.get("lastForecast")
    reasons = []
    if current:
        if previous is None:
            reasons.append("报道量预测首次达到发布条件")
        else:
            delta = abs(current["total"] - previous["total"])
            if delta >= 5 and delta >= abs(previous["total"]) * 0.25:
                reasons.append(f"7 日报道量估计较上次提醒由 {previous['total']:.1f} 变为 {current['total']:.1f} 条")
            if current["method"] != previous["method"]:
                reasons.append("回测复核后，选用的预测方法发生变化")
    if not initial and not bay and not reasons:
        return False
    message = digest(snapshot, bay, initial, reasons)
    internal["notificationOutbox"] = {"id": hashlib.sha256(message.encode()).hexdigest()[:24], "message": message,
                                       "status": "pending", "createdAt": snapshot["generatedAt"]}
    policy.update(initialized=True, lastQueuedDate=today, pendingBayIds=[])
    if current:
        policy["queuedForecast"] = current
    notification.update(deliveryStatus="pending", lastDigestDate=today)
    return True


def api(method, token, snapshot=None):
    if snapshot is not None:
        # D1 rows are bounded. History and de-dup state survive list trimming.
        while len(json.dumps({"snapshot": snapshot}, ensure_ascii=False).encode()) > 1_350_000 and snapshot["items"]:
            snapshot["items"].pop()
        if len(json.dumps({"snapshot": snapshot}, ensure_ascii=False).encode()) > 1_350_000:
            raise SafeError("private_storage_capacity")
    try:
        data = json.loads(request(ENDPOINT, method=method, token=token, data={"snapshot": snapshot} if snapshot is not None else None))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise SafeError("runner_invalid_response") from None
    if not data.get("ok"):
        raise SafeError("runner_rejected")
    return data


def run(dry_run=False):
    token = os.getenv("CAPITAL_RADAR_RUNNER_TOKEN", "")
    if not dry_run and not token:
        raise SafeError("runner_not_configured")
    previous = api("GET", token).get("snapshot") if token else None
    now = dt.datetime.now(UTC)
    snapshot, new_ids = collect(previous, now)
    if dry_run:
        print(json.dumps({"dry_run": True, "sources_ok": sum(x["ok"] for x in snapshot["sources"]), "new_mentions": len(new_ids), "forecast_status": snapshot["forecast"]["status"], "telegram_sent": False}))
        return
    queued = prepare_notification(snapshot, new_ids)
    # Atomic private API persistence also enqueues the outbox. SunWatch alone
    # reads it, sends through its existing owner channel, then acknowledges ID.
    api("PUT", token, snapshot)
    print(json.dumps({"sources_ok": sum(x["ok"] for x in snapshot["sources"]), "source_health": {x["id"]: "ok" if x["ok"] else x["error"] for x in snapshot["sources"]}, "new_mentions": len(new_ids), "forecast_status": snapshot["forecast"]["status"], "sunwatch_queued": queued, "delivery_status": snapshot["notifications"]["deliveryStatus"]}))
    if not any(x["ok"] for x in snapshot["sources"]):
        raise SafeError("all_sources_failed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Collect and evaluate; never save data or send notifications")
    args = parser.parse_args()
    try:
        run(args.dry_run)
    except SafeError as error:
        print("capital-radar: " + str(error), file=sys.stderr)
        raise SystemExit(1)
