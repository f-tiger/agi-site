// Synthetic browser responses only. Derive ordering from the published fixture,
// never today's clock, so a daily observation cannot make a refresh look older.
export function refreshFixtures(published, manifest) {
 const nextDate = date => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
 const firstDate = nextDate(published.as_of || manifest.entry_session), secondDate = nextDate(firstDate);
 const keys = [...manifest.stocks, ...manifest.benchmarks].map(x => x.ticker).concat('basket');
 const observation = (dates, values) => ({...published, status:'tracking', as_of:dates.at(-1), dates,
  series:Object.fromEntries(keys.map(k => [k, [...values]])),
  metrics:Object.fromEntries(keys.map(k => [k, {return_pct:values.at(-1)-100, max_drawdown_pct:0, excess_spy_pp:0}]))});
 return {
  first:observation([manifest.entry_session, firstDate], [100, 110]),
  second:observation([manifest.entry_session, firstDate, secondDate], [100, 110, 112]),
  rollback:published,
 };
}
