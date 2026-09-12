// End-to-end test: the REAL refresher against the mock, asserting the rules
// that would lose money or honesty if they regressed. Zero network, ~2 s.
import { startMock } from "./mock_paapi.mjs";
import { PaapiClient } from "./paapi.mjs";
import { refresh } from "./refresh.mjs";

const { server, port, calls } = await startMock();
process.env.PAAPI_ACCESS_KEY = "TESTKEY";
process.env.PAAPI_SECRET_KEY = "TESTSECRET";
process.env.PAAPI_ENDPOINT = `http://127.0.0.1:${port}`;
process.env.PAAPI_PACE_MS = "5";

const client = new PaapiClient();
const now = new Date("2026-09-11T12:00:00Z");
const terms = [
  { term: "De'Longhi Pinguino PAC EX105", name: "De'Longhi Pinguino PAC EX105", token: "EX105", family: "ac" },
  { term: "Comfee MPPH-09CRN7", name: "Comfee MPPH-09CRN7", token: "MPPH-09CRN7", family: "ac" },
  { term: "MeacoDry Arete One 20L", name: "MeacoDry Arete One 20L", token: "One 20L", family: "dehum" },
  { term: "MeacoDry Arete One 25L", name: "MeacoDry Arete One 25L", token: "One 25L", family: "dehum" },
  { term: "luftentfeuchter keller ablaufschlauch", name: "Für den Keller", token: "", family: "dehum" },
  { term: "throttle me", name: "Throttled", token: "XYZ", family: "ac" },
  { term: "boom", name: "Broken", token: "XYZ", family: "ac" },
  { term: "nothing here", name: "Empty", token: "XYZ", family: "ac" },
];
const previous = { items: { "boom": { name: "Broken", token: "XYZ", status: "ok", asin: "B0OLDGOOD0", price_cents: 100, fetched_at: "2026-09-10T12:00:00Z" } } };

const r = await refresh({ client, terms, previous, now });
server.close();

let bad = 0;
const check = (cond, msg) => { if (!cond) { bad++; console.error("FAIL", msg); } else console.log("ok  ", msg); };

const ex = r.items["De'Longhi Pinguino PAC EX105"];
check(ex.status === "unmatched" && !ex.asin, "EX105: AP98 top hit refused — no ASIN, no price written (the closed 08-31 case)");
const mp = r.items["Comfee MPPH-09CRN7"];
check(mp.status === "ok" && mp.asin === "B07KJYD1ZP" && mp.price_cents === 28999 && mp.currency === "EUR", "MPPH-09CRN7: clean match resolved with price");
check(r.items["MeacoDry Arete One 20L"].asin === "B0MOCK20L0" && r.items["MeacoDry Arete One 25L"].asin === "B0MOCK25L0", "20 L and 25 L resolve to DIFFERENT products");
check(!("luftentfeuchter keller ablaufschlauch" in r.items), "category term never written (nothing to resolve)");
check(r.items["throttle me"].last_error && !r.items["throttle me"].asin, "429 recorded as error, nothing invented");
const bm = r.items["boom"];
check(bm.asin === "B0OLDGOOD0" && bm.price_cents === 100 && bm.last_error, "500 keeps LAST GOOD entry and notes the error");
check(r.items["nothing here"].status === "unmatched", "empty result → unmatched, not ok");
check(calls.every((c) => c.auth.startsWith("AWS4-HMAC-SHA256 Credential=TESTKEY/") && c.target.endsWith("SearchItems")), "every request carried a SigV4 Authorization header and the SearchItems target");
check(r.ok === 3 && r.unmatched === 2 && r.skipped === 1 && r.failed === 2, `tally ok=3 unmatched=2 skipped=1 failed=2 (got ${r.ok}/${r.unmatched}/${r.skipped}/${r.failed})`);

if (bad) { console.error(`\ntest_refresh: ${bad} failure(s)`); process.exit(1); }
console.log("\ntest_refresh OK");
