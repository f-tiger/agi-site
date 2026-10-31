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
    notification["configured"] = bool(os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID"))
    notification.setdefault("deliveryStatus", "not_configured" if not notification["configured"] else "waiting")
    snapshot = {"schemaVersion": 1, "generatedAt": iso(now), "items": sorted(known.values(), key=lambda x: x["publishedAt"], reverse=True)[:1000],
                "sources": sources, "history": history, "forecast": forecast, "model": model, "notifications": notification,
                "internal": {"coverage": coverage, "seen": {key: value for key, value in seen.items() if value >= cutoff}, "firstSeenAt": previous.get("internal", {}).get("firstSeenAt", iso(now)),
                             "notificationOutbox": previous.get("internal", {}).get("notificationOutbox")}}
    return snapshot, new_ids


def digest(snapshot, new_ids, previous_model=None):
    fresh = [x for x in snapshot["items"] if x["id"] in set(new_ids)]
    bay = [x for x in fresh if x["geography"] == "sf-bay-area"]
    if not fresh and (snapshot["forecast"]["status"] != "ready" or snapshot["model"].get("version") == (previous_model or {}).get("version")):
        return None
    lines = ["AGI 资本雷达 | " + snapshot["generatedAt"][:10],
             f"新增 {len(fresh)} 条 AI 融资/创业候选报道；{len(bay)} 条标题/摘要提及湾区。规则筛选，未逐条确认交易或公司总部。"]
    for item in (bay + [x for x in fresh if x not in bay])[:3]:
        lines.extend([item["title"][:180], item["url"]])
    forecast = snapshot["forecast"]
    if forecast["status"] == "ready":
        total = sum(x["estimate"] for x in forecast["points"])
        lines.append(f"未来 7 日候选报道量模型估计 {total:.1f} 条；不是融资交易量或投资回报预测。")
    else:
        lines.append(f"预测暂不发布：完整观测 {forecast['observedDays']}/{MINIMUM_DAYS} 天，且需足够变化。")
    lines.append(ORIGIN + "/capital-radar")
    return "\n".join(lines)[:4000]


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


def send_telegram(message):
    token, chat = os.getenv("TELEGRAM_BOT_TOKEN", ""), os.getenv("TELEGRAM_CHAT_ID", "")
    if not token or not chat:
        raise SafeError("telegram_not_configured")
    try:
        result = json.loads(request("https://api.telegram.org/bot" + token + "/sendMessage", method="POST", data={"chat_id": chat, "text": message, "disable_web_page_preview": True}))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise SafeError("telegram_invalid_response") from None
    if result.get("ok") is not True:
        raise SafeError("telegram_rejected")
    return result["result"]["message_id"]


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
    message = digest(snapshot, new_ids, (previous or {}).get("model"))
    notification = snapshot["notifications"]
    # Save a claim before sending. An interrupted/ambiguous Telegram request is
    # recorded as unknown and NOT retried automatically, avoiding duplicate blasts.
    should_send = bool(message and notification["configured"] and notification.get("lastDigestDate") != now.date().isoformat())
    if should_send:
        notification.update(lastDigestDate=now.date().isoformat(), deliveryStatus="sending")
        snapshot["internal"]["notificationOutbox"] = {"id": hashlib.sha256(message.encode()).hexdigest()[:24], "status": "sending", "claimedAt": iso(now)}
    api("PUT", token, snapshot)
    if should_send:
        try:
            send_telegram(message)
            notification.update(lastSentAt=iso(dt.datetime.now(UTC)), deliveryStatus="sent")
            snapshot["internal"]["notificationOutbox"]["status"] = "sent"
        except SafeError:
            notification["deliveryStatus"] = "delivery_unknown"
            snapshot["internal"]["notificationOutbox"]["status"] = "delivery_unknown"
            snapshot["generatedAt"] = iso(dt.datetime.now(UTC))
            api("PUT", token, snapshot)
            raise SafeError("telegram_delivery_unknown") from None
        snapshot["generatedAt"] = iso(dt.datetime.now(UTC))
        api("PUT", token, snapshot)
    print(json.dumps({"sources_ok": sum(x["ok"] for x in snapshot["sources"]), "source_health": {x["id"]: "ok" if x["ok"] else x["error"] for x in snapshot["sources"]}, "new_mentions": len(new_ids), "forecast_status": snapshot["forecast"]["status"], "telegram_status": notification["deliveryStatus"]}))
    if not any(x["ok"] for x in snapshot["sources"]):
        raise SafeError("all_sources_failed")
    if not notification["configured"]:
        raise SafeError("telegram_not_configured")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Collect and evaluate; never save data or send notifications")
    args = parser.parse_args()
    try:
        run(args.dry_run)
    except SafeError as error:
        print("capital-radar: " + str(error), file=sys.stderr)
        raise SystemExit(1)
