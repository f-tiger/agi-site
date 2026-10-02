#!/usr/bin/env python3
"""Offline affiliate economics. No credentials, network calls or report uploads.

Use --report /private/path/normalized.json for a same-period, same-store merchant
summary. Never put private exports in this public repository. Missing is unknown,
not zero. Merchant clicks and site click events are intentionally separate.
"""
import argparse
from datetime import date
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import json
import math


def scenario(target, click_rate, order_rate, net_commission):
    values = (target, click_rate, order_rate, net_commission)
    if any(not math.isfinite(v) or v <= 0 for v in values) or click_rate > 1 or order_rate > 1:
        raise ValueError('Positive finite values required; rates must be <= 1')
    clicks = math.ceil(target / (order_rate * net_commission))
    return {'target_usd': target, 'site_to_merchant_rate': click_rate,
            'merchant_click_to_order_rate': order_rate,
            'net_commission_per_order_usd': net_commission,
            'required_monthly_visits': math.ceil(clicks / click_rate),
            'required_merchant_clicks': clicks,
            'required_orders': math.ceil(target / net_commission),
            'evidence': 'illustrative assumptions, not observed performance or a forecast'}


def observed(d):
    for k in ('period_start', 'period_end', 'market', 'currency', 'source'):
        if not d.get(k):
            raise ValueError(f'Missing report provenance: {k}')
    if date.fromisoformat(d['period_start']) > date.fromisoformat(d['period_end']):
        raise ValueError('Report period is reversed')
    fields = ('merchant_clicks', 'ordered_items', 'shipped_items', 'net_commission')
    for k in fields:
        v = d.get(k)
        if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)):
            raise ValueError(f'Invalid numeric field: {k}')
        if k != 'net_commission' and v is not None and (v < 0 or int(v) != v):
            raise ValueError(f'Invalid count: {k}')
    clicks, commission = d.get('merchant_clicks'), d.get('net_commission')
    # Only the merchant's click denominator can produce a merchant EPC.
    epc = commission / clicks if clicks and commission is not None else None
    return {**{k: d[k] for k in ('period_start', 'period_end', 'market', 'currency', 'source')},
            **{k: d.get(k) for k in fields}, 'merchant_epc': epc,
            'status': 'unknown' if commission is None else 'reported',
            'interpretation': 'Same-period aggregate, not user attribution. Items are not orders. Returns and delayed reporting can cross periods. No FX conversion or extrapolation performed.'}


def reconcile(merchant, site):
    """Compare independently exported aggregates; never infer click-level attribution."""
    actual = observed(merchant)
    issues = []
    keys = ('period_start', 'period_end', 'market', 'currency', 'store_id',
            'tracking_id', 'timezone', 'site_host')
    for key in keys:
        if not merchant.get(key) or not site.get(key):
            issues.append('missing_scope:' + key)
        elif merchant[key] != site[key]:
            issues.append('scope_mismatch:' + key)
    for report in (merchant, site):
        if report.get('timezone'):
            try:
                ZoneInfo(report['timezone'])
            except (ZoneInfoNotFoundError, ValueError):
                raise ValueError('Invalid report timezone')
    if not site.get('source'):
        issues.append('missing_site_source')
    if merchant.get('tracking_scope') != 'exclusive_site':
        issues.append('tracking_tag_not_exclusive_to_site')
    if site.get('period_start') and site.get('period_end'):
        if date.fromisoformat(site['period_start']) > date.fromisoformat(site['period_end']):
            raise ValueError('Site report period is reversed')
    count = site.get('affiliate_click_events')
    if count is not None and (isinstance(count, bool) or not isinstance(count, (int, float))
                              or not math.isfinite(count) or count < 0 or int(count) != count):
        raise ValueError('Invalid site click event count')
    if count is None:
        issues.append('missing_site_click_events')
    return {'status': 'not_comparable' if issues else 'aligned_aggregates',
            'issues': issues,
            'scope': {key: merchant.get(key) for key in keys},
            'site_source': site.get('source'), 'merchant_source': actual['source'],
            'site_affiliate_click_events': count,
            'merchant_clicks': actual['merchant_clicks'],
            'ordered_items': actual['ordered_items'], 'shipped_items': actual['shipped_items'],
            'merchant_net_commission': actual['net_commission'],
            'merchant_epc': actual['merchant_epc'],
            'site_net_commission': None if issues else actual['net_commission'],
            'channel_revenue': None,
            'interpretation': 'Alignment relies on the supplied report scope and exclusive-tag declaration. Site events and merchant clicks have different definitions; do not divide commission by site events or treat items as orders. No user, page or marketing-channel attribution is inferred. GA4 consent gaps and merchant reporting delays remain.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--target-usd', type=float, default=1000)
    p.add_argument('--report', help='Private normalized merchant JSON; never committed')
    p.add_argument('--site-report', help='Private normalized site JSON for scoped reconciliation; requires --report')
    args = p.parse_args()
    if args.site_report and not args.report:
        p.error('--site-report requires --report')
    out = {'scenarios': [scenario(args.target_usd, *v) for v in ((.20,.03,4),(.25,.05,8),(.30,.07,12))],
           'priority': 'Verify local program/tag and merchant reports, improve buying-fit paths, then scale qualified traffic. Do not choose products by commission size.'}
    if args.report:
        with open(args.report) as f:
            merchant = json.load(f)
            out['observed'] = observed(merchant)
        if args.site_report:
            with open(args.site_report) as f:
                out['reconciliation'] = reconcile(merchant, json.load(f))
    else:
        out['observed'] = {'status':'unknown','net_commission':None,'merchant_epc':None}
    print(json.dumps(out, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
