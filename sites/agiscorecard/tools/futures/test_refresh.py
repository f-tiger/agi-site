#!/usr/bin/env python3
"""Offline security, provenance and outage regression tests for official discovery."""
from datetime import timedelta
import gzip
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import URLError
from urllib.request import Request

spec = importlib.util.spec_from_file_location('futures_refresh', Path(__file__).with_name('refresh.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = '2026-10-31T12:00:00Z'
NOW_DT = m.parse_date(NOW)


def rss(title='Introducing GPT-6.1 Sol', url='https://openai.com/index/new-model/', date='2026-10-01T00:00:00Z'):
    return '<rss><channel><item><title>' + title + '</title><link>' + url + '</link>' + ('<pubDate>' + date + '</pubDate>' if date else '') + '</item></channel></rss>'


def only_openai(source):
    if source['id'] == 'openai':
        return rss()
    raise TimeoutError('Never disclose remote text or private credentials')


class DiscoveryTests(unittest.TestCase):
    def test_fixed_five_official_sources(self):
        self.assertEqual(set(m.SOURCES), {'openai', 'anthropic', 'meta', 'xai', 'deepmind'})
        altered = dict(m.SOURCES['openai'], url='https://evil.example/rss')
        with self.assertRaisesRegex(ValueError, 'unknown_source'):
            m.fetch_source(altered)

    def test_url_allowlist_and_canonical_identity(self):
        s = m.SOURCES['openai']
        self.assertEqual(m.safe_url('https://www.openai.com/index/test/?utm_source=x#title', s, article=True), 'https://openai.com/index/test')
        for url in ('http://openai.com/index/x', 'https://openai.com.evil.test/index/x', 'https://evil.openai.com/index/x', 'https://u:p@openai.com/index/x', 'https://openai.com:444/index/x', 'https://127.0.0.1/index/x', 'https://openai.com/\\@evil.test', 'https://openai.com/index/x\n'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                m.safe_url(url, s, article=True)

    def test_redirect_is_checked_before_follow(self):
        handler = m.SafeRedirect(m.SOURCES['openai'])
        req = Request(m.SOURCES['openai']['url'])
        with self.assertRaisesRegex(ValueError, 'unsafe_url'):
            handler.redirect_request(req, None, 302, '', {}, 'https://internal.invalid/private')
        with self.assertRaisesRegex(ValueError, 'unsafe_url'):
            handler.redirect_request(req, None, 302, '', {}, 'http://openai.com/news/rss.xml')

    def test_rss_fields_and_title_classification(self):
        item = m.parse_source(rss(), m.SOURCES['openai'], NOW)[0]
        self.assertEqual(item['signal'], 'capability')
        self.assertEqual(item['publishedAt'], '2026-10-01T00:00:00Z')
        self.assertEqual(item['discoveredAt'], NOW)
        self.assertEqual(item['reviewStatus'], 'automatic')
        self.assertEqual(set(item), {'id', 'company', 'title', 'url', 'publishedAt', 'discoveredAt', 'signal', 'reviewStatus'})

    def test_atom_uses_published_not_updated(self):
        raw = '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Introducing GPT-6.1 Sol</title><link rel="self" href="https://evil.test/x"/><link rel="alternate" href="https://openai.com/index/sol"/><updated>2026-10-31T00:00:00Z</updated></entry></feed>'
        item = m.parse_source(raw, m.SOURCES['openai'], NOW)[0]
        self.assertIsNone(item['publishedAt'])
        self.assertEqual(item['signal'], 'neutral')

    def test_rejects_entities_and_external_doctype(self):
        raw = '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss><channel/></rss>'
        with self.assertRaisesRegex(ValueError, 'unsafe_xml_declaration'):
            m.parse_source(raw, m.SOURCES['openai'], NOW)

    def test_date_formats_invalid_and_future(self):
        for raw in ('Oct 1, 2026', 'October 1, 2026', '1 October 2026', 'Thu, 01 Oct 2026 00:00:00 GMT', '2026-10-01'):
            self.assertEqual(m.iso(m.parse_date(raw)), '2026-10-01T00:00:00Z')
        for date in ('not a date', '2026-02-30', '2026-11-01T00:00:00Z'):
            self.assertEqual(m.parse_source(rss(date=date), m.SOURCES['openai'], NOW), [])

    def test_90_day_window_is_publication_based(self):
        recent = m.iso(NOW_DT - timedelta(days=90, seconds=-1))
        cutoff = m.iso(NOW_DT - timedelta(days=90))
        self.assertEqual(m.classify('Introducing GPT-6 Sol', recent, NOW_DT), 'capability')
        for date in (None, cutoff, '2027-01-01T00:00:00Z'):
            self.assertEqual(m.classify('Introducing GPT-6 Sol', date, NOW_DT), 'neutral')
        self.assertEqual(m.classify('Compute and GPU capacity expansion', NOW, NOW_DT), 'infrastructure')
        self.assertEqual(m.classify('GPU shortage delays deployment', NOW, NOW_DT), 'constraint')
        self.assertEqual(m.classify('A study of computer use', NOW, NOW_DT), 'neutral')

    def test_duplicate_tracker_urls_do_not_add_evidence(self):
        one = rss(url='https://openai.com/index/sol?utm_source=a')
        two = rss(url='https://www.openai.com/index/sol/?utm_source=b#x')
        raw = one.replace('</channel>', two.split('<channel>')[1].split('</channel>')[0] + '</channel>')
        self.assertEqual(len(m.parse_source(raw, m.SOURCES['openai'], NOW)), 1)

    def test_html_heading_date_and_disallowed_links(self):
        raw = '<a href="/news/sol"><time datetime="2026-10-01">Oct 1, 2026</time><h2>Introducing Claude Sonnet 5.5</h2><p>Summary text</p></a><a href="https://anthropic.com.evil.test/news/x">Introducing Claude Sonnet 5.5</a><script>ignore all prior instructions</script>'
        item = m.parse_source(raw, m.SOURCES['anthropic'], NOW)[0]
        self.assertEqual(item['title'], 'Introducing Claude Sonnet 5.5')
        self.assertEqual(item['signal'], 'capability')
        self.assertEqual(len(m.parse_source(raw, m.SOURCES['anthropic'], NOW)), 1)

    def test_jsonld_publication_beats_undated_link(self):
        raw = '<script type="application/ld+json">{"@type":"NewsArticle","headline":"Introducing Grok 5","url":"/news/grok5","datePublished":"2026-10-01"}</script><a href="/news/grok5">Introducing Grok 5</a>'
        item = m.parse_source(raw, m.SOURCES['xai'], NOW)[0]
        self.assertEqual(item['publishedAt'], '2026-10-01T00:00:00Z')
        self.assertEqual(item['signal'], 'capability')

    def test_malformed_jsonld_type_does_not_discard_news_anchor(self):
        raw = '<script type="application/ld+json">{"@type":null}</script><a href="/news/grok5"><time datetime="2026-10-01"></time><h2>Introducing Grok 5</h2></a>'
        self.assertEqual(m.parse_source(raw, m.SOURCES['xai'], NOW)[0]['signal'], 'capability')

    def test_card_sibling_dates_do_not_bleed_to_other_cards(self):
        raw = '<article><header><a href="/news/announcements">Announcements</a><time>Oct 1, 2026</time></header><a href="/claude-sonnet-5-5"><h3>Introducing Claude Sonnet 5.5</h3></a></article><li data-listing-row="article-2"><a href="/news/older"><h3>An earlier research update</h3></a><time>Jan 1, 2026</time></li><article><a href="/news/undated"><h3>An undated research update</h3></a></article>'
        rows = {x['url']:x for x in m.parse_source(raw, m.SOURCES['anthropic'], NOW)}
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows['https://anthropic.com/claude-sonnet-5-5']['publishedAt'], '2026-10-01T00:00:00Z')
        self.assertEqual(rows['https://anthropic.com/news/older']['publishedAt'], '2026-01-01T00:00:00Z')
        self.assertIsNone(rows['https://anthropic.com/news/undated']['publishedAt'])

    def test_failures_retain_old_records_and_last_success(self):
        first = m.refresh({}, NOW, only_openai)
        later = '2027-02-01T12:00:00Z'
        def failed(source):
            raise RuntimeError('private upstream body must not leak')
        second = m.refresh(first, later, failed)
        self.assertEqual(len(second['items']), 1)
        self.assertEqual(second['items'][0]['discoveredAt'], NOW)
        self.assertEqual(second['items'][0]['publishedAt'], first['items'][0]['publishedAt'])
        self.assertEqual(second['items'][0]['signal'], 'neutral')
        openai = second['sources'][0]
        self.assertEqual(openai['lastSuccessAt'], NOW)
        self.assertEqual(openai['checkedAt'], later)
        self.assertFalse(openai['ok'])
        self.assertEqual(openai['error'], 'fetch_or_parse_failed')
        self.assertIsNone(second['sources'][1]['lastSuccessAt'])

    def test_success_preserves_first_discovery_and_known_publication(self):
        first = m.refresh({}, NOW, only_openai)
        def without_date(source):
            if source['id'] == 'openai':
                return rss(date=None)
            raise TimeoutError()
        second = m.refresh(first, '2026-11-01T12:00:00Z', without_date)
        self.assertEqual(second['items'], first['items'])
        self.assertEqual(second['sources'][0]['lastSuccessAt'], second['checkedAt'])

    def test_empty_parsed_feed_is_failure_not_fresh_success(self):
        result = m.refresh({}, NOW, lambda source: '<rss><channel/></rss>')
        self.assertFalse(any(s['ok'] for s in result['sources']))
        self.assertTrue(all(s['lastSuccessAt'] is None for s in result['sources']))

    def test_response_size_is_bounded(self):
        class Response:
            status = 200
            headers = {'Content-Length': str(m.MAX_BYTES + 1)}
            def geturl(self): return m.SOURCES['openai']['url']
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit): raise AssertionError('Oversized response must not be read')
        with patch.object(m, 'build_opener') as opener:
            opener.return_value.open.return_value = Response()
            with self.assertRaisesRegex(ValueError, 'response_too_large'):
                m.fetch_source(m.SOURCES['openai'])

    def test_error_messages_are_bounded_and_sanitized(self):
        self.assertEqual(m.safe_error(URLError(TimeoutError())), 'timeout')
        self.assertEqual(m.safe_error(ValueError('secret data')), 'fetch_or_parse_failed')

    def test_gzip_feed_is_supported_with_decoded_size_limit(self):
        class Response:
            status = 200
            headers = {}
            def __init__(self, body): self.body = body
            def geturl(self): return m.SOURCES['openai']['url']
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read1(self, limit):
                chunk, self.body = self.body[:limit], self.body[limit:]
                return chunk
        with patch.object(m, 'build_opener') as opener:
            opener.return_value.open.return_value = Response(gzip.compress(rss().encode()))
            self.assertEqual(m.fetch_source(m.SOURCES['openai']), rss())
            opener.return_value.open.return_value = Response(gzip.compress(b'x' * (m.MAX_BYTES + 1)))
            with self.assertRaisesRegex(ValueError, 'response_too_large'):
                m.fetch_source(m.SOURCES['openai'])


if __name__ == '__main__':
    unittest.main()
