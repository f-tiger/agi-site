import unittest
from datetime import datetime, timezone
from urllib.error import HTTPError
from unittest.mock import patch

import refresh


NOW = datetime(2026, 11, 20, tzinfo=timezone.utc)
SOURCE = refresh.SOURCES[0]


def row(number, prefix="rust-v", repo="openai/codex"):
    tag = f"{prefix}1.0.{number}"
    return {"id": number, "tag_name": tag, "prerelease": False, "draft": False,
            "published_at": "2026-11-19T22:00:00Z", "html_url": f"https://github.com/{repo}/releases/tag/{tag}",
            "body": "Never display release notes", "assets": [{"name": "Never download assets"}]}


def sequence(start, stop):
    return [row(i) for i in range(start, stop - 1, -1)]


def scan(rows, prior=None):
    def load(repo, page):
        start = (page - 1) * refresh.PAGE_SIZE
        return rows[start:start + refresh.PAGE_SIZE]
    return refresh.refresh_source(SOURCE, prior or {}, NOW, load)


class RefreshTests(unittest.TestCase):
    def test_real_product_tags_and_metadata_only(self):
        for source in refresh.SOURCES:
            item = row(3, source[3], source[2])
            result = refresh.refresh_source(source, {}, NOW, lambda repo, page: [item])
            self.assertEqual(result["status"], "ok")
            self.assertEqual(result["releases"][0]["version"], "1.0.3")
            keys = set(result["releases"][0])
            self.assertEqual(keys, {"id", "tag", "version", "publishedAt", "url", "checks"})
            self.assertTrue(all(result["releases"][0]["checks"].values()))

    def test_multiple_stable_same_day_excludes_prerelease_draft_and_other_products(self):
        baseline = scan(sequence(3, 1))
        incoming = [{**row(9), "tag_name": "sdk-0.1"}, {**row(8), "prerelease": True},
                    {**row(7), "draft": True}, *sequence(6, 1)]
        first = scan(incoming, baseline)
        self.assertEqual([r["id"] for r in first["releases"]], list(range(6, 0, -1)))
        self.assertEqual(scan(incoming, first), first)

    @patch.object(refresh, "PAGE_SIZE", 3)
    @patch.object(refresh, "MAX_PAGES", 4)
    def test_bounded_backfill_reconciles_when_head_grows_between_runs(self):
        previous = scan(sequence(1, 1))
        burst = scan(sequence(24, 1), previous)
        self.assertEqual(burst["status"], "partial")
        self.assertEqual(burst["anchorId"], 1)
        incoming = sequence(26, 1)
        for _ in range(8):
            burst = scan(incoming, burst)
            if burst["status"] == "ok":
                break
        self.assertEqual(burst["status"], "ok")
        self.assertEqual(burst["anchorId"], 26)
        self.assertEqual([r["id"] for r in burst["releases"]], list(range(26, 0, -1)))

    @patch.object(refresh, "PAGE_SIZE", 3)
    @patch.object(refresh, "MAX_PAGES", 4)
    def test_deleted_chunk_boundary_restarts_and_recovers(self):
        previous = scan(sequence(1, 1))
        burst = scan(sequence(30, 1), previous)
        tail = burst["backlog"]["tailId"]
        rows = [r for r in sequence(30, 1) if r["id"] != tail]
        for _ in range(12):
            burst = scan(rows, burst)
            if burst["status"] == "ok":
                break
        self.assertEqual(burst["status"], "ok")
        self.assertEqual({r["id"] for r in burst["releases"]}, set(range(1, 31)))

    def test_provider_error_retains_good_history_and_checkpoint(self):
        previous = scan(sequence(3, 1))
        def offline(repo, page):
            raise HTTPError("fixed publisher", 403, "unavailable", None, None)
        failed = refresh.refresh_source(SOURCE, previous, NOW, offline)
        self.assertEqual(failed["status"], "unavailable")
        self.assertEqual(failed["error"], "http_403")
        self.assertEqual(failed["releases"], previous["releases"])
        self.assertEqual(failed["lastSuccessAt"], previous["lastSuccessAt"])
        self.assertEqual(failed["anchorId"], previous["anchorId"])
        self.assertEqual(scan(sequence(4, 1), failed)["status"], "ok")

    def test_rejects_invalid_data_without_emptying_history(self):
        previous = scan(sequence(3, 1))
        for new_rows in ([], [{**row(4), "html_url": "https://example.org/other"}],
                         [{**row(5), "published_at": "2099-01-01T00:00:00Z"}],
                         [{**row(6), "prerelease": None}], [row(3), row(3)]):
            with self.subTest(rows=new_rows):
                failed = scan(new_rows, previous)
                self.assertEqual(failed["status"], "unavailable")
                self.assertEqual(failed["releases"], previous["releases"])


if __name__ == "__main__":
    unittest.main()
