import datetime as dt
import unittest
from refresh import parse_feed, refresh, safe_url, excerpt, UTC, RETENTION_DAYS

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

    def test_audio_links_and_short_attributed_excerpts(self):
        words=' '.join('word'+str(n) for n in range(40))
        row=parse_feed(feed(item(extra='<description>'+words+'</description><enclosure type="audio/mpeg" url="https://example.com/audio.mp3"/>')),SOURCE,NOW)[0]
        self.assertEqual(row['medium'],'audio');self.assertEqual(row['audioUrl'],'https://example.com/audio.mp3')
        self.assertLessEqual(len(row['publisherExcerpt'].split()),24)
        self.assertNotIn('<b>',excerpt('<b>AI helps</b> https://example.com'))

    def test_successful_refresh_accumulates_when_feed_rolls_over(self):
        first=refresh([SOURCE],{},lambda s:feed(item(link='https://example.com/old')),NOW)
        second=refresh([SOURCE],first,lambda s:feed(item(link='https://example.com/new')),NOW+dt.timedelta(days=1))
        self.assertEqual(len(second['items']),2)
        old=next(x for x in second['items'] if x['url'].endswith('/old'))
        self.assertEqual(old['firstSeenAt'],first['checkedAt'])
        self.assertEqual(old['publishedAt'],'2026-10-02T10:00:00Z')
        expired=refresh([SOURCE],second,lambda s:feed(item()),NOW+dt.timedelta(days=RETENTION_DAYS+1))
        self.assertEqual(expired['items'],[])

    def test_video_dedup_and_shorts_exclusion(self):
        rows=refresh([SOURCE],{},lambda s:feed(item(link='https://youtu.be/abcdefghijk')+item(link='https://www.youtube.com/watch?v=abcdefghijk&amp;t=120')+item(link='https://www.youtube.com/shorts/12345678901')),NOW)
        self.assertEqual(len(rows['items']),1)
        self.assertEqual(rows['items'][0]['videoId'],'abcdefghijk')
        self.assertEqual(rows['items'][0]['url'],'https://www.youtube.com/watch?v=abcdefghijk')

    def test_expected_channel_identity_is_checked(self):
        with self.assertRaisesRegex(ValueError,'channel_identity_mismatch'):
            parse_feed(feed(item()),{**SOURCE,'channelId':'UCwrong'},NOW)

    def test_beyond_twelve_items_and_no_network_work_topic(self):
        data=feed(''.join(item(title='AI model network',link=f'https://example.com/{n}') for n in range(50)))
        rows=parse_feed(data,SOURCE,NOW)
        self.assertEqual(len(rows),50)
        self.assertNotIn('work',rows[0]['goals'])
        self.assertIn('understand',rows[0]['goals'])

if __name__=='__main__':unittest.main()
