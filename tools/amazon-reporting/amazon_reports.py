#!/usr/bin/env python3
"""Read existing Amazon Creators reports; no account changes or inferred revenue.

Protocol verified against Amazon's official Node SDK 1.3.0, 2026-11-06.
Uses the configured HTTP(S) proxy and normal TLS verification.
"""
import argparse
import base64
import hashlib
from http.client import HTTPException
import json
import os
from pathlib import Path
import re
import ssl
import sys
import tempfile
import time
from urllib import error, parse, request

ENDPOINT = "https://creatorsapi.amazon/reports/v1/"
TOKEN_ENDPOINTS = {
    "2.1": "https://creatorsapi.auth.us-east-1.amazoncognito.com/oauth2/token",
    "2.2": "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token",
    "2.3": "https://creatorsapi.auth.us-west-2.amazoncognito.com/oauth2/token",
    "3.1": "https://api.amazon.com/auth/o2/token",
    "3.2": "https://api.amazon.co.uk/auth/o2/token",
    "3.3": "https://api.amazon.co.jp/auth/o2/token",
}
ENV_NAMES = ("AMAZON_CREATORS_CREDENTIAL_ID", "AMAZON_CREATORS_CREDENTIAL_SECRET",
             "AMAZON_CREATORS_CREDENTIAL_VERSION")
MAX_JSON = 8 * 1024 * 1024
MAX_REPORT = 64 * 1024 * 1024


class ReportError(Exception):
    """Messages are intentionally safe for logs: no tokens, URLs or server text."""


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ReportError("redirect_refused")


def private_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".partial-")
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(data)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def digest_matches(data, expected):
    digest = hashlib.md5(data).digest()  # Amazon transport checksum, not security.
    if re.fullmatch(r"[a-fA-F0-9]{32}", expected):
        return digest.hex() == expected.lower()
    if re.fullmatch(r"[A-Za-z0-9+/]{22}==", expected):
        return base64.b64encode(digest).decode() == expected
    raise ReportError("unsupported_md5_format")


class Client:
    def __init__(self, env=None, opener=None):
        env = os.environ if env is None else env
        missing = [name for name in ENV_NAMES if not env.get(name)]
        if missing:
            raise ReportError("missing_configuration: " + ", ".join(missing))
        self.credential_id, self.secret, self.version = (env[n] for n in ENV_NAMES)
        if self.version not in TOKEN_ENDPOINTS:
            raise ReportError("unsupported_credential_version")
        # ProxyHandler preserves inherited proxy configuration; no direct bypass.
        self.opener = opener or request.build_opener(
            request.ProxyHandler(),
            request.HTTPSHandler(context=ssl.create_default_context()), NoRedirect())
        self.token = None
        self.expires_at = 0

    def read(self, req, limit, stage):
        try:
            with self.opener.open(req, timeout=45) as response:
                data = response.read(limit + 1)
            if len(data) > limit:
                raise ReportError(stage + ": response_too_large")
            return data
        except error.HTTPError as exc:
            reason = ""
            try:
                body = json.loads(exc.read(16384))
                candidate = body.get("reason") if isinstance(body, dict) else None
                if candidate in ("AssociateNotEligible", "AuthorizationFailed", "Other"):
                    reason = ": " + candidate
            except (ValueError, OSError):
                pass
            raise ReportError(f"{stage}: HTTP_{exc.code}{reason}") from None
        except (error.URLError, TimeoutError, OSError, HTTPException, UnicodeError, ValueError):
            raise ReportError(stage + ": network_or_tls_error") from None

    def json(self, req, stage):
        try:
            value = json.loads(self.read(req, MAX_JSON, stage))
        except (ValueError, UnicodeError):
            raise ReportError(stage + ": invalid_json") from None
        if not isinstance(value, dict):
            raise ReportError(stage + ": invalid_response_shape")
        return value

    def access_token(self):
        if self.token and time.monotonic() < self.expires_at:
            return self.token
        lwa = self.version.startswith("3.")
        payload = {"grant_type": "client_credentials", "client_id": self.credential_id,
                   "client_secret": self.secret,
                   "scope": "creatorsapi::default" if lwa else "creatorsapi/default"}
        data = json.dumps(payload).encode() if lwa else parse.urlencode(payload).encode()
        req = request.Request(TOKEN_ENDPOINTS[self.version], data=data, headers={
            "Content-Type": "application/json" if lwa else "application/x-www-form-urlencoded"},
            method="POST")
        result = self.json(req, "authentication")
        token, expiry = result.get("access_token"), result.get("expires_in")
        if not isinstance(token, str) or not token or not isinstance(expiry, (int, float)):
            raise ReportError("authentication: missing_token_or_expiry")
        self.token = token
        self.expires_at = time.monotonic() + max(0, expiry - 30)
        return token

    def api(self, operation, payload=None):
        if operation not in ("listReports", "getReport"):
            raise ReportError("unsupported_operation")
        authorization = "Bearer " + self.access_token()
        if self.version.startswith("2."):
            authorization += ", Version " + self.version
        req = request.Request(ENDPOINT + operation,
            data=json.dumps(payload or {}).encode(), method="POST", headers={
                "Authorization": authorization, "x-marketplace": "www.amazon.de",
                "Content-Type": "application/json; charset=utf-8", "Accept": "application/json"})
        return self.json(req, operation)

    def list_reports(self):
        result = self.api("listReports")
        rows = result.get("reports")
        if not isinstance(rows, list):
            raise ReportError("listReports: missing_reports_array")
        clean = []
        for row in rows:
            if not isinstance(row, dict) or not all(isinstance(row.get(k), str) and row[k]
                    for k in ("filename", "md5", "lastModified")):
                raise ReportError("listReports: invalid_metadata")
            if type(row.get("size")) is not int or row["size"] < 0:
                raise ReportError("listReports: invalid_size")
            item = {k: row[k] for k in ("filename", "md5", "size", "lastModified")}
            if row.get("reportType") is not None:
                if row["reportType"] not in ("CREATOR_CENTRAL", "CREATOR_CONNECTIONS"):
                    raise ReportError("listReports: unsupported_report_type")
                item["reportType"] = row["reportType"]
            clean.append(item)
        return clean

    def download(self, report, directory):
        if report["size"] > MAX_REPORT:
            raise ReportError("download: report_exceeds_64MiB_limit")
        # Remote filenames never control local paths. Different report revisions coexist.
        key = hashlib.sha256(json.dumps(report, sort_keys=True).encode()).hexdigest()
        target = Path(directory) / (key + ".report")
        if target.is_file() and not target.is_symlink() and target.stat().st_size == report["size"]:
            data = target.read_bytes()
            if digest_matches(data, report["md5"]):
                return {"file": target.name, "status": "unchanged"}
        payload = {k: report[k] for k in ("filename", "reportType") if k in report}
        result = self.api("getReport", payload)
        url = result.get("url")
        if not isinstance(url, str):
            raise ReportError("getReport: missing_download_url")
        try:
            if any(ord(c) <= 32 or ord(c) == 127 for c in url):
                raise ValueError()
            parsed = parse.urlsplit(url)
            host = parsed.hostname or ""
            if (parsed.scheme != "https" or parsed.username or parsed.password or
                    parsed.port not in (None, 443) or not host.endswith(".amazonaws.com")):
                raise ValueError()
            download_request = request.Request(url)
        except (ValueError, UnicodeError, HTTPException):
            raise ReportError("getReport: invalid_download_url") from None
        # Deliberately omit API Authorization on the pre-signed S3 request.
        data = self.read(download_request, MAX_REPORT, "download")
        if len(data) != report["size"] or not digest_matches(data, report["md5"]):
            raise ReportError("download: checksum_or_size_mismatch")
        private_write(target, data)
        return {"file": target.name, "status": "downloaded"}


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Download actual listed reports")
    parser.add_argument("--output-dir", type=Path,
                        default=Path(tempfile.gettempdir()) / f"eco-amazon-private-{os.getuid()}")
    parser.add_argument("--health-only", action="store_true",
                        help="Print only operational status, suitable for public CI logs")
    parser.add_argument("--limit", type=int, default=10, help="Maximum files per invocation")
    args = parser.parse_args()
    if not 1 <= args.limit <= 100:
        parser.error("--limit must be 1..100")
    output = args.output_dir.resolve()
    markers = [parent / ".git" for parent in (output, *output.parents)]
    if any(marker.is_file() or (marker / "HEAD").is_file() for marker in markers):
        print(json.dumps({"status": "blocked", "error": "output_inside_git_worktree"}))
        return 2
    os.umask(0o077)
    status = {"source": "amazon_creators_reports", "marketplace": "www.amazon.de",
              "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "revenue_status": "not_evaluated", "net_commission": None}
    try:
        client = Client()
        reports = client.list_reports()
        status.update(status="reports_available" if reports else "no_reports_available",
                      report_count=len(reports), downloads=[])
        private_write(args.output_dir / "manifest.json", json.dumps({
            "checked_at": status["checked_at"], "marketplace": "www.amazon.de",
            "reports": reports}, indent=2).encode())
        if args.download:
            pending = sorted(reports, key=lambda x: x["lastModified"], reverse=True)[:args.limit]
            for report in pending:
                status["downloads"].append(client.download(report, args.output_dir / "raw"))
            status["unprocessed_report_count"] = max(0, len(reports) - len(pending))
    except ReportError as exc:
        status.update(status="blocked", error=str(exc))
    private_write(args.output_dir / "status.json", json.dumps(status, indent=2).encode())
    public_status = {k: status[k] for k in ("status", "error") if k in status}
    print(json.dumps(public_status if args.health_only else status))
    return 2 if status["status"] == "blocked" else 0


if __name__ == "__main__":
    sys.exit(run())
