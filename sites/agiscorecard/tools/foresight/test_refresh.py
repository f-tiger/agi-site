import datetime as dt
import unittest
from refresh import parse_feed, refresh, safe_url, UTC

NOW=dt.datetime(2026,10,3,8,tzinfo=UTC)
SOURCE={'id':'test','name':'Publisher','feed':'https://example.com/feed','home':'https://example.com','language':'en','category':'interview','aiFocused':False}
def feed(items): return ('<rss><channel>'+items+'</channel></rss>').encode()
def item(title='AI agents in everyday work',date='Fri, 02 Oct 2026 10:00:00 GMT',link='https://example.com/episode?utm_source=rss',extra=''):
    return f'<item><title>{title}</title><link>{link}</link><pubDate>{date}</pubDate>{extra}</item>'

class DiscoveryTests(unittest.TestCase):
    def test_publication_is_not_update_or_discovery_time(self):
        data=feed(item(extra='<updated>2026-10-03T08:00:00Z</updated>')+item('AI future','Sun, 04 Oct 2026 10:00:00 GMT')+item('AI undated',''))
        rows=parse_feed(data,SOURCE,NOW)
        self.assertEqual(len(rows),1); self.assertEqual(rows[0]['publishedAt'],'2026-10-02T10:00:00Z')
        self.assertEqual(rows[0]['url'],'https://example.com/episode')
        self.assertEqual(parse_feed(feed(item('Medieval history')),SOURCE,NOW),[])

    def test_partial_failure_preserves_content_and_success_date(self):
        source2={**SOURCE,'id':'other'}
        first=refresh([SOURCE,source2],{},lambda s:feed(item(link='https://example.com/'+s['id'])),NOW)
        def fail_one(s):
            if s['id']=='test': raise TimeoutError('private diagnostic not published')
            return feed(item(link='https://example.com/other'))
        next_day=refresh([SOURCE,source2],first,fail_one,NOW+dt.timedelta(days=1))
        failed=next(x for x in next_day['sources'] if x['id']=='test')
        self.assertEqual(next_day['status'],'partial');self.assertEqual(failed['lastSuccessAt'],first['checkedAt'])
        self.assertEqual(failed['errorCode'],'TimeoutError');self.assertNotIn('private',str(next_day))
        self.assertEqual(first['items'],next_day['items'])

    def test_dedup_and_safe_feed_boundaries(self):
        result=refresh([SOURCE,{**SOURCE,'id':'other'}],{},lambda s:feed(item()),NOW)
        self.assertEqual(len(result['items']),1)
        for u in ['javascript:alert(1)','http://example.com','https://user:pass@example.com','https://127.0.0.1/x']:
            self.assertIsNone(safe_url(u))
        for value in [b'<html>Error</html>',b'<!DOCTYPE rss [<!ENTITY x "x">]><rss/>',b'<rss><channel/></rss>']:
            with self.assertRaises(ValueError):parse_feed(value,SOURCE,NOW)

    def test_atom_video_has_its_own_published_time(self):
        atom=b'<feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><title>AI explained</title><yt:videoId>abcdefghijk</yt:videoId><link rel="alternate" href="https://www.youtube.com/watch?v=abcdefghijk"/><published>2026-10-01T20:00:00+00:00</published><updated>2026-10-03T01:00:00Z</updated></entry></feed>'
        row=parse_feed(atom,SOURCE,NOW)[0]
        self.assertEqual(row['medium'],'video');self.assertEqual(row['publishedAt'],'2026-10-01T20:00:00Z')

if __name__=='__main__':unittest.main()
