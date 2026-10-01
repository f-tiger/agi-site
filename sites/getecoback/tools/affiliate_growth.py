#!/usr/bin/env python3
"""Offline affiliate economics. No credentials, network calls or report uploads.

Use --report /private/path/normalized.json for a same-period, same-store merchant
summary. Never put private exports in this public repository. Missing is unknown,
not zero. Merchant clicks and site click events are intentionally separate.
"""
import argparse
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


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--target-usd', type=float, default=1000)
    p.add_argument('--report', help='Private normalized merchant JSON; never committed')
    args = p.parse_args()
    out = {'scenarios': [scenario(args.target_usd, *v) for v in ((.20,.03,4),(.25,.05,8),(.30,.07,12))],
           'priority': 'Verify local program/tag and merchant reports, improve buying-fit paths, then scale qualified traffic. Do not choose products by commission size.'}
    if args.report:
        with open(args.report) as f:
            out['observed'] = observed(json.load(f))
    else:
        out['observed'] = {'status':'unknown','net_commission':None,'merchant_epc':None}
    print(json.dumps(out, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == '__main__':
    main()
