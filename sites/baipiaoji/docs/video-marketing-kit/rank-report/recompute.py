#!/usr/bin/env python3
"""Recompute seven archived daily TOP100 observations from pinned Git blobs.

Run inside a full agi-site Git checkout: python3 path/to/recompute.py --output /tmp/rank-full.json
No network access, scraping, site mutation, or analytics calls.
"""
import argparse
import collections
import csv
import datetime
import hashlib
import json
import pathlib
import subprocess
import urllib.parse

REVISIONS = [
    '3e35bf939ca11ea9f9acb65f66f93e9db8e48441',
    'b857e1a41f5cd82b3e18ee4d0c64805775b1cc8e',
    'd174d12f49dc84449972d2f98ad182e172fcd1ed',
    'b5de7dc7babd056b512baf7ae368a98005f58c29',
    'c9cf2ce4302931fb071e91794e51dcd8f664b466',
    'e67af2ff15020964d9d408df121288706b2a3c46',
    '5ace1cdfbe98b9fe0f1fd6793441b9c4091bff7b',
]
SOURCE_PATH = 'sites/baipiaoji/data/manju-insights.json'

def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])

def sid(row):
    parsed = urllib.parse.urlparse(row['url'])
    assert parsed.scheme == 'https' and parsed.netloc == 'hongguoduanju.com'
    value = urllib.parse.parse_qs(parsed.query)['series_id'][0]
    assert value.isdigit()
    return value

def compare(before, after):
    a = {r['seriesId']: r for r in before}
    b = {r['seriesId']: r for r in after}
    common = a.keys() & b.keys()
    movements = [{
        'seriesId': k, 'title': b[k]['title'], 'url': b[k]['url'],
        'beforeRank': a[k]['sourceRank'], 'afterRank': b[k]['sourceRank'],
        'rankImprovement': a[k]['sourceRank'] - b[k]['sourceRank'],
    } for k in common]
    movements.sort(key=lambda r: (-r['rankImprovement'], r['afterRank'], r['seriesId']))
    return {
        'enteredObservedTop100': sorted((b[k] for k in b.keys() - a.keys()), key=lambda r:r['sourceRank']),
        'absentFromLaterObservedTop100': sorted((a[k] for k in a.keys() - b.keys()), key=lambda r:r['sourceRank']),
        'retainedCount': len(common),
        'improvedCount': sum(r['rankImprovement'] > 0 for r in movements),
        'declinedCount': sum(r['rankImprovement'] < 0 for r in movements),
        'unchangedCount': sum(r['rankImprovement'] == 0 for r in movements),
        'rankMovements': movements,
    }

def compute(repo):
    cohorts = collections.defaultdict(list)
    sources = []
    for index, commit in enumerate(REVISIONS):
        raw = git(repo, 'show', f'{commit}:{SOURCE_PATH}')
        d = json.loads(raw)
        expected_date = (datetime.date(2026, 10, 5) + datetime.timedelta(days=index)).isoformat()
        source = {
            'commit': commit, 'path': SOURCE_PATH,
            'gitBlob': git(repo, 'rev-parse', f'{commit}:{SOURCE_PATH}').decode().strip(),
            'sha256': hashlib.sha256(raw).hexdigest(),
            'permalink': f'https://github.com/f-tiger/agi-site/blob/{commit}/{SOURCE_PATH}',
        }
        sources.append(source)
        for c in d['cohorts']:
            if c['metric'] != 'snapshot_heat':
                continue
            kind = 'ai-drama' if 'ai-drama' in c['id'] else 'comic-drama'
            report = next(r for r in d['reports'] if r['id'] == c['reportId'])
            assert report['observedAt'] == expected_date
            assert report['checkedAtTime'][:10] == expected_date
            records = c['records']
            assert len(records) == 100
            assert [r['sourceRank'] for r in records] == list(range(1, 101))
            assert len({sid(r) for r in records}) == 100
            assert all(isinstance(r['value'], int) and r['value'] > 0 for r in records)
            assert all(round(float(r['displayValue'].removesuffix('万')) * 10000) == r['value'] for r in records)
            pages = c['sourcePages']
            assert len(pages) == 5 and len({p['url'] for p in pages}) == 5
            assert all(len(p['sha256']) == 64 for p in pages)
            page_counts = collections.Counter(r['thumbnail']['source'] for r in records)
            assert sorted(page_counts.values()) == [20] * 5
            assert set(page_counts) == {p['url'] for p in pages}
            rows = [{
                'seriesId': sid(r), 'title': r['title'], 'url': r['url'],
                'sourceRank': r['sourceRank'], 'value': r['value'],
                'displayValue': r['displayValue'], 'tags': r['tags'],
            } for r in records]
            tag_counts = collections.Counter(t for r in rows for t in set(r['tags']))
            cohorts[kind].append({
                'id': c['id'], 'metric': c['metric'], 'unit': c['unit'],
                'sourceUrl': report['url'], 'observedAt': report['observedAt'],
                'checkedAtTime': report['checkedAtTime'], 'commit': commit,
                'sourceBlobSha256': source['sha256'], 'sourcePages': pages,
                'coverage': {'rows': 100, 'uniqueSeriesIds': 100, 'pages': 5, 'rowsPerSourcePage': dict(page_counts)},
                'tagCounts': sorted(tag_counts.items(), key=lambda pair:(-pair[1],pair[0])),
                'rows': rows,
            })
    summaries = {}
    for kind, days in cohorts.items():
        assert len(days) == 7
        sets = [{r['seriesId'] for r in day['rows']} for day in days]
        comparison = compare(days[0]['rows'], days[-1]['rows'])
        summaries[kind] = {
            'observationCount': 7,
            'distinctSeriesIdsAcrossObservedSnapshots': len(set.union(*sets)),
            'presentInAllSevenSnapshotsCount': len(set.intersection(*sets)),
            'endpointComparison': comparison,
            'dailyPairs': [{
                'from': a['observedAt'], 'to': b['observedAt'],
                **{k:v for k,v in compare(a['rows'], b['rows']).items() if k != 'rankMovements'},
            } for a,b in zip(days, days[1:])],
        }
    result = {
        'schemaVersion': 1,
        'title': '红果 AI 剧与漫剧 TOP100：2026-10-05 至 2026-10-11 七次日快照观察',
        'status': 'research_sample_not_published',
        'metric': 'snapshot_heat', 'unit': '热度值',
        'identity': 'series_id; separate seasons remain separate records',
        'method': {
            'inclusion': 'Two fixed official site ranking categories, pages 1–5, source ranks 1–100; one archived successful observation per date.',
            'rankImprovement': 'sourceRank at first observation minus sourceRank at last observation, only for series_id in both.',
            'enteredObservedTop100': 'Present in later chosen TOP100 snapshot and absent in earlier chosen TOP100 snapshot; does not mean new release or first ever appearance.',
            'absentFromLaterObservedTop100': 'Present in earlier chosen snapshot, absent in later; does not establish platform delisting.',
            'tagCounts': 'Count each unique source tag at most once per row; one row can contribute to multiple tags.',
            'hashes': 'Pinned Git blob SHA256 validates reproducibility of the stored file. Historical page SHA256 values are stored collection evidence, not an independent capture or proof of platform metrics accuracy.',
        },
        'limitations': [
            'The source describes a composite heat metric; it is not plays, viewers, revenue, monthly growth, or market share.',
            'One chosen observation per calendar date, at differing collection times; no intraday record, equal-interval assumption, or continuous seven-day ranking claim.',
            'A work may leave and return between observations. Rank changes describe sampled list positions, not audience growth or causation.',
            'The 100-row samples are platform-defined lists, not all released dramas. AI classification is the source classification, not an independent production audit.',
            'Source pages are now live; pinned archived metadata supports recomputation, but original historical HTML was not independently recovered.',
            'Heat algorithms and measurement windows are not fully disclosed. No cross-platform heat normalization or historical backfill is performed.',
        ],
        'sources': sources,
        'summaries': summaries,
        'observations': dict(cohorts),
    }
    return result

def condensed(result):
    totals = {}
    observations = []
    tags = []
    for kind, days in result['observations'].items():
        summary = result['summaries'][kind]
        end = summary['endpointComparison']
        totals[kind] = {
            'observationCount': len(days),
            'rowsPerObservation': 100,
            'distinctSeriesIdsAcrossObservedSnapshots': summary['distinctSeriesIdsAcrossObservedSnapshots'],
            'presentInAllSevenSnapshotsCount': summary['presentInAllSevenSnapshotsCount'],
            'endpoint': {
                'from': days[0]['observedAt'], 'to': days[-1]['observedAt'],
                'common': end['retainedCount'],
                'presentAtEndAbsentAtStart': len(end['enteredObservedTop100']),
                'presentAtStartAbsentAtEnd': len(end['absentFromLaterObservedTop100']),
                'improvedAmongCommon': end['improvedCount'],
                'declinedAmongCommon': end['declinedCount'],
                'unchangedAmongCommon': end['unchangedCount'],
            },
        }
        for day in days:
            change = compare(days[0]['rows'], day['rows'])
            observations.append({
                'cohort': kind, 'observedAt': day['observedAt'],
                'checkedAtTimeUTC': day['checkedAtTime'],
                'checkedAtTimeBeijing': datetime.datetime.fromisoformat(day['checkedAtTime']).astimezone(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
                'rows': len(day['rows']), 'uniqueSeriesIds': day['coverage']['uniqueSeriesIds'],
                'sourcePages': day['coverage']['pages'],
                'commonWithOctober5': change['retainedCount'],
                'presentTodayAbsentOctober5': len(change['enteredObservedTop100']),
                'presentOctober5AbsentToday': len(change['absentFromLaterObservedTop100']),
                'improvedAmongCommon': change['improvedCount'],
                'declinedAmongCommon': change['declinedCount'],
                'unchangedAmongCommon': change['unchangedCount'],
                'metric': day['metric'], 'unit': day['unit'],
                'commit': day['commit'], 'sourceBlobSha256': day['sourceBlobSha256'],
            })
            for tag, count in day['tagCounts']:
                tags.append({'cohort':kind,'observedAt':day['observedAt'],'tag':tag,'count':count,'denominator':100})
    summary = {
        'schemaVersion': 1,
        'title': result['title'], 'author': '帧选',
        'authorship': 'first_party_analysis_not_independent_testimonial',
        'externalAdoptionVerified': False,
        'scope': '2026-10-05 through 2026-10-11; one archived successful observation per date per ranking category',
        'identity': result['identity'], 'metric': result['metric'], 'unit': result['unit'],
        'totals': totals, 'observations': observations,
        'sources': result['sources'], 'method': result['method'],
        'limitations': result['limitations'],
        'originalRankingUrls': ['https://hongguoduanju.com/rank/hot-ai-drama','https://hongguoduanju.com/rank/hot-comic-drama'],
        'historicalPageHashes': [{
            'cohort': kind, 'observedAt': day['observedAt'],
            'sourcePages': day['sourcePages'],
        } for kind, days in result['observations'].items() for day in days],
    }
    return summary, observations, tags

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def write_csv(path, rows):
    with path.open('w', newline='', encoding='utf-8-sig') as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0]), lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=pathlib.Path, help='Git checkout path; default: Git root of current working directory')
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('rank-observation-full.json'), help='Complete reproducible working data; not necessary to publish')
    parser.add_argument('--summary', type=pathlib.Path, help='Optional compact summary JSON')
    parser.add_argument('--observations', type=pathlib.Path, help='Optional daily observation CSV')
    parser.add_argument('--tags', type=pathlib.Path, help='Optional source-tag count CSV')
    args = parser.parse_args()
    if not __debug__:
        parser.error('Do not use python -O: validation assertions must remain active.')
    try:
        repo = args.repo or pathlib.Path(subprocess.check_output(['git','rev-parse','--show-toplevel'], text=True).strip())
        result = compute(repo)
    except subprocess.CalledProcessError:
        parser.error('A complete agi-site Git checkout containing the pinned commits is required; pass --repo PATH. ZIP downloads and shallow clones may lack history.')
    summary, observations, tags = condensed(result)
    write_json(args.output, result)
    if args.summary:
        write_json(args.summary, summary)
    if args.observations:
        write_csv(args.observations, observations)
    if args.tags:
        write_csv(args.tags, tags)
    print(json.dumps({'output':str(args.output),'sha256':hashlib.sha256(args.output.read_bytes()).hexdigest(),'observationRows':len(observations),'tagRows':len(tags),'totals':summary['totals']},ensure_ascii=False))
