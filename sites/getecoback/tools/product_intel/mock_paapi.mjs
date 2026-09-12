// Local stand-in for PA-API SearchItems, so the refresher can be exercised end
// to end with no credentials and no network. Same pattern as the trader's
// mock_alpaca: reproduce the response shape and the failure modes that would
// actually bite, then run the REAL refresher against it.
//
// Behaviour is keyed on the Keywords string so one server can serve every test:
//   "…EX105"       → a listing whose title does NOT contain EX105 (the AP98
//                    case) — refresher must refuse the ASIN and the price
//   "…MPPH-09CRN7" → a clean match with a price
//   "…20L"         → clean match, 20 L; "…25L" → clean match, 25 L
//   "…keller…"     → category term: items, but the refresher must not resolve
//   "throttle"     → 429 TooManyRequests
//   "boom"         → 500
//   anything else  → empty result set
import { createServer } from "node:http";

function item(asin, title, amount) {
  return {
    ASIN: asin,
    ItemInfo: { Title: { DisplayValue: title } },
    Offers: { Listings: [{ Price: { Amount: amount, Currency: "EUR" }, Availability: { Type: "Now" } }] },
  };
}

export function startMock(port = 0) {
  return new Promise((resolve) => {
    const calls = [];
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let kw = "";
        try { kw = JSON.parse(body).Keywords || ""; } catch { /* ignore */ }
        calls.push({ kw, auth: req.headers.authorization || "", target: req.headers["x-amz-target"] || "" });
        const k = kw.toLowerCase();
        const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
        if (k.includes("throttle")) return send(429, { Errors: [{ Code: "TooManyRequests" }] });
        if (k.includes("boom")) return send(500, { Errors: [{ Code: "InternalFailure" }] });
        if (k.includes("ex105")) return send(200, { SearchResult: { Items: [item("B0F3XL6LK6", "De'Longhi Pinguino GentleJet PAC AP98 Mobiles Klimagerät", 1199.0)] } });
        if (k.includes("mpph-09crn7")) return send(200, { SearchResult: { Items: [item("B07KJYD1ZP", "Comfee Mobiles Klimagerät MPPH-09CRN7, 9000 BTU", 289.99)] } });
        if (k.includes("25l")) return send(200, { SearchResult: { Items: [item("B0MOCK25L0", "MeacoDry Arete One 25L Luftentfeuchter", 279.0)] } });
        if (k.includes("20l")) return send(200, { SearchResult: { Items: [item("B0MOCK20L0", "MeacoDry Arete One 20L Luftentfeuchter und Luftreiniger", 239.0)] } });
        if (k.includes("keller")) return send(200, { SearchResult: { Items: [item("B0MOCKKELL", "Irgendein Luftentfeuchter mit Ablaufschlauch", 149.0)] } });
        return send(200, { SearchResult: { Items: [] } });
      });
    });
    server.listen(port, "127.0.0.1", () => resolve({ server, port: server.address().port, calls }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startMock(8787).then(({ port }) => console.log(`mock PA-API on http://127.0.0.1:${port}`));
}
