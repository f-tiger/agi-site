export function membershipTotals(rows) {
  return Object.fromEntries(['paid_orders','paid_members','active_members','unexpired_pending'].map(key => [
    key, rows.length > 0 && rows.every(row => row.admin?.ok && Number.isFinite(row.admin[key]))
      ? rows.reduce((sum,row) => sum + row.admin[key],0) : null
  ]));
}
