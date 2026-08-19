/* Tests the MCP endpoint against the real published datasets.

   The whole point of the endpoint is that it never reimplements a rule — it
   reads the same JSON the site publishes. So this test loads those files from
   disk through the same interface the Worker uses, which means a drift
   between the endpoint and the published data fails here rather than in
   somebody's assistant.

   The cases that matter are the honest-refusal ones. A tool that invents an
   answer for a height it has no data on, or flattens "we could not verify
   this outside the UK" into a clean "no", is worse than no tool: the caller
   cannot see what was dropped, and an assistant will repeat it as fact. */

import { readFileSync } from "node:fs";
import assert from "node:assert";
import { callTool } from "../functions/mcp.js";

const ctx = { load: async (p) => JSON.parse(readFileSync("." + p, "utf8")) };

let failed = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`ok    ${name}`); }
  catch (e) { failed++; console.log(`FAIL  ${name}\n        ${e.message.split("\n")[0]}`); }
};

await t("weight lookup returns the measured range with its sample size", async () => {
  const r = await callTool("doll_weight_by_height", { heightCm: 150 }, ctx);
  assert.equal(r.found, true);
  assert.ok(r.sampleSize >= 10, `expected a real sample, got ${r.sampleSize}`);
  assert.ok(r.weightLb.min < r.weightLb.max, "a range, not a point");
  assert.ok(r.recorded, "must carry the recording date");
  assert.ok(Array.isArray(r.limitations) && r.limitations.length, "must carry the dataset's limitations");
});

await t("REFUSAL: a height with no data says so and lists what exists", async () => {
  const r = await callTool("doll_weight_by_height", { heightCm: 999 }, ctx);
  assert.equal(r.found, false);
  assert.match(r.message, /No 999cm listing/);
  assert.match(r.message, /Heights present/, "must tell the caller what it could ask instead");
});

await t("recourse matches the published matrix exactly", async () => {
  const matrix = JSON.parse(readFileSync("./data/payment-recourse.json", "utf8"));
  const r = await callTool("payment_recourse", { country: "uk", paymentMethod: "credit", priceGbp: 1749 }, ctx);
  const cell = matrix.cells.find((c) => c.country === "uk" && c.paymentMethod === "credit" && c.priceBand === "within");
  assert.equal(r.section75, cell.section75, "endpoint and published matrix must not disagree");
  assert.equal(r.chargeback, cell.chargeback);
  assert.equal(r.section75, "yes");
});

await t("price bands: a threshold edge lands in the right band", async () => {
  /* s.75(3)(b) excludes an item priced AT £100, so exactly 100 is outside. */
  const at = await callTool("payment_recourse", { country: "uk", paymentMethod: "credit", priceGbp: 100 }, ctx);
  assert.equal(at.section75, "no", "£100 exactly is outside the statute");
  const over = await callTool("payment_recourse", { country: "uk", paymentMethod: "credit", priceGbp: 101 }, ctx);
  assert.equal(over.section75, "yes");
});

await t("REFUSAL: outside the UK it reports not-verified, not a clean no", async () => {
  const r = await callTool("payment_recourse", { country: "other", paymentMethod: "credit", priceGbp: 1749 }, ctx);
  assert.equal(r.section75, "n/a", `must not flatten to "no" — got ${r.section75}`);
  assert.match(r.appliesTo, /NOT verified/i, "must say this is a statement about what we checked");
});

await t("the open question about wallets survives the API", async () => {
  const r = await callTool("payment_recourse", { country: "uk", paymentMethod: "wallet", priceGbp: 1749 }, ctx);
  assert.ok(r.openQuestions && r.openQuestions.wallet, "the unresolved question must reach the caller");
  assert.match(r.openQuestions.wallet, /could not confirm/i);
});

await t("cost model reproduces a published worked example", async () => {
  const model = JSON.parse(readFileSync("./data/first-year-cost.json", "utf8"));
  const ex = model.workedExamples.find((e) => e.inputs.material === "tpe" && e.inputs.region === "us" && e.inputs.price === 1749);
  assert.ok(ex, "expected the median TPE/US example to exist");
  const r = await callTool("first_year_cost", {
    priceUsd: ex.inputs.price, material: "tpe", region: "us",
    addonsUsd: ex.inputs.addons, storageUsd: ex.inputs.storage,
  }, ctx);
  assert.equal(r.firstYearTotalUsd, ex.firstYearTotalUsd,
    `endpoint says ${r.firstYearTotalUsd}, the published page says ${ex.firstYearTotalUsd}`);
  assert.ok(r.caveats.some((c) => /duty RATE is not modelled/i.test(c)), "the refusal to invent a US duty rate must reach the caller");
});

await t("REFUSAL: an unknown material names the valid options", async () => {
  const r = await callTool("first_year_cost", { priceUsd: 1749, material: "wood", region: "us" }, ctx);
  assert.equal(r.found, false);
  assert.match(r.message, /Materials: tpe, silicone, torso/);
});

await t("price bands carry the counterfeit warning and the sample caveat", async () => {
  const r = await callTool("doll_price_bands", {}, ctx);
  assert.ok(r.floorUsd > 0 && r.medianUsd >= r.floorUsd);
  assert.match(r.note, /counterfeit signal/);
  assert.match(r.note, /not a market survey/);
});

await t("scam signals come with the caveat that passing is not a guarantee", async () => {
  const r = await callTool("scam_check_signals", {}, ctx);
  assert.equal(r.signalCount, 10);
  assert.ok(r.limitations.some((l) => /not a guarantee/i.test(l)),
    "a checklist handed over without this reads as a safety guarantee, and it is not one");
});

await t("import rules carry their own sources", async () => {
  const r = await callTool("import_rules", { country: "australia" }, ctx);
  assert.equal(r.found, true);
  assert.ok(Array.isArray(r.sources) && r.sources.length, "a legal status with no source is the thing we refuse to publish");
  assert.match(r.notLegalAdvice, /not legal advice/i);
});

await t("SAFETY: an unrecorded country must not read as 'no restrictions'", async () => {
  /* The one way this tool could contribute to a criminal import is by
     answering "we have no data" in a way that sounds like "nothing applies". */
  const r = await callTool("import_rules", { country: "narnia" }, ctx);
  assert.equal(r.found, false);
  assert.match(r.important, /[Cc]hildlike dolls are prohibited/,
    "the universal prohibition must survive a miss, not only a hit");
  assert.match(r.message, /Countries covered/, "must say what it does cover");
});

await t("SAFETY: every covered country carries the childlike-doll prohibition", async () => {
  const data = JSON.parse(readFileSync("./data/import-costs.json", "utf8"));
  for (const c of data.countries) {
    assert.ok(c.childlikeDollsProhibited, `${c.country} is missing the prohibition field`);
  }
});

await t("an unknown tool refuses and lists the real ones", async () => {
  const r = await callTool("make_me_money", {}, ctx);
  assert.equal(r.found, false);
  assert.match(r.message, /doll_weight_by_height/);
});

console.log(failed ? `\n${failed} failed.` : "\nAll passed.");
process.exit(failed ? 1 : 0);
