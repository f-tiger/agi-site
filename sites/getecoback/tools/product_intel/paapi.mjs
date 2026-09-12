// Amazon Product Advertising API 5 client — the sanctioned way to ask Amazon
// what it actually sells under a name, for how much, and under which ASIN.
//
// Why this exists: every price on this site says "Preis vor Ort prüfen" and
// every ASIN was verified by hand — and the hand-verified one for the site's
// best-selling product turned out to point at a different product (the
// EX105/AP98 case, closed 2026-08-31). Amazon knows the answer to both
// questions and publishes it through this API to Associates. Scraping the
// storefront is not an alternative: it breaks the terms and the runners get
// blocked.
//
// Credentials come from the environment only. Without them the client throws
// at construction, and the refresher never gets this far — see refresh.mjs.
//
// SigV4 is implemented here rather than pulled from a dependency so that the
// runner needs nothing installed; the core is checked against a published AWS
// test vector by `node paapi.mjs --selftest`.
import { createHash, createHmac } from "node:crypto";

const sha256hex = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key, s) => createHmac("sha256", key).update(s, "utf8").digest();

export function signV4({ method, host, path, query = "", headers, body, accessKey, secretKey, region, service, amzDate }) {
  const dateStamp = amzDate.slice(0, 8);
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const signedHeaders = Object.keys(lower).sort().join(";");
  const canonicalHeaders = Object.keys(lower).sort().map((k) => `${k}:${lower[k]}\n`).join("");
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, sha256hex(body)].join("\n");
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  return {
    signature,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export class PaapiClient {
  constructor(env = process.env) {
    this.accessKey = env.PAAPI_ACCESS_KEY;
    this.secretKey = env.PAAPI_SECRET_KEY;
    this.partnerTag = env.PAAPI_PARTNER_TAG || "getecoback-21";
    this.host = env.PAAPI_HOST || "webservices.amazon.de";
    this.region = env.PAAPI_REGION || "eu-west-1";
    this.marketplace = env.PAAPI_MARKETPLACE || "www.amazon.de";
    // Tests point this at the mock; production leaves it unset.
    this.endpoint = env.PAAPI_ENDPOINT || `https://${this.host}`;
    if (!this.accessKey || !this.secretKey) {
      throw new Error("PAAPI_ACCESS_KEY / PAAPI_SECRET_KEY not set");
    }
  }

  async searchItems(keywords, { itemCount = 3 } = {}) {
    const path = "/paapi5/searchitems";
    const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
    const body = JSON.stringify({
      Keywords: keywords,
      SearchIndex: "All",
      ItemCount: itemCount,
      PartnerTag: this.partnerTag,
      PartnerType: "Associates",
      Marketplace: this.marketplace,
      Resources: [
        "ItemInfo.Title",
        "Offers.Listings.Price",
        "Offers.Listings.Availability.Message",
        "Offers.Listings.Availability.Type",
      ],
    });
    const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const headers = {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      host: this.host,
      "x-amz-date": amzDate,
      "x-amz-target": target,
    };
    const { authorization } = signV4({
      method: "POST", host: this.host, path, headers, body,
      accessKey: this.accessKey, secretKey: this.secretKey,
      region: this.region, service: "ProductAdvertisingAPI", amzDate,
    });
    const res = await fetch(this.endpoint + path, {
      method: "POST",
      headers: { ...headers, authorization },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* handled below */ }
    if (!res.ok) {
      const err = new Error(`PA-API ${res.status}: ${(json && json.Errors && json.Errors[0] && json.Errors[0].Code) || text.slice(0, 120)}`);
      err.status = res.status;
      throw err;
    }
    const items = (json && json.SearchResult && json.SearchResult.Items) || [];
    return items.map((it) => {
      const listing = (((it.Offers || {}).Listings) || [])[0] || {};
      const price = listing.Price || {};
      return {
        asin: it.ASIN || "",
        title: ((it.ItemInfo || {}).Title || {}).DisplayValue || "",
        price_cents: typeof price.Amount === "number" ? Math.round(price.Amount * 100) : null,
        currency: price.Currency || null,
        availability: ((listing.Availability || {}).Type) || null,
      };
    });
  }
}

// Independent check of the signing core against the AWS SigV4 test suite's
// "get-vanilla" vector. It signs a bare GET, not a PA-API call, so a pass says
// the HMAC chain and canonicalisation are right; a failure means do not ship.
if (process.argv.includes("--selftest")) {
  const { signature } = signV4({
    method: "GET", host: "example.amazonaws.com", path: "/", query: "",
    headers: { Host: "example.amazonaws.com", "X-Amz-Date": "20150830T123600Z" },
    body: "", accessKey: "AKIDEXAMPLE", secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    region: "us-east-1", service: "service", amzDate: "20150830T123600Z",
  });
  const want = "5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31";
  if (signature === want) { console.log("sigv4 selftest OK (aws get-vanilla vector)"); process.exit(0); }
  console.error(`sigv4 selftest FAIL\n got  ${signature}\n want ${want}`); process.exit(1);
}
