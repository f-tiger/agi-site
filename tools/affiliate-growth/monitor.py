#!/usr/bin/env python3
"""ECO private $1 -> $10 -> $100 scorecard; merchant evidence is never inferred."""
import argparse
import csv
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import html
import importlib.util
import io
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
URL = 'https://getecoback.com/api/trend'


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


collector = module('fleet_collector', ROOT / 'tools/fleet-reporting/collect.py')
economics = module('affiliate_economics', ROOT / 'sites/getecoback/tools/affiliate_growth.py')


def iso(value):
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value:
        raise ValueError('Use ISO calendar dates')
    return parsed


def number(value):
    if isinstance(value, bool):
        raise ValueError('Boolean is not money')
    try:
        result = Decimal(str(value))
    except InvalidOperation as exc:
        raise ValueError('Invalid money') from exc
    if not result.is_finite():
        raise ValueError('Money must be finite')
    return result


def count(value):
    if type(value) is not int or value < 0:
        raise ValueError('Event counts must be nonnegative integers')
    return value


def traffic(snapshot, as_of):
    """Never turn a failed query, missing date, or stale response into zero."""
    result = {'status': 'unknown', 'reason': 'source_unavailable', 'daily': [], 'weeks': []}
    if not isinstance(snapshot, dict):
        return result
    if 'body' in snapshot:
        result['fetch'] = {k: snapshot.get(k) for k in
                           ('url', 'fetch_finished_utc', 'http_status', 'headers', 'source_generated', 'local_cache')}
        if snapshot.get('status') != 'success':
            return result
        snapshot = snapshot['body']
    audit = snapshot.get('affiliate_audit') if isinstance(snapshot, dict) else None
    if not isinstance(audit, dict):
        return result
    try:
        end = iso(audit['end_exclusive'])
        start = iso(audit['start'])
        if (end - start).days != 56 or audit.get('timezone') != 'UTC':
            raise ValueError('Expected 56 complete UTC dates')
        rows = audit['daily']
        expected = [(start + timedelta(days=i)).isoformat() for i in range(56)]
        if len(rows) != 56 or sorted(r['day'] for r in rows) != expected:
            raise ValueError('Incomplete or duplicate daily rows')
        clean = []
        for r in sorted(rows, key=lambda r: r['day']):
            if type(r.get('known_collection_gap')) is not bool:
                raise ValueError('Collection-gap flag missing')
            clean.append({'day': r['day'], 'page_views': count(r['page_views']),
                          'affiliate_clicks': count(r['affiliate_clicks']),
                          'known_collection_gap': r['known_collection_gap']})
        weeks = audit['weeks']
        if len(weeks) != 8:
            raise ValueError('Eight aligned weeks required')
        allowed = ('cohorts', 'channels', 'destinations', 'surfaces')
        clean_weeks = []
        for i, w in enumerate(weeks):
            if w['start'] != expected[i * 7] or iso(w['end_exclusive']) != start + timedelta(days=(i + 1) * 7):
                raise ValueError('Weekly window mismatch')
            for key in ('page_views', 'affiliate_clicks'):
                if count(w[key]) != sum(r[key] for r in clean[i * 7:i * 7 + 7]):
                    raise ValueError('Daily and weekly counts disagree')
            cw = {k: w[k] for k in ('start', 'end_exclusive', 'page_views', 'affiliate_clicks')}
            for dimension in allowed:
                groups = w.get(dimension, {})
                for counts in groups.values():
                    if isinstance(counts, dict):
                        count(counts['page_views']); count(counts['affiliate_clicks'])
                    else:
                        count(counts)
                if dimension in ('cohorts', 'channels'):
                    for key in ('page_views', 'affiliate_clicks'):
                        if sum(v[key] for v in groups.values()) != w[key]:
                            raise ValueError('Incomplete breakdown')
                elif sum(groups.values()) != w['affiliate_clicks']:
                    raise ValueError('Incomplete click breakdown')
                cw[dimension] = groups
            clean_weeks.append(cw)
        result.update(status='current' if end == as_of else 'stale', reason=None,
                      start=str(start), end_exclusive=str(end), daily=clean, weeks=clean_weeks)
        for label, selected in [('last_30d', clean[-30:]), ('last_28d', clean[-28:]),
                                ('previous_28d', clean[:28]), ('last_7d', clean[-7:]),
                                ('previous_7d', clean[-14:-7])]:
            pv = sum(r['page_views'] for r in selected)
            clicks = sum(r['affiliate_clicks'] for r in selected)
            result[label] = {'start': selected[0]['day'], 'end_exclusive': str(iso(selected[-1]['day']) + timedelta(days=1)),
                             'page_views': pv, 'affiliate_clicks': clicks,
                             'click_events_per_page_view': clicks / pv if pv else None,
                             'known_gap_days': [r['day'] for r in selected if r['known_collection_gap']]}
        result['note'] = 'Human/legacy-UA recorded events, not unique people. Event ratios are not conversion rates. Channels are event referrers, not acquired sessions. No country breakdown; cohorts include multiple languages. Known gaps are not an exhaustive uptime audit.'
    except (KeyError, TypeError, ValueError) as exc:
        result.update(status='invalid', reason=str(exc), daily=[], weeks=[])
    return result


def revenue(envelope, as_of):
    """One non-overlapping merchant snapshot per market, never sum rolling snapshots."""
    start, end = as_of - timedelta(days=30), as_of - timedelta(days=1)
    result = {'status': 'unknown', 'period_start': str(start), 'period_end': str(end),
              'site_net_usd': None, 'cash_received_usd': None, 'markets': [], 'blockers': []}
    reports = (envelope or {}).get('reports', [])
    seen = set()
    net_total, cash_total = Decimal(0), Decimal(0)
    cash_complete = True
    for report in reports:
        market = report.get('market')
        if market not in ('DE', 'US') or market in seen:
            raise ValueError('Exactly one current report per market; do not add overlapping snapshots')
        seen.add(market)
        row = economics.observed(report)
        issues = []
        for field in ('store_id', 'tracking_id', 'timezone', 'evidence_ref', 'scope_evidence_ref'):
            if not report.get(field):
                issues.append('missing_' + field)
        if report.get('timezone'):
            ZoneInfo(report['timezone'])
        if report.get('period_start') != str(start) or report.get('period_end') != str(end):
            issues.append('not_current_30_complete_dates')
        if report.get('tracking_scope') != 'exclusive_site' or report.get('site_host') != 'getecoback.com':
            issues.append('shared_or_unknown_site_attribution')
        # Known fleet-wide tags cannot become exclusive by changing a checkbox.
        if report.get('tracking_id') in ('getecoback-21', 'ecoback0d-20'):
            issues.append('known_shared_tag')
        if report.get('statement_status') != 'confirmed_net' or report.get('net_commission') is None:
            issues.append('net_commission_not_confirmed')
        if report.get('currency') != {'DE': 'EUR', 'US': 'USD'}[market]:
            issues.append('unexpected_currency')
        rate = Decimal(1) if report.get('currency') == 'USD' else None
        if rate is None:
            fx = report.get('fx_to_usd') or {}
            if fx.get('date') != str(end) or not fx.get('source') or fx.get('rate') is None:
                issues.append('missing_dated_fx')
            else:
                rate = number(fx['rate'])
                if rate <= 0:
                    raise ValueError('FX must be positive')
        cash = report.get('cash_received')
        if cash is not None:
            cash = number(cash)
        if issues:
            result['blockers'].extend(market + ':' + x for x in issues)
        else:
            net_total += number(report['net_commission']) * rate
            if cash is None:
                cash_complete = False
            else:
                cash_total += cash * rate
        row.update(tracking_id=report.get('tracking_id'), attribution=report.get('tracking_scope'),
                   evidence_ref=report.get('evidence_ref'), cash_received=float(cash) if cash is not None else None,
                   issues=issues)
        result['markets'].append(row)
    for market in sorted({'DE', 'US'} - seen):
        result['blockers'].append(market + ':missing_report')
    if not result['blockers']:
        result.update(status='evidence_supplied', site_net_usd=float(net_total),
                      cash_received_usd=float(cash_total) if cash_complete else None)
    result['milestones'] = [{'target_usd': target,
                            'status': 'unknown' if result['site_net_usd'] is None else
                            ('met' if net_total >= target else 'not_yet'),
                            'remaining_usd': None if result['site_net_usd'] is None else float(max(Decimal(0), Decimal(target) - net_total))}
                           for target in (1, 10, 100)]
    result['note'] = 'Manual merchant evidence, not API-verified. Confirmed net commissions after reversals; before operating costs. Cash is separate, not added to revenue. Shared tags remain account-only. FX uses a documented period-end valuation; store timezones remain separate. Overlapping reports are never cumulative earnings.'
    return result


def render(report):
    e = lambda v: html.escape(str(v), quote=True)
    t, r = report['traffic'], report['revenue']
    value = '待核验' if r['site_net_usd'] is None else '$' + format(r['site_net_usd'], '.2f')
    cards = ''.join(f'<article><h3>${m["target_usd"]}</h3><p>{e({"unknown":"缺商家证据", "met":"本窗口已达到", "not_yet":"尚未达到"}[m["status"]])}</p></article>' for m in r['milestones'])
    week_rows = ''.join(f'<tr><td>{e(w["start"])}</td><td>{w["page_views"]}</td><td>{w["affiliate_clicks"]}</td><td><meter min="0" max="{max([x["affiliate_clicks"] for x in t["weeks"]] or [1]) or 1}" value="{w["affiliate_clicks"]}"></meter></td></tr>' for w in t['weeks'])
    markets = ''.join(f'<tr><td>{e(m["market"])}</td><td>{e(m["period_start"])}—{e(m["period_end"])}</td><td>{e(m["currency"])} {e(m["net_commission"])}</td><td>{e(", ".join(m["issues"]) or "evidence supplied")}</td></tr>' for m in r['markets'])
    scenarios = ''.join(f'<tr><td>${s["target_usd"]}</td><td>{s["required_monthly_visits"]}</td><td>{s["required_merchant_clicks"]}</td><td>{s["required_orders"]}</td></tr>' for s in report['scenarios'])
    actions = ''.join(f'<li><strong>{e(x["title"])}</strong> · {e(x["status"])}<p>{e(x["action"])}</p><p>复查：{e(x["review"])}；判定：{e(x["gate"])}</p></li>' for x in report['operations']['experiments'])
    recent = t.get('last_30d', {})
    observed = f"{recent.get('page_views', '未知')} 次浏览事件 / {recent.get('affiliate_clicks', '未知')} 次联盟点击事件"
    return f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ECO · $100 收入进度</title>
<style>body{{font:17px/1.6 system-ui,sans-serif;max-width:1080px;margin:40px auto;padding:0 24px;background:#f5f4ed;color:#183b34}}h1{{font-size:36px;line-height:1.2}}h2{{margin-top:2em}}.cards{{display:flex;gap:16px;flex-wrap:wrap}}article{{background:white;padding:20px;flex:1;border-top:4px solid #285c4b}}article h3{{margin:0;font-size:30px}}table{{border-collapse:collapse;width:100%;background:white}}td,th{{padding:10px;text-align:left;border-bottom:1px solid #ddd}}.scroll{{overflow:auto}}.small{{font-size:14px;color:#536b62}}li{{margin:20px 0}}meter{{width:100%}}</style>
<p class="small">PRIVATE · 仅本地报告 · {e(report['as_of'])} · 非实时自动刷新</p><h1>从可核验的 $1 到每月 $100</h1><p>近 30 个完整报告日的 ECO 净佣金：<strong>{value}</strong>。到账与成本另列；历史佣金不冒充当前收入。</p><div class="cards">{cards}</div>
<h2>数据健康</h2><p>第一方流量：{e(t['status'])}；收入：{e(r['status'])}。</p><p>{e('; '.join(r['blockers']))}</p><p class="small">{e(t.get('note', t.get('reason')))}</p>
<h2>真实记录的每周变化</h2><p>源数据最后 30 个完整 UTC 日：{e(observed)}。{e(recent.get('start',''))} 至 {e(recent.get('end_exclusive',''))}（不含末日）；状态：{e(t['status'])}。</p><div class="scroll"><table><tr><th>UTC 周起点</th><th>浏览事件</th><th>联盟点击事件</th><th>点击量</th></tr>{week_rows}</table></div><p class="small">每周 7 个完整 UTC 日。不是用户数、订单数或佣金；不从点击推算收入。</p>
<h2>商家证据与归因</h2><div class="scroll"><table><tr><th>市场</th><th>报告窗</th><th>报告净佣金</th><th>限制</th></tr>{markets}</table></div><p>{e(r['note'])}</p>
<h2>达到目标需要什么（假设，不是预测）</h2><p>统一演算：合格访问→商家点击 25%，商家点击→订单 5%，每单净佣金 $8。当前 ECO 尚未验证这些假设。</p><table><tr><th>目标</th><th>合格访问/月</th><th>商家点击/月</th><th>订单约数</th></tr>{scenarios}</table><p>低收益情景：20% × 3% × $4，$100 需要约 4,170 次合格访问；不可拿站内浏览事件替换此分母。</p>
<h2>经营行动与复查</h2><ol>{actions}</ol><h2>已知缺口</h2><p>{e('；'.join(report['operations']['blockers']))}</p><p class="small">无外部脚本、无埋点、无上传。重跑 monitor.py 更新；每日状态检查不等于佣金自动入账。</p></html>'''


def write_text(path, content):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix(path.suffix + '.tmp')
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w') as f:
        f.write(content)
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--fetch', action='store_true')
    inputs.add_argument('--snapshot', type=Path)
    parser.add_argument('--merchant', type=Path)
    parser.add_argument('--out', type=Path, required=True, help='Private directory OUTSIDE every Git worktree')
    parser.add_argument('--as-of', type=iso, default=datetime.now(timezone.utc).date())
    parser.add_argument('--health-only', action='store_true', help='Print status only; never print counts or merchant data')
    args = parser.parse_args()
    if args.health_only and args.merchant:
        parser.error('Public health checks must not read merchant evidence')
    out = collector.private_path(args.out)
    snapshot = collector.cached_fetch(URL, out / 'cache') if args.fetch else json.loads(args.snapshot.read_text())
    t = traffic(snapshot, args.as_of)
    if args.health_only:
        print(json.dumps({'traffic_source_status': t['status'], 'merchant_source_status': 'not_connected',
                          'revenue_milestones': 'unknown'}, ensure_ascii=False))
        return 0 if t['status'] == 'current' else 2
    merchant = json.loads(collector.private_path(args.merchant).read_text()) if args.merchant else None
    r = revenue(merchant, args.as_of)
    ops = json.loads((Path(__file__).parent / 'operations.json').read_text())
    report = {'as_of': str(args.as_of), 'generated_at': collector.utc(), 'traffic': t, 'revenue': r,
              'scenarios': [economics.scenario(n, .25, .05, 8) for n in (1, 10, 100)], 'operations': ops}
    collector.write_json(out / 'report.json', report)
    collector.write_json(out / 'history' / (str(args.as_of) + '.json'), report)
    write_text(out / 'dashboard.html', render(report))
    rows = io.StringIO()
    writer = csv.DictWriter(rows, fieldnames=['day', 'page_views', 'affiliate_clicks', 'known_collection_gap'])
    writer.writeheader(); writer.writerows(t['daily'])
    write_text(out / 'daily.csv', rows.getvalue())
    print('Private dashboard, report, dated history and daily CSV written. No revenue inferred.')
    return 0 if t['status'] == 'current' else 2


if __name__ == '__main__':
    raise SystemExit(main())
