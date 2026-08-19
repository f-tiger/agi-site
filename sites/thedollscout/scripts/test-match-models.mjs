/* Tests for the cross-distributor model matcher. Pure string work — no
   browser, so this runs anywhere.

   The tests that matter are the negative ones. Any matcher can join two rows
   that obviously agree; this one exists to REFUSE the rows that only look
   like they agree, because a false match publishes a price difference between
   two different dolls and calls it a finding. */

import assert from "node:assert";
import { modelKey, matchModels, parseHeadCode, parseCup, parseHeight, parseVariants } from "./match-models.mjs";

let failed = 0;
const t = (name, fn) => {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
};

/* Every one of these title forms was taken from collected data. */
t("head codes are read in every form the vendors use", () => {
  assert.equal(parseHeadCode("156cm (5ft1) H-Cup Indigo, Head #233"), "233");
  assert.equal(parseHeadCode("WM Doll 160cm A Cup - Head 70"), "70");
  assert.equal(parseHeadCode("140cm (4ft7) Furry Fox Silicone Sex Doll Renamon, Head SZ20"), "SZ20");
  assert.equal(parseHeadCode("6YE Premium 150cm B Cup - Head N20"), "N20");
  assert.equal(parseHeadCode("163cm(5ft4) D-Cup Full Silicone Love Doll Usha, Movable Jaw Head M5 In Stock"), "M5");
  assert.equal(parseHeadCode("151cm (4ft11) B-Cup Sex Doll Rong, ROS Available"), null);
});

t("cup and height survive the punctuation vendors use", () => {
  assert.equal(parseCup("150cm (4ft11) M-Cup Ondine, Head #302"), "M");
  assert.equal(parseCup("162cm (5ft4) E-cup S-TPE Sex Doll Yeter In Stock"), "E");
  assert.equal(parseCup("WM Doll 175cm B Cup - Head 394"), "B");
  assert.equal(parseHeight("163cm(5ft4) D-Cup Full Silicone Love Doll Usha"), 163);
});

t("a row missing any one identifier gets no key at all", () => {
  assert.equal(modelKey({ title: "156cm (5ft1) B-Cup Lenora" }).key, null, "no head code");
  assert.equal(modelKey({ title: "Sex Doll Jasmine Head #198" }).key, null, "no height or cup");
  assert.equal(modelKey({ title: "163cm (5ft4) Sex Doll, Head #198" }).key, null, "no cup");
  assert.ok(modelKey({ title: "163cm (5ft4) H-cup Sex Doll Jasmine, Head #198" }).key);
});

t("the same model at two distributors matches", () => {
  const { matched } = matchModels({
    yourdoll: [{ title: "156cm (5ft1) H-Cup Indigo, Head #233", price: 1749 }],
    perfectlovedolls: [{ title: "WM Doll 156cm H Cup - Head 233", price: 1499 }],
  });
  assert.equal(matched.length, 1);
  assert.equal(matched[0].key, "156|H|233");
  assert.equal(matched[0].factory, "WM Doll", "the factory named by one side is carried across");
});

t("a different head code is a different model, however close the rest is", () => {
  /* This is the real pair from the first two-vendor sample: same height, same
     cup, different head. It must not be joined. */
  const { matched } = matchModels({
    yourdoll: [{ title: "156cm (5ft1) H-Cup Indigo, Head #233", price: 1749 }],
    perfectlovedolls: [{ title: "WM Doll 156cm H Cup - Head 335", price: 1499 }],
  });
  assert.equal(matched.length, 0);
});

t("a 1cm height difference is a different model, not a rounding error", () => {
  const { matched } = matchModels({
    yourdoll: [{ title: "150cm (4ft11) B-Cup Doll, Head #22", price: 1500 }],
    perfectlovedolls: [{ title: "WM Doll 151cm B Cup - Head 22", price: 1400 }],
  });
  assert.equal(matched.length, 0);
});

t("contradicting factories reject the match rather than average it", () => {
  const { matched, rejected } = matchModels({
    yourdoll: [{ title: "Irontech 160cm A Cup Doll, Head #70", price: 1900 }],
    perfectlovedolls: [{ title: "WM Doll 160cm A Cup - Head 70", price: 1499 }],
  });
  assert.equal(matched.length, 0);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason, /factories disagree/);
});

t("one distributor alone is never a comparison", () => {
  const { matched } = matchModels({
    yourdoll: [
      { title: "160cm A Cup Doll, Head #70", price: 1900 },
      { title: "160cm A Cup Doll, Head #70", price: 1750 },
    ],
  });
  assert.equal(matched.length, 0);
});

t("torsos are excluded — they are not model-comparable", () => {
  const { matched } = matchModels({
    yourdoll: [{ title: "80cm B-Cup Torso, Head #12", price: 299, isPartial: true }],
    perfectlovedolls: [{ title: "WM Doll 80cm B Cup Torso - Head 12", price: 259, isPartial: true }],
  });
  assert.equal(matched.length, 0);
});

/* This one is not hypothetical. It is the first real cross-distributor match
   the matcher produced, and it was wrong: the key joined a weight-reduced
   build to a standard one and would have published the $200 gap between them
   as a price difference. */
t("a weight-reduced build is not the same product as a standard one", () => {
  const { matched, rejected } = matchModels({
    yourdoll: [{ title: "163cm (5ft4) H-cup Sex Doll Jasmine, Head #198", price: 1799 }],
    perfectlovedolls: [{ title: "WM Doll 163cm H Cup - Head 198 (Weight-Reduced)", price: 1599 }],
  });
  assert.equal(matched.length, 0, "must not be published as a price comparison");
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason, /weight-reduced/);
});

t("the same qualifier on both sides is still a match", () => {
  const { matched } = matchModels({
    yourdoll: [{ title: "163cm H-cup Doll, Head #198, Weight Reduced", price: 1799 }],
    perfectlovedolls: [{ title: "WM Doll 163cm H Cup - Head 198 (Weight-Reduced)", price: 1599 }],
  });
  assert.equal(matched.length, 1, "both are the same build, so they compare");
});

t("variant qualifiers are read from the forms vendors actually write", () => {
  assert.deepEqual(parseVariants("WM Doll 163cm H Cup - Head 198 (Weight-Reduced)"), ["weight-reduced"]);
  assert.ok(parseVariants("163cm(5ft4) D-Cup Full Silicone Love Doll Usha, Movable Jaw Head M5").includes("movable jaw"));
  assert.ok(parseVariants("151cm (4ft11) B-Cup Sex Doll Rong, ROS Available").includes("ROS"));
  assert.deepEqual(parseVariants("166cm (5ft5) C-cup Sex Doll Daria, Head #266"), []);
});

console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
