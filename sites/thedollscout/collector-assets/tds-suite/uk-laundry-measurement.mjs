function decimalTerms(value) {
  const [coefficient, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  return {digits: BigInt(whole + fraction), places: fraction.length - Number(exponent)};
}

// Add decimal readings before converting back to the calculator's numeric input.
// This also checks the upper bound before numeric rounding can hide an overage.
export function sumMeasuredKwh(readings, maximum) {
  if (!readings.length) return {status: 'empty'};
  if (readings.some(value => !Number.isFinite(value) || value < 0)) return {status: 'invalid'};
  const terms = readings.map(decimalTerms);
  const limit = decimalTerms(maximum);
  const places = Math.max(limit.places, ...terms.map(term => term.places));
  const scaled = term => term.digits * 10n ** BigInt(places - term.places);
  const sum = terms.reduce((total, term) => total + scaled(term), 0n);
  if (sum > scaled(limit)) return {status: 'over'};
  return {status: 'ok', value: Number(`${sum}e${-places}`)};
}
