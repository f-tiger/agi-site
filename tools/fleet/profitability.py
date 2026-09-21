#!/usr/bin/env python3
"""Planning scenarios, not measured financial results. All prices exclude VAT.

Count refunds before revenue; assume payment fees are not returned. Charge time
at an explicit opportunity-cost rate. One unit is specified by each scenario,
never silently interchanging a click, order or monthly customer.
"""
import argparse
import json
import math
from pathlib import Path


def number(row, key, *, upper=None):
    value = row.get(key)
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f'{key}: finite nonnegative number required')
    if upper is not None and value > upper:
        raise ValueError(f'{key}: must be <= {upper}')
    return value


def evaluate(row):
    if row.get('basis') != 'assumptions_not_forecasts' or not row.get('unit'):
        raise ValueError('Explicit assumption basis and unit required')
    price = number(row, 'price_eur_ex_vat')
    transaction = row.get('transaction')
    gmv = None
    fee_base = price
    refund_loss = 0
    if transaction is not None:
        gmv = number(transaction, 'gmv_eur')
        take = number(transaction, 'take_rate', upper=1)
        if not math.isclose(price, gmv * take, abs_tol=1e-9):
            raise ValueError('Platform price must equal GMV times take rate')
        if transaction.get('payment_fee_basis') not in ('gmv', 'platform_fee'):
            raise ValueError('Explicit payment fee basis required')
        fee_base = gmv if transaction['payment_fee_basis'] == 'gmv' else price
        refund_loss = number(transaction, 'unrecovered_cost_per_refunded_unit_eur')
    refund = number(row, 'refund_rate', upper=1)
    fee_rate = number(row, 'payment_fee_rate', upper=1)
    fee_fixed = number(row, 'payment_fee_fixed_eur')
    variable = number(row, 'variable_cost_eur')
    inference = row.get('inference')
    if inference is not None:
        attempts = number(inference, 'expected_attempts')
        if not 1 <= attempts <= 2:
            raise ValueError('This pilot allows 1–2 attempts; input is the expected average')
        variable += number(inference, 'cost_per_full_attempt_eur') * attempts
    acquisition_cash = number(row, 'acquisition_cash_per_unit_eur')
    minutes = sum(number(row, k) for k in ('delivery_minutes', 'support_minutes', 'acquisition_minutes'))
    hourly = number(row, 'labor_eur_per_hour')
    fixed_cash = number(row, 'monthly_fixed_cash_eur')
    fixed_hours = number(row, 'monthly_maintenance_hours') + number(row, 'monthly_setup_amortization_hours')
    conv = number(row, 'qualified_offer_conversion', upper=1)
    revenue = price * (1 - refund)
    cash_unit = revenue - fee_base * fee_rate - fee_fixed - variable - acquisition_cash - refund * refund_loss
    labor_unit = minutes / 60 * hourly
    economic_unit = cash_unit - labor_unit
    fixed_economic = fixed_cash + fixed_hours * hourly

    def units_for(target, contribution, fixed=0):
        if contribution <= 0:
            return None
        # Avoid an extra unit caused solely by floating-point rounding.
        return math.ceil((target + fixed) / contribution - 1e-10)

    targets = []
    for target in (110, 1100):
        count = units_for(target, economic_unit, fixed_economic)
        targets.append({
            'target_eur': target,
            'units_for_net_revenue': units_for(target, revenue),
            'units_for_cash_contribution_after_fixed_costs': units_for(target, cash_unit, fixed_cash),
            'units_for_operating_surplus_after_labor': count,
            'qualified_offer_exposures_for_surplus': math.ceil(count / conv) if count is not None and conv > 0 else None,
            'hours_at_surplus_target': round(fixed_hours + count * minutes / 60, 2) if count is not None else None,
        })
    return {
        'id': row['id'], 'unit': row['unit'], 'basis': row['basis'],
        'net_revenue_per_unit_eur': round(revenue, 4),
        'gmv_per_unit_eur': gmv,
        'payment_fee_base_per_unit_eur': fee_base,
        'variable_cost_including_expected_retries_eur': round(variable, 4),
        'max_acquisition_cash_before_fixed_costs_eur': round(cash_unit + acquisition_cash - labor_unit, 4),
        'cash_contribution_per_unit_eur': round(cash_unit, 4),
        'labor_per_unit_eur': round(labor_unit, 4),
        'contribution_after_labor_per_unit_eur': round(economic_unit, 4),
        'monthly_fixed_economic_cost_eur': round(fixed_economic, 4),
        'positive_unit_contribution_after_labor': economic_unit > 0,
        'targets': targets,
        'scale_probe': [{'units': n, 'hours': round(fixed_hours + n * minutes / 60, 2),
                         'operating_surplus_after_labor_eur': round(n * economic_unit - fixed_economic, 2)}
                        for n in (10, 100, 1000)],
        'limitations': ['No measured conversion or demand', 'Income tax excluded',
                       'Monthly setup amortization is an assumption, not cash already spent',
                       'Positive unit contribution alone does not establish scalable demand or capacity'],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    scenarios = json.loads(args.input.read_text())['scenarios']
    ids = [s['id'] for s in scenarios]
    if len(set(ids)) != len(ids):
        raise ValueError('Duplicate scenario IDs')
    result = {'status': 'planning_only_no_orders', 'results': [evaluate(s) for s in scenarios]}
    output = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output)
    else:
        print(output, end='')


if __name__ == '__main__':
    main()
