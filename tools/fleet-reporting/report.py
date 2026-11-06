#!/usr/bin/env python3
"""Private fleet report inputs, using Google directly and the cached D1 reader."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

from collect import collect, private_path, write_json
from google_ga4 import collect_ga4, comparison, METRICS


def cell(value):
    return str(value).replace('|', '\\|').replace('\n', ' ')


def row_for(report, **match):
    if report.get('status') != 'success':
        return None
    rows = [row for row in report.get('rows', []) if all(row.get(k) == v for k, v in match.items())]
    # Ambiguous rows cannot be added: active users are non-additive.
    return rows[0] if len(rows) == 1 else None


def pair(previous, current, metric):
    a, b = (previous or {}).get(metric), (current or {}).get(metric)
    if a is None or b is None:
        return f'{a if a is not None else "未知"} → {b if b is not None else "未知"}'
    delta = comparison(b, a)
    change = ('新增，比例不可计算' if b else '基数为0，比例不可计算') if a == 0 else f'{delta["percent"]:+.1f}%'
    return f'{a} → {b}（{b-a:+d}；{change}）'


def render_ga4(data):
    read = dt.datetime.fromisoformat(data['read_started_utc'].replace('Z', '+00:00')).astimezone(ZoneInfo('Asia/Shanghai'))
    good = sum(p['status'] == 'success' for p in data['properties'].values())
    lines = [f'北京时间读取：{read:%Y-%m-%d %H:%M:%S}。GA4 来源：Google 官方 Admin/Data API。',
        f'完整读取 {good}/{len(data["properties"])} 个属性。源生成时间、Google 内部缓存年龄未返回；各请求抓取时间保存在私有 JSON。',
        '昨天/前天按各属性时区；日历结束不代表处理完毕。缺失行记未知，小样本不外推；不跨站汇总去重人数。', '',
        '| 站点/别名 | 属性时区、前天→昨天 | 活跃用户 | 会话 | PV | 互动会话 | 状态 |',
        '|---|---|---|---|---|---|---|']
    for site in data['sites']:
        dates = site.get('dates') or {}
        report = site.get('reports', {}).get('daily', {})
        earlier = row_for(report, date=dates.get('previous_day', '').replace('-', ''))
        yesterday = row_for(report, date=dates.get('yesterday', '').replace('-', ''))
        label = site['hostname'] + (site.get('path_prefix') or '')
        scope = f'{site.get("timezone") or "未知"} {dates.get("previous_day", "未知")}→{dates.get("yesterday", "未知")}'
        lines.append('| ' + ' | '.join(map(cell, [label, scope, *[pair(earlier, yesterday, m) for m in METRICS], site.get('error') or site['status']])) + ' |')
    lines += ['', '最近完整7日与前7日（各窗口活跃用户由 Google 单独去重）：', '',
        '| 站点 | 前7日 → 最近7日 | 活跃用户 | 会话 | PV | 互动会话 |', '|---|---|---|---|---|---|']
    for site in data['sites']:
        report = site.get('reports', {}).get('weekly', {})
        dates = site.get('dates') or {}
        old, new = dates.get('previous7', {}), dates.get('last7', {})
        label = f'{old.get("startDate", "未知")}～{old.get("endDate", "未知")} → {new.get("startDate", "未知")}～{new.get("endDate", "未知")}'
        lines.append('| ' + ' | '.join(map(cell, [site['hostname'] + (site.get('path_prefix') or ''), label,
            *[pair(row_for(report, dateRange='previous7'), row_for(report, dateRange='last7'), m) for m in METRICS]])) + ' |')
    lines += ['', '今天局部数据（属性时区；不参与完整日环比）：', '', '| 站点 | 日期 | 活跃用户 / 会话 / PV / 互动会话 |', '|---|---|---|']
    for site in data['sites']:
        date = (site.get('dates') or {}).get('today_partial')
        report = site.get('reports', {}).get('daily', {})
        row = row_for(report, date=(date or '').replace('-', '')) or {}
        lines.append('| ' + ' | '.join(map(cell, [site['hostname'] + (site.get('path_prefix') or ''), date or '未知', ' / '.join(str(row.get(m, '未知')) for m in METRICS)])) + ' |')
    warnings = []
    for pid, prop in data['properties'].items():
        reports = list(prop.get('reports', {}).items())
        reports += [(scope + '/' + name, value) for scope, group in prop.get('path_reports', {}).items() for name, value in group.items()]
        for name, value in reports:
            flags = set()
            for page in value.get('pages', []):
                meta = page.get('metadata', {})
                flags.update(k for k in ('subjectToThresholding', 'samplingMetadatas', 'dataLossFromOtherRow', 'schemaRestrictionResponse') if meta.get(k))
            if flags:
                warnings.append(f'{pid}/{name}：' + '、'.join(sorted(flags)))
    if warnings:
        lines += ['', 'Google 数据质量提示：' + '；'.join(warnings) + '。受权限限制的指标已记为未知。']
    lines += ['', '事件原名及逐日次数在 ga4.json 的各站 reports.events 中；示例、导航、工具完成、导出、注册入口和购买必须分开解释。事件不是人数，购买事件也不是确认收入。',
        '每份报表的 pages.metadata 保留抽样、阈值和数据损失提示；发现 subjectToThresholding、samplingMetadatas 或 dataLossFromOtherRow 时必须在最终日报注明。',
        '本文件是 GA4 对比底表。D1 的 snapshot.json/coverage.json 按 UTC 日明细另作业务对比，滚动数另列，不能拼成同日漏斗。',
        '前14日逐日历史保留在私有 JSON，可在昨天仍缺失时列出较早已收录日期，不能将其改称昨天。',
        f'未映射的新 hostname：{len(data.get("observed_unmapped", []))}；详见 ga4.json，禁止丢弃或分摊到主站。', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/fleet-reporting-cache'))
    parser.add_argument('--manifest', type=Path, default=Path(__file__).with_name('manifest.json'))
    parser.add_argument('--ga4-only', action='store_true', help='Reuse previously collected D1; make no aggregate GET requests')
    args = parser.parse_args()
    output, cache = private_path(args.output), private_path(args.cache_dir)
    manifest = json.loads(args.manifest.read_text())
    ga4 = collect_ga4(manifest)
    write_json(output / 'ga4.json', ga4)
    if not args.ga4_only:
        snapshot, coverage = collect(manifest, cache)
        write_json(output / 'snapshot.json', snapshot)
        write_json(output / 'coverage.json', coverage)
    content = render_ga4(ga4)
    fd = os.open(output / 'ga4-report.md', os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as handle:
        handle.write(content)
    # Only configuration/access statuses go to stdout. Never print analytics in public CI logs.
    print(json.dumps({'provider': ga4['provider'], 'properties': {pid: p['status'] for pid, p in ga4['properties'].items()},
        'site_rows': len(ga4['sites']), 'private_output_written': True, 'd1_requested': not args.ga4_only}))
    return 0 if all(p['status'] == 'success' for p in ga4['properties'].values()) else 2


if __name__ == '__main__':
    raise SystemExit(main())
