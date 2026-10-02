// One probability implementation for the visible calculator and public MCP.
export function styleProbability(input) {
  if (!input || !Number.isInteger(input.boxes) || input.boxes < 1 || input.boxes > 100000) throw new RangeError('boxes must be an integer from 1 to 100000');
  const {target, boxes} = input;
  const allowed=target==='printed'?['target','boxes','probabilityPercent']:target==='regular'?['target','boxes','secretOddsN','regularStyles']:['target','boxes','secretOddsN'];
  if(Object.keys(input).some(k=>!allowed.includes(k)))throw new RangeError('Pass only the inputs used by the selected target mode');
  let p, model;
  if (target === 'printed') {
    if (typeof input.probabilityPercent !== 'number' || !Number.isFinite(input.probabilityPercent) || input.probabilityPercent < 0 || input.probabilityPercent > 100) throw new RangeError('probabilityPercent must be between 0 and 100');
    p = input.probabilityPercent / 100;
    model = 'User-supplied probability for one specified style in one box.';
  } else if (target === 'regular' || target === 'secret') {
    if (!Number.isInteger(input.secretOddsN) || input.secretOddsN < 2 || input.secretOddsN > 100000) throw new RangeError('secretOddsN must be an integer from 2 to 100000');
    p = 1 / input.secretOddsN;
    model = 'User-supplied 1:N secret probability.';
    if (target === 'regular') {
      if (!Number.isInteger(input.regularStyles) || input.regularStyles < 1 || input.regularStyles > 1000) throw new RangeError('regularStyles must be an integer from 1 to 1000');
      p = (1 - p) / input.regularStyles;
      model = 'Assumption: one secret replaces a regular style; all regular styles share the remaining probability equally. p=(1-1/N)/K. Not an official per-style rate.';
    }
  } else throw new RangeError('target must be regular, secret or printed');
  const atLeastOne = p === 1 ? 1 : -Math.expm1(boxes * Math.log1p(-p));
  const threshold = confidence => p === 0 ? null : p === 1 ? 1 : Math.ceil(Math.log1p(-confidence) / Math.log1p(-p));
  return {target, boxes, probabilityPerBox:p, probabilityAtLeastOne:atLeastOne, probabilityNone:p===1?0:Math.exp(boxes*Math.log1p(-p)), expectedCount:boxes*p, boxesFor50pct:threshold(.5), boxesFor90pct:threshold(.9), model, limitations:['Independent draws with unchanged odds; not sealed-case, no-repeat, POP NOW hint or remaining-box probabilities.','A past miss does not improve the next independent draw. More purchases do not guarantee a target.','Use the exact package or official series odds. Editable examples are not verified product probabilities.']};
}
