#!/usr/bin/env python3
"""Revenue-first experiment review. Read-only, no deploys and no paid traffic.

Observations are supplied privately; absent values stay unknown. Never derive
commission from D1 clicks, combine overlapping accounts, or sum mixed PV bases.
CLI: python3 tools/fleet/growth_lab.py [--observations /private/path.json]
"""
import argparse
import json
import math
import datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]

def numeric(value):
    return not isinstance(value,bool) and isinstance(value,(int,float)) and math.isfinite(value) and value>=0

def window_days(row):
    try:
        a=datetime.date.fromisoformat(row['window_start']);b=datetime.date.fromisoformat(row['window_end'])
        return (b-a).days+1 if b>=a else None
    except (KeyError,TypeError,ValueError):return None

def decision(exp, row):
    if not row:return {'status':'awaiting_measurement','reason':'No matched observation; missing is not zero.'}
    required=['days_live','qualified_landings','decisions','commerce_clicks']
    if any(not numeric(row.get(k)) for k in required):
        return {'status':'invalid_measurement','reason':'Required nonnegative metrics are missing or invalid.'}
    if not window_days(row) or not row.get('source') or row.get('ci_excluded') is not True:
        return {'status':'invalid_measurement','reason':'Require a dated, sourced window excluding CI.'}
    if row['qualified_landings']<exp['min_qualified_landings']:
        status='distribution_review' if row['days_live']>=exp['review_days'] else 'collecting_evidence'
        return {'status':status,'reason':'Insufficient eligible landings; cannot conclude the product has no demand.'}
    if row['decisions']>=exp['min_decisions'] and row['commerce_clicks']>=exp['min_commerce_clicks']:
        return {'status':'expand_one_replication','reason':'Engagement gate passed; this does not prove revenue or profitability.'}
    if row['days_live']<exp['review_days']:
        return {'status':'collecting_evidence','reason':'The predeclared observation period is incomplete.'}
    return {'status':'revise_or_pause','reason':'Enough landings and elapsed time, but the decision/commercial intent gate failed.'}

def commercial_decision(exp, row):
    if not row:return {'status':'awaiting_measurement','reason':'No paid-customer evidence supplied.'}
    if exp['id']!='brief-paid-pilot':return {'status':'manual_gate_review','reason':exp['gate']}
    counts=['days_live','qualified_conversations','unrelated_paying_customers','repeat_requests']
    if any(not numeric(row.get(k)) or int(row[k])!=row[k] for k in counts) or not window_days(row) or not row.get('source') or row.get('payments_reconciled') is not True:
        return {'status':'invalid_measurement','reason':'Require dated, sourced integer counts and reconciled payments.'}
    customers=row['unrelated_paying_customers']
    minutes=row.get('delivery_minutes')
    if customers>row['qualified_conversations'] or row['repeat_requests']>customers or not isinstance(minutes,list) or len(minutes)!=customers or any(not numeric(n) or n==0 for n in minutes):
        return {'status':'invalid_measurement','reason':'Count unique paying customers; repeat requests must come from them, with one positive delivery duration per customer.'}
    if minutes and max(minutes)>exp['delivery_limit_minutes']:
        return {'status':'reduce_delivery_cost','reason':'Paid demand alone is insufficient: a delivery exceeded the predeclared time limit.'}
    if row['qualified_conversations']<exp['qualified_conversations_goal']:
        return {'status':'distribution_review' if row['days_live']>=exp['review_days'] else 'collecting_evidence','reason':'Insufficient qualified conversations; do not infer lack of demand.'}
    if customers>=exp['unrelated_paying_customers_goal'] and row['repeat_requests']>=exp['repeat_requests_goal']:
        return {'status':'test_paid_recurring_offer','reason':'Pilot gate passed. Repeat requests are not paid renewal or retained MRR.'}
    return {'status':'revise_offer' if row['days_live']>=exp['review_days'] else 'collecting_evidence','reason':'Paid-customer and repeat-request gates are not both met.'}

def report(config, observations):
    scenarios=[{'name':s['name'],'assumed_eur_per_provider_click':s['commission_per_provider_click'],
                'clicks_for_110':math.ceil(110/s['commission_per_provider_click']),
                'clicks_for_1100':math.ceil(1100/s['commission_per_provider_click'])} for s in config['scenarios']]
    output={'targets':config['targets'],'scenario_type':'assumptions_not_forecasts','provider_click_scenarios':scenarios,
            'commercial_offer_math':[{'id':e['id'],'billing':e['billing'],'proposed_price_eur':e['price_eur'],'sales_or_active_customers_for_110':math.ceil(110/e['price_eur']),'sales_or_active_customers_for_1100':math.ceil(1100/e['price_eur']),'basis':'gross_price_arithmetic_before_refunds_fees_tax_costs_not_a_forecast'} for e in config.get('commercial_experiments',[]) if numeric(e.get('price_eur')) and e['price_eur']>0],
            'experiments':[{'id':e['id'],'state':e['state'],**decision(e,observations.get('experiments',{}).get(e['id']))} for e in config['experiments']]}
    output['commercial_reviews']=[{'id':e['id'],**commercial_decision(e,observations.get('commercial_experiments',{}).get(e['id']))} for e in config.get('commercial_experiments',[])]
    revenue=observations.get('portfolio_revenue')
    # ONE reconciled, nonoverlapping EUR 30-day total, not a sum of shared tags.
    if revenue and revenue.get('reconciled_no_double_count') is True and revenue.get('vat_excluded') is True and window_days(revenue)==30 and revenue.get('currency')=='EUR' and revenue.get('source') and all(numeric(revenue.get(k)) for k in ['confirmed_commission','recognized_product_service_sales','cash_received','refunds','operating_cost','acquisition_cost','payment_fees']):
        net=revenue['confirmed_commission']+revenue['recognized_product_service_sales']-revenue['refunds']
        output['revenue']={'status':'reported_not_independently_verified','window_start':revenue['window_start'],'window_end':revenue['window_end'],
                           'confirmed_net':net,'cash_received':revenue['cash_received'],'contribution_before_labor_and_tax':net-revenue['operating_cost']-revenue['acquisition_cost']-revenue['payment_fees'],
                           'target_110_met':net>=110,'target_1100_met':net>=1100,
                           'repeatability':'Requires a second nonoverlapping positive-margin month; not inferred from this window.'}
    else:output['revenue']={'status':'unknown','reason':'Need a reconciled EUR 30-day provider report and operating cost; traffic events are not revenue.'}
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--observations',type=Path);args=parser.parse_args()
    obs=json.loads(args.observations.read_text()) if args.observations else {}
    print(json.dumps(report(json.loads((ROOT/'data/growth-lab.json').read_text()),obs),ensure_ascii=False,indent=2))
