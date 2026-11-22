#!/usr/bin/env python3
"""Record stable CLI releases from the two publishers. No packages or model calls."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import gzip
import io
import json
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener

SNAPSHOT = Path(__file__).resolve().parents[2] / "futures-assets/release-checks" / "releases.json"
SOURCES = (
    ("codex", "Codex CLI", "openai/codex", "rust-v"),
    ("claude-code", "Claude Code", "anthropics/claude-code", "v"),
)
PAGE_SIZE = 10  # Codex attaches hundreds of binary assets; discard them immediately.
MAX_PAGES = 5  # Per publisher, per run, including head and overlap.
MAX_BYTES = 8_000_000


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def get_page(repo, page):
    if repo not in {s[2] for s in SOURCES} or type(page) is not int or page < 1:
        raise ValueError("source")
    url = f"https://api.github.com/repos/{repo}/releases?per_page={PAGE_SIZE}&page={page}"
    request = Request(url, headers={
        "User-Agent": "AGI-Scorecard-Release-Checks/1.0",
        "Accept": "application/vnd.github+json", "Accept-Encoding": "gzip",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with build_opener(NoRedirect()).open(request, timeout=14) as response:
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("response_size")
        if response.headers.get("Content-Encoding", "").lower() == "gzip":
            with gzip.GzipFile(fileobj=io.BytesIO(raw)) as compressed:
                raw = compressed.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError("response_size")
        return json.loads(raw)


def release_record(row, repo, prefix, now):
    if type(row.get("draft")) is not bool or type(row.get("prerelease")) is not bool:
        raise ValueError("release_status")
    if row["draft"] or row["prerelease"]:
        return None
    tag = row.get("tag_name")
    if not isinstance(tag, str):
        raise ValueError("release_tag")
    match = re.fullmatch(re.escape(prefix) + r"(\d{1,5}\.\d{1,5}\.\d{1,5})", tag, re.ASCII)
    if not match:  # Only stable product tags, not SDK or alpha/nightly tags.
        return None
    url = f"https://github.com/{repo}/releases/tag/{tag}"
    date = row.get("published_at")
    if row.get("html_url") != url or not isinstance(date, str) or not re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", date):
        raise ValueError("release_metadata")
    if datetime.fromisoformat(date.replace("Z", "+00:00")) > now + timedelta(minutes=5):
        raise ValueError("future_publication")
    return {
        "id": row["id"], "tag": tag, "version": match.group(1),
        "publishedAt": date, "url": url,
        "checks": {"officialSource": True, "stableRelease": True, "publicationTime": True},
    }


def refresh_source(source, prior, now, loader=get_page):
    ident, name, repo, prefix = source
    checked = now.isoformat(timespec="seconds").replace("+00:00", "Z")
    state = {
        **prior, "id": ident, "name": name, "repo": repo, "sourceUrl": f"https://github.com/{repo}/releases",
        "checkedAt": checked, "lastSuccessAt": prior.get("lastSuccessAt"), "coverageSince": prior.get("coverageSince"),
        "releases": prior.get("releases", []), "error": None,
    }
    releases = {r["id"]: r for r in state["releases"]}
    pages = {}

    def read(number):
        if number not in pages:
            rows = loader(repo, number)
            if not isinstance(rows, list) or len(rows) > PAGE_SIZE:
                raise ValueError("release_list")
            ids = []
            for row in rows:
                if not isinstance(row, dict) or type(row.get("id")) is not int or row["id"] < 1:
                    raise ValueError("release_id")
                ids.append(row["id"])
                record = release_record(row, repo, prefix, now)
                if record:
                    releases[record["id"]] = record
            if len(set(ids)) != len(ids):
                raise ValueError("duplicate_release_id")
            pages[number] = ids
        return pages[number]

    try:
        first = read(1)
        if not first:
            raise ValueError("empty_repository")
        anchor = prior.get("anchorId")
        cursor = prior.get("backlog")
        head = cursor["headId"] if cursor else first[0]
        tail = cursor["tailId"] if cursor else None
        page = cursor["page"] if cursor else 1
        status = "partial"
        while page in pages or len(pages) < MAX_PAGES:
            ids = read(page)
            if tail is not None:  # Seek the previous chunk even if new head entries shifted pagination.
                if tail not in ids:
                    if len(ids) < PAGE_SIZE:
                        cursor = None  # Deleted checkpoint: restart at head, preserving the old anchor.
                        break
                    page += 1
                    cursor = {**cursor, "page": page}
                    continue
                ids_to_scan = ids[ids.index(tail):]
                tail = None
            else:
                ids_to_scan = ids
            at_end = len(ids) < PAGE_SIZE
            # Initial history is a bounded baseline. Subsequent scans must reach
            # the previous anchor or the actual end before advancing that anchor.
            if (anchor is None and releases) or anchor in ids_to_scan or at_end:
                if not releases:
                    raise ValueError("no_stable_product_releases")
                if page == 1 and not at_end:
                    read(2)  # Recent releases edited in place are rechecked, too.
                cursor = None
                state["anchorId"] = head
                if head == first[0]:
                    status = "ok"
                    state.update(lastSuccessAt=checked, coverageSince=state["coverageSince"] or checked)
                break
            cursor = {"headId": head, "tailId": ids[-1], "page": page}
            page += 1
        state.update(status=status, backlog=cursor, releases=sorted(
            releases.values(), key=lambda r: (r["publishedAt"], r["id"]), reverse=True))
    except (HTTPError, OSError, ValueError, TypeError, EOFError) as exc:
        # Do not advance the checkpoint or replace history with a partial/empty result.
        code = f"http_{exc.code}" if isinstance(exc, HTTPError) else "invalid_response" if isinstance(exc, (ValueError, TypeError)) else "fetch_failed"
        state.update(status="unavailable", error=code)
    return state


def main():
    previous = json.loads(SNAPSHOT.read_text()) if SNAPSHOT.exists() else {}
    by_id = {s["id"]: s for s in previous.get("sources", [])}
    now = datetime.now(timezone.utc)
    with ThreadPoolExecutor(max_workers=2) as pool:
        sources = list(pool.map(lambda s: refresh_source(s, by_id.get(s[0], {}), now), SOURCES))
    result = {"version": 1, "checkedAt": sources[0]["checkedAt"], "sources": sources}
    pending = SNAPSHOT.with_suffix(".tmp")
    pending.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    pending.replace(SNAPSHOT)
    for source in sources:
        print(f"{source['name']}: {source['status']}, {len(source['releases'])} recorded stable releases")


if __name__ == "__main__":
    main()
