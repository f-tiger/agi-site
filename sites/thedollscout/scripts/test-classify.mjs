/* Tests for the safety classifier.

   The cases that matter are the ones where a false "partial body" would let a
   sub-140 cm whole doll through the height guard. Both real failures are
   pinned here as regressions, using the exact titles that caused them. */

import assert from "node:assert";
import { isPartialBody, passesPolicy, implausibleWeight, statedHeightCm } from "./classify.mjs";

let failed = 0;
const t = (name, fn) => {
  try { fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
};

t("REGRESSION: 'Ready to Ship' must not match 'hip'", () => {
  assert.equal(isPartialBody("150cm (4ft11) TPE Sex Doll Richelle, Ready to Ship from US"), false);
  /* The consequence, which is the actual reason this matters: without the
     word boundary, a sub-140cm whole doll saying "Ready to Ship" passed the
     age-appearance guard. */
  assert.equal(passesPolicy("120cm TPE Sex Doll, Ready to Ship from US"), false,
    "a 120cm whole doll must never pass, whatever the shipping blurb says");
});

t("REGRESSION: a head code on a whole doll is not a head", () => {
  assert.equal(isPartialBody("156cm (5ft1) H-Cup Indigo, Head #233"), false);
  assert.equal(isPartialBody("163cm(5ft4) D-Cup Full Silicone Love Doll Usha, Movable Jaw Head M5"), false);
  assert.equal(passesPolicy("130cm B-Cup Doll, Head #233"), false, "a head code must not rescue a 130cm whole doll");
});

t("a trailing bare 'Head' on a full-height doll is still a doll", () => {
  assert.equal(isPartialBody("160cm (5ft3) Silicone Sex Doll Celine, Head S13, ROS Max Head"), false);
  assert.equal(isPartialBody("165cm (5ft5) Silicone Sex Doll Kitty, Head S32, ROS Max Head"), false);
});

t("genuine partial bodies are still detected", () => {
  assert.equal(isPartialBody("Climax Hyper Real Sex Doll Torso Big Butt for Men R4"), true);
  assert.equal(isPartialBody("140cm (4ft7) Silicone Doll Torso BR-4, ROS Head, #Y39 Eva"), true, "a torso keeps its label at any height");
  assert.equal(isPartialBody("Big Breast N-cup Merna"), true, "no stated height, soft noun applies");
  assert.equal(isPartialBody("Rosie: 33.1lbs Sex Doll Ass Male Masturbator with Tantabutt"), true);
});

t("a partial body may be under 140cm; a whole doll may not", () => {
  assert.equal(passesPolicy("80cm Sex Doll Torso, Head #12"), true);
  assert.equal(passesPolicy("120cm B-Cup Sex Doll Lily"), false);
  assert.equal(passesPolicy("140cm (4ft7) F-Cup Doll"), true);
  assert.equal(passesPolicy("49.5cm Sex Doll Torso"), true);
  assert.equal(passesPolicy("139cm B-Cup Sex Doll"), false, "just under the line is still under it");
});

t("accessories never pass, whatever height their spec table quotes", () => {
  assert.equal(passesPolicy("Sex Doll Jasmine Light Gray Hoodie Clothes"), false);
  assert.equal(passesPolicy("163cm Sex Doll Hoodie"), false);
});

t("decimal heights are read, not truncated", () => {
  assert.equal(statedHeightCm("49.5cm Sex Doll Torso"), 49.5);
  assert.equal(statedHeightCm("163cm(5ft4) D-Cup"), 163);
});

t("REGRESSION: an impossible weight is a failed parse, not a light doll", () => {
  assert.equal(implausibleWeight({ title: "160cm (5ft3) C-cup Sex Doll JiangXiaoTang, ROS Available", heightCm: 160, weightKg: 2.5 }), true);
  assert.equal(implausibleWeight({ title: "150cm (4ft11) F-Cup TPE Sex Doll, Head #228", heightCm: 150, weightKg: 33 }), false);
  assert.equal(implausibleWeight({ title: "Climax Sex Doll Torso Big Butt R4", heightCm: 20, weightKg: 8.8 }), false,
    "torsos are genuinely light — the guard must not touch them");
});

console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
