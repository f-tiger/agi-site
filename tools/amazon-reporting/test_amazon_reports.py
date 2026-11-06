"""Offline contract and privacy regressions; no Amazon account calls are made."""
import base64
import contextlib
import hashlib
import http.client
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from urllib import parse

import amazon_reports as app


TOKEN = "fixture-access-token-never-log"
SECRET = "fixture-credential-secret-never-log"
SIGNED_URL = (
    "https://fixture.s3.eu-west-1.amazonaws.com/report.tsv"
    "?X-Amz-Signature=fixture-private-signature"
)
REPORT_BYTES = b"Date\tTracking ID\tEarnings\n2026-11-01\tfixture-21\t12.34\n"


def env(version="3.2"):
    return dict(zip(app.ENV_NAMES, ["fixture-id", SECRET, version]))


def token_response():
    return {"access_token": TOKEN, "expires_in": 3600}


def metadata(filename="private-earnings.tsv", base64_md5=False):
    checksum = hashlib.md5(REPORT_BYTES).digest()
    return {
        "filename": filename,
        "md5": base64.b64encode(checksum).decode() if base64_md5 else checksum.hex(),
        "size": len(REPORT_BYTES),
        "lastModified": "2026-11-06T00:00:00Z",
        "reportType": "CREATOR_CENTRAL",
    }


class FakeOpener:
    """Record requests and return only predeclared responses."""

    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []

    def open(self, req, timeout):
        self.requests.append(req)
        if not self.responses:
            raise AssertionError("Unexpected extra HTTP call")
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        if isinstance(response, dict):
            response = json.dumps(response).encode()
        return io.BytesIO(response)


def headers(req):
    return {key.lower(): value for key, value in req.header_items()}


class AmazonReportsTests(unittest.TestCase):
    def test_v3_eu_auth_and_list_match_official_sdk(self):
        opener = FakeOpener(token_response(), {"reports": []}, {"reports": []})
        client = app.Client(env("3.2"), opener)
        self.assertEqual(client.list_reports(), [])
        self.assertEqual(client.list_reports(), [])
        self.assertEqual(len(opener.requests), 3, "token must be reused while valid")
        auth, listing = opener.requests[:2]
        self.assertEqual(auth.full_url, "https://api.amazon.co.uk/auth/o2/token")
        self.assertEqual(auth.get_method(), "POST")
        self.assertEqual(headers(auth)["content-type"], "application/json")
        self.assertEqual(json.loads(auth.data), {
            "grant_type": "client_credentials", "client_id": "fixture-id",
            "client_secret": SECRET, "scope": "creatorsapi::default",
        })
        self.assertEqual(listing.full_url, "https://creatorsapi.amazon/reports/v1/listReports")
        self.assertEqual(json.loads(listing.data), {})
        self.assertEqual(headers(listing)["x-marketplace"], "www.amazon.de")
        self.assertEqual(headers(listing)["authorization"], "Bearer " + TOKEN)

    def test_v2_eu_auth_form_and_version_header_match_official_sdk(self):
        opener = FakeOpener(token_response(), {"reports": []})
        client = app.Client(env("2.2"), opener)
        self.assertEqual(client.list_reports(), [])
        auth, listing = opener.requests
        self.assertEqual(auth.full_url,
                         "https://creatorsapi.auth.eu-south-2.amazoncognito.com/oauth2/token")
        self.assertEqual(headers(auth)["content-type"], "application/x-www-form-urlencoded")
        self.assertEqual(parse.parse_qs(auth.data.decode()), {
            "grant_type": ["client_credentials"], "client_id": ["fixture-id"],
            "client_secret": [SECRET], "scope": ["creatorsapi/default"],
        })
        self.assertEqual(headers(listing)["authorization"], "Bearer " + TOKEN + ", Version 2.2")

    def test_get_report_payload_and_s3_download_do_not_share_bearer(self):
        report = metadata()
        opener = FakeOpener(token_response(), {"url": SIGNED_URL}, REPORT_BYTES)
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as folder:
            outcome = client.download(report, folder)
            self.assertEqual(outcome["status"], "downloaded")
            self.assertEqual((Path(folder) / outcome["file"]).read_bytes(), REPORT_BYTES)
        get_report, download = opener.requests[1:]
        self.assertEqual(get_report.full_url, "https://creatorsapi.amazon/reports/v1/getReport")
        self.assertEqual(json.loads(get_report.data), {
            "filename": report["filename"], "reportType": "CREATOR_CENTRAL",
        })
        self.assertEqual(headers(get_report)["authorization"], "Bearer " + TOKEN)
        self.assertEqual(download.get_method(), "GET")
        self.assertEqual(download.full_url, SIGNED_URL)
        self.assertNotIn("authorization", headers(download))

    def test_corrupt_download_is_not_persisted(self):
        corrupt = b"X" * len(REPORT_BYTES)
        opener = FakeOpener(token_response(), {"url": SIGNED_URL}, corrupt)
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(app.ReportError, "checksum_or_size_mismatch"):
                client.download(metadata(), folder)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_verified_same_report_skips_all_network_calls(self):
        opener = FakeOpener(token_response(), {"url": SIGNED_URL}, REPORT_BYTES)
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as folder:
            first = client.download(metadata(base64_md5=True), folder)
            second = client.download(metadata(base64_md5=True), folder)
            self.assertEqual(second, {"file": first["file"], "status": "unchanged"})
        self.assertEqual(len(opener.requests), 3)

    def test_remote_filename_cannot_escape_private_directory(self):
        opener = FakeOpener(token_response(), {"url": SIGNED_URL}, REPORT_BYTES)
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as parent:
            folder = Path(parent) / "reports"
            outcome = client.download(metadata("../../escape.tsv"), folder)
            self.assertRegex(outcome["file"], r"^[a-f0-9]{64}\.report$")
            written = list(Path(parent).rglob("*"))
            self.assertEqual([p for p in written if p.is_file()], [folder / outcome["file"]])

    def test_invalid_port_is_a_sanitized_report_error(self):
        bad = "https://fixture.amazonaws.com:PRIVATE_PORT_VALUE/x?sig=PRIVATE_SIG"
        opener = FakeOpener(token_response(), {"url": bad})
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(app.ReportError) as caught:
                client.download(metadata(), folder)
        for sensitive in ("PRIVATE_PORT_VALUE", "PRIVATE_SIG", SECRET, TOKEN, bad):
            self.assertNotIn(sensitive, str(caught.exception))

    def test_http_invalid_url_error_never_logs_signed_url(self):
        opener = FakeOpener(token_response(), {"url": SIGNED_URL},
                            http.client.InvalidURL("URL cannot contain controls: " + SIGNED_URL))
        client = app.Client(env(), opener)
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(app.ReportError) as caught:
                client.download(metadata(), folder)
        for sensitive in (SIGNED_URL, "fixture-private-signature", SECRET, TOKEN):
            self.assertNotIn(sensitive, str(caught.exception))

    def test_download_cannot_redirect_with_signed_url(self):
        handler = app.NoRedirect()
        req = app.request.Request(SIGNED_URL)
        with self.assertRaises(app.ReportError) as caught:
            handler.redirect_request(req, None, 302, "Found", {}, "https://example.org/")
        self.assertNotIn(SIGNED_URL, str(caught.exception))

    def invoke_run(self, client, folder, *flags):
        output = io.StringIO()
        previous_umask = os.umask(0o077)
        try:
            with mock.patch.object(app, "Client", return_value=client), \
                 mock.patch.object(app.sys, "argv", ["amazon_reports.py", "--output-dir", str(folder), *flags]), \
                 contextlib.redirect_stdout(output):
                result = app.run()
        finally:
            os.umask(previous_umask)
        return result, json.loads(output.getvalue())

    def test_empty_list_remains_unknown_revenue(self):
        client = app.Client(env(), FakeOpener(token_response(), {"reports": []}))
        with tempfile.TemporaryDirectory() as folder:
            code, output = self.invoke_run(client, folder)
            status = json.loads((Path(folder) / "status.json").read_text())
            self.assertEqual(code, 0)
            self.assertEqual(status["status"], "no_reports_available")
            self.assertEqual(status["revenue_status"], "not_evaluated")
            self.assertIsNone(status["net_commission"])

    def test_health_stdout_excludes_counts_filenames_and_financial_fields(self):
        client = app.Client(env(), FakeOpener(token_response(), {"reports": [metadata()]}))
        with tempfile.TemporaryDirectory() as folder:
            code, output = self.invoke_run(client, folder, "--health-only")
            status = json.loads((Path(folder) / "status.json").read_text())
            self.assertEqual(code, 0)
            self.assertEqual(output["status"], "reports_available")
            self.assertLessEqual(set(output), {"status", "error"})
            self.assertEqual(status["report_count"], 1)

    def test_health_failure_stdout_has_only_safe_status_and_error(self):
        client = mock.Mock()
        client.list_reports.side_effect = app.ReportError("listReports: HTTP_403: AssociateNotEligible")
        with tempfile.TemporaryDirectory() as folder:
            code, output = self.invoke_run(client, folder, "--health-only")
            status = json.loads((Path(folder) / "status.json").read_text())
            self.assertEqual(code, 2)
            self.assertEqual(output["status"], "blocked")
            self.assertLessEqual(set(output), {"status", "error"})
            self.assertIsNone(status["net_commission"])

    def test_git_worktree_output_is_blocked_before_network_or_write(self):
        for marker_kind in ("git_head", "git_file"):
            with self.subTest(marker_kind=marker_kind), tempfile.TemporaryDirectory() as folder:
                repo = Path(folder) / "repo"
                repo.mkdir()
                marker = repo / ".git"
                if marker_kind == "git_head":
                    marker.mkdir()
                    (marker / "HEAD").write_text("ref: refs/heads/main\n")
                else:
                    marker.write_text("gitdir: /fixture/private/worktree-metadata\n")
                destination = repo / "nested" / "private-reports"
                client = mock.Mock()
                code, output = self.invoke_run(client, destination, "--health-only")
                self.assertEqual(code, 2)
                self.assertEqual(output, {
                    "status": "blocked", "error": "output_inside_git_worktree",
                })
                client.list_reports.assert_not_called()
                self.assertFalse(destination.exists())

    def test_symlink_output_resolving_inside_git_worktree_is_blocked(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = Path(folder) / "repo"
            (repo / ".git").mkdir(parents=True)
            (repo / ".git" / "HEAD").write_text("ref: refs/heads/main\n")
            alias = Path(folder) / "apparently-private"
            alias.symlink_to(repo, target_is_directory=True)
            client = mock.Mock()
            code, output = self.invoke_run(client, alias / "private-reports", "--health-only")
            self.assertEqual(code, 2)
            self.assertEqual(output["error"], "output_inside_git_worktree")
            client.list_reports.assert_not_called()
            self.assertFalse((repo / "private-reports").exists())

    def test_empty_platform_git_placeholder_allows_private_output(self):
        with tempfile.TemporaryDirectory() as folder:
            parent = Path(folder)
            (parent / ".git").mkdir()
            destination = parent / "private-reports"
            client = app.Client(env(), FakeOpener(token_response(), {"reports": []}))
            code, output = self.invoke_run(client, destination, "--health-only")
            self.assertEqual(code, 0)
            self.assertEqual(output, {"status": "no_reports_available"})
            self.assertTrue((destination / "status.json").is_file())


if __name__ == "__main__":
    unittest.main()
