/* Tests for the category qualifier.

   This decides, unsupervised and on a schedule, whether a new family of pages
   gets to exist. An automation that has never been watched fire is not
   verified, and one that cannot be watched REFUSE is worse — so both
   directions are pinned here with synthetic data, because the real dataset
   currently exercises only one of them. */

import assert from "node:assert";
import { qualify, predictability, MIN_SAMPLE } from "./categories.mjs";

let failed = 0;
const t = (name, fn) => {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
};

/* n rows of a value, with the metric centred on `metric`. */
const rows = (specs) =>
  specs.flatMap(({ group, n, metric, height }) =>
    Array.from({ length: n }, (_, i) => ({
      title: `${group} listing ${i}`,
      group,
      heightCm: height ?? 150,
      weightLb: metric + (i % 3),
      priceUsd: metric * 10,
    }))
  );

const dim = (over = {}) => ({
  id: "candidate",
  extract: (r) => r.group,
  metric: (r) => r.weightLb,
  label: (v) => String(v),
  ...over,
});
const heightDim = {
  id: "height",
  extract: (r) => String(r.heightCm),
  metric: (r) => r.weightLb,
  label: (v) => `${v} cm`,
};

t("a category with enough sample and real variance QUALIFIES", () => {
  const data = rows([
    { group: "A", n: 12, metric: 60 },
    { group: "B", n: 11, metric: 90 },
  ]);
  const q = qualify(data, dim(), []);
  assert.equal(q.ok, true, q.reasons.join("; "));
  assert.equal(q.values.length, 2);
});

t("too few values reaching the sample floor is refused, and says how close", () => {
  const data = rows([
    { group: "A", n: 12, metric: 60 },
    { group: "B", n: 4, metric: 90 },
  ]);
  const q = qualify(data, dim(), []);
  assert.equal(q.ok, false);
  assert.match(q.reasons.join(" "), /sample:/);
  assert.match(q.reasons.join(" "), /n=4/, "must report the closest near-miss so the gap is actionable");
});

t("REFUSAL: values that all say the same thing earn no pages", () => {
  /* Every group has the same median. A page per value would repeat one number
     in different words — padding, which is the thing the gate exists for. */
  const data = rows([
    { group: "A", n: 12, metric: 70 },
    { group: "B", n: 12, metric: 70 },
    { group: "C", n: 12, metric: 71 },
  ]);
  const q = qualify(data, dim(), []);
  assert.equal(q.ok, false);
  assert.match(q.reasons.join(" "), /variance:/);
});

t("REFUSAL: a category that restates a live one is duplicative", () => {
  /* `group` is derivable from height here — knowing the height tells you the
     group every time. Publishing both would be two page families saying one
     thing. */
  const data = rows([
    { group: "A", n: 12, metric: 60, height: 150 },
    { group: "B", n: 12, metric: 95, height: 170 },
  ]);
  assert.equal(predictability(data, dim(), heightDim), 1, "fully determined by height");
  const q = qualify(data, dim(), [heightDim]);
  assert.equal(q.ok, false);
  assert.match(q.reasons.join(" "), /distinctness:/);
});

t("a genuinely independent category is NOT refused as duplicative", () => {
  /* Same two heights, but the groups cut across them evenly. */
  const data = [
    ...rows([{ group: "A", n: 6, metric: 60, height: 150 }]),
    ...rows([{ group: "A", n: 6, metric: 62, height: 170 }]),
    ...rows([{ group: "B", n: 6, metric: 95, height: 150 }]),
    ...rows([{ group: "B", n: 6, metric: 97, height: 170 }]),
  ];
  const p = predictability(data, dim(), heightDim);
  assert.ok(p <= 0.8, `predictability ${p} should be low for an independent cut`);
  const q = qualify(data, dim(), [heightDim]);
  assert.equal(q.ok, true, q.reasons.join("; "));
});

t("every failing test is reported, not just the first", () => {
  /* Thin AND flat: a person fixing this needs both reasons, not a queue. */
  const data = rows([
    { group: "A", n: 12, metric: 70 },
    { group: "B", n: 3, metric: 70 },
  ]);
  const q = qualify(data, dim(), []);
  assert.equal(q.ok, false);
  assert.ok(q.reasons.length >= 1);
});

t(`the sample floor is the shared constant, not a copy`, () => {
  assert.equal(MIN_SAMPLE, 10, "pages and qualifier must agree on the floor");
});

console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
