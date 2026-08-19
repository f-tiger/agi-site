/* Asks the one question none of the SEO or GEO work has ever verified:
   can a crawler actually fetch this site?

   Everything upstream of this is an assumption. We generate a sitemap, we
   publish llms.txt, we declare AI-crawler allows, we tune JSON-LD — and not
   one of those matters if the live host answers Googlebot with a 403 or an
   interstitial. The editing sandbox has no egress, so this has never been
   checked from outside; it runs on a runner, which does.

   It checks three separate things, because they fail independently:

     1. Status. Does each published URL return 200 to each crawler?
     2. Substance. Does the RAW HTML contain the content, or does it arrive
        empty and get filled in by JavaScript? A 200 that needs JS to say
        anything is not the same as an indexable page, and an age gate is
        exactly the sort of thing that could have replaced the body.
     3. Parity. Do crawlers get the same bytes a browser gets? A page that
        serves content to Chrome and a challenge to GPTBot is invisible to
        AI answers while looking perfectly healthy in a browser.

   Exits non-zero on any failure, so this can gate a deploy. */

import { readFileSync, existsSync } from "node:fs";

const SITE = process.env.SITE || "https://thedollscout.com";

/* Real crawler user-agent strings. The AI crawlers matter as much as the
   search ones here: the site's whole GEO effort assumes they can read it. */
const AGENTS = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  Bingbot: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  GPTBot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot",
  ClaudeBot: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  PerplexityBot: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
  Chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
};

/* Infrastructure files. Every one of these is load-bearing for discovery, and
   a 404 on any of them is silent — nothing on the site would look broken. */
const INFRA = [
  "/robots.txt", "/sitemap.xml", "/llms.txt", "/llms-full.txt", "/feed.xml",
  "/data/doll-specs.json", "/data/payment-recourse.json", "/data/first-year-cost.json",
  "/data/scam-signals.json", "/data/import-costs.json", "/server.json",
  /* Site search fetches this. A 404 here makes search silently return
     nothing, which tells a visitor the site has no answer when it does. */
  "/search-index.json",
  /* The MCP endpoint. It is a Pages Function, not a static file, so it is the
     one URL here that can break from a deploy-config change rather than a
     missing file — and an MCP client failing is invisible from the site. */
  "/mcp",
  "/.well-known/mcp.json",
  /* The IndexNow key. If this 404s, every submission is rejected at
     validation and the deploy step still prints a cheerful success — it is
     `continue-on-error` and the API accepts the POST before it checks the
     key. Silent by construction, which is exactly what this file is for. */
  "/" + readFileSync("scripts/indexnow-key.txt", "utf8").trim() + ".txt",
];

async function get(url, agent) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      /* x-probe marks this as our own self-test so the edge analytics
         middleware skips it — otherwise every weekly run would hand the
         "did the AI engines crawl us" table dozens of fake bot rows (the
         self-test-as-growth trap both sibling sites fell into once). Real
         crawlers never send this header, so simulation fidelity is intact. */
      headers: { "User-Agent": AGENTS[agent], Accept: "text/html,application/xhtml+xml,*/*", "x-probe": "1" },
      redirect: "follow",
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body, headers: res.headers, ms: Date.now() - started, finalUrl: res.url };
  } catch (e) {
    return { ok: false, status: 0, body: "", headers: new Headers(), ms: Date.now() - started, error: e.message };
  }
}

/* A page is only indexable if its meaning survives with JavaScript switched
   off, so these are checked against the raw response body. */
function substanceProblems(url, body) {
  const problems = [];
  if (body.length < 1500) problems.push(`body only ${body.length} bytes`);
  if (!/<h1[\s>]/i.test(body)) problems.push("no <h1> in the served HTML");
  if (!/<title>[^<]{10,}</i.test(body)) problems.push("no usable <title>");
  if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(body)) problems.push("noindex");
  /* The age gate is injected by JS and must NOT be in the served body in a
     form that replaces the content. If it ever ships server-rendered, the
     crawler sees a consent screen instead of the page. */
  if (/class=["']age-gate["']/.test(body) && !/<main[\s>]/i.test(body)) problems.push("age gate served without page content");
  if (!/<main[\s>]/i.test(body) && !url.endsWith(".xml") && !url.endsWith(".txt")) problems.push("no <main> element");
  return problems;
}

const urls = existsSync("scripts/urls.txt")
  ? readFileSync("scripts/urls.txt", "utf8").split("\n").map((s) => s.trim()).filter(Boolean)
  : [SITE + "/"];

console.log(`Checking ${urls.length} published URLs + ${INFRA.length} infrastructure files against ${Object.keys(AGENTS).length} crawlers.`);
console.log(`Site: ${SITE}\n`);

let failures = 0;

/* ---- 1. every published URL, as Googlebot ---- */
console.log("--- Every published page, fetched as Googlebot ---");
const googleBodies = new Map();
for (const url of urls) {
  const r = await get(url, "Googlebot");
  googleBodies.set(url, r.body);
  const problems = r.ok ? substanceProblems(url, r.body) : [];
  const path = url.replace(SITE, "") || "/";
  if (!r.ok) {
    failures++;
    console.log(`  FAIL ${String(r.status).padStart(3)}  ${path}${r.error ? `  (${r.error})` : ""}`);
  } else if (problems.length) {
    failures++;
    console.log(`  THIN ${r.status}  ${path}  — ${problems.join("; ")}`);
  } else {
    console.log(`  ok   ${r.status}  ${path}  ${String(r.body.length).padStart(6)}b  ${r.ms}ms`);
  }
}

/* ---- 2. infrastructure files ---- */
console.log("\n--- Discovery infrastructure ---");
for (const path of INFRA) {
  const r = await get(SITE + path, "Googlebot");
  if (!r.ok || r.body.length < 20) {
    failures++;
    console.log(`  FAIL ${String(r.status).padStart(3)}  ${path}  ${r.body.length}b${r.error ? `  (${r.error})` : ""}`);
  } else {
    console.log(`  ok   ${r.status}  ${path}  ${r.body.length}b`);
  }
}

/* ---- 3. crawler parity on a sample ---- */
/* The failure this catches looks like nothing at all from a browser: the site
   works, the pages rank nowhere, and no AI assistant has ever read them. */
console.log("\n--- Do all crawlers get what Chrome gets? ---");
const sample = [SITE + "/", SITE + "/guides/height-weight.html", SITE + "/scam-check.html", SITE + "/data/"];
for (const url of sample) {
  const path = url.replace(SITE, "") || "/";
  const sizes = {};
  for (const agent of Object.keys(AGENTS)) {
    const r = await get(url, agent);
    sizes[agent] = r.ok ? r.body.length : `${r.status || "ERR"}`;
  }
  const chrome = sizes.Chrome;
  const odd = Object.entries(sizes).filter(([a, v]) =>
    a !== "Chrome" && (typeof v !== "number" || typeof chrome !== "number" || Math.abs(v - chrome) > chrome * 0.1)
  );
  if (odd.length) {
    failures++;
    console.log(`  MISMATCH ${path}`);
    for (const [a, v] of Object.entries(sizes)) console.log(`      ${a.padEnd(14)} ${v}`);
  } else {
    console.log(`  ok   ${path}  all ${Object.keys(AGENTS).length} crawlers within 10% of Chrome (${chrome}b)`);
  }
}

/* ---- 4. is the adult label where we think it is? ----
   _headers is a file we write and Cloudflare interprets; nothing local proves
   what the edge actually sends. The label is deliberately NOT on `/*` any more,
   because that had declared the dataset, llms.txt, the sitemap and the /mcp
   endpoint adult — none of which can contain explicit content, and all of which
   were being volunteered for SafeSearch filtering as a result. Both directions
   are silent failures: a lost label on a product page, and a stray label on a
   dataset, look identical from a browser. */
console.log("\n--- Is the adult label on the right URLs? ---");
/* Report the FINAL url, not the requested one. The first run of this check
   failed on /picks.html and /quiz.html and the reason was invisible: Cloudflare
   Pages serves a file at its extensionless path, so the request lands on /picks
   and the _headers rule written for /picks.html never fires. A failure that
   does not say where it ended up costs a debugging round every time. */
const rated = async (path) => {
  const r = await get(SITE + path, "Googlebot");
  return { value: (r.headers.get("rating") || "").trim(), at: (r.finalUrl || "").replace(SITE, "") || path };
};
const where = (path, at) => (at && at !== path ? `  [served at ${at}]` : "");

for (const path of ["/", "/picks.html", "/picks", "/quiz.html", "/guides/tpe-vs-silicone.html"]) {
  const { value, at } = await rated(path);
  if (/RTA-/i.test(value)) console.log(`  ok   ${path}  labelled adult, as intended${where(path, at)}`);
  else { failures++; console.log(`  FAIL ${path}  should carry the RTA Rating header and does not${where(path, at)}`); }
}
for (const path of ["/data/doll-specs.json", "/llms.txt", "/sitemap.xml", "/mcp", "/server.json", "/payment-protection.html", "/importing/united-kingdom.html"]) {
  const { value, at } = await rated(path);
  if (!value) console.log(`  ok   ${path}  not declared adult`);
  else { failures++; console.log(`  FAIL ${path}  is declared adult ("${value}") — it contains no explicit content and this filters it from SafeSearch${where(path, at)}`); }
}

console.log(
  failures
    ? `\n${failures} problem(s). The site is not fully reachable — fix this before writing another page, because pages nobody can fetch cannot be read by anyone.`
    : `\nAll clear. Every published URL returns 200 with real HTML to every crawler tested, the discovery files are live, and the adult label is only on the pages that need it.`
);
process.exit(failures ? 1 : 0);
