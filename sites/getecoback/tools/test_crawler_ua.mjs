// Unit test for the server-side crawler allowlist in src/worker.js.
//
// The allowlist is a list of regexes, which is exactly the kind of thing that
// rots silently: one typo and Googlebot stops being recorded, and the absence
// looks identical to "Google never came" — the very conclusion this data exists
// to support. So the regexes are executed here against real user-agent strings
// rather than eyeballed. Runs in CI with no network and no dependencies.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
const start = src.indexOf("const CRAWLERS = [");
const end = src.indexOf("\n}", src.indexOf("function crawlerName"));
if (start < 0 || end < 0) {
  console.error("FAIL: could not find CRAWLERS / crawlerName in src/worker.js");
  process.exit(1);
}
const { crawlerName } = await import(
  "data:text/javascript," + encodeURIComponent(src.slice(start, end + 2) + "\nexport { crawlerName };")
);

// Real user-agent strings. The negative cases matter as much as the positive
// ones: logging a human would turn a crawler counter into tracking.
const CASES = [
  ["Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "googlebot"],
  ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Safari/537.36", "googlebot"],
  ["Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "googlebot"],
  ["Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "bingbot"],
  ["Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)", "gptbot"],
  ["Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)", "oai-searchbot"],
  ["Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)", "chatgpt-user"],
  ["Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", "claudebot"],
  ["Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", "perplexity"],
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)", "applebot"],
  ["Mozilla/5.0 (compatible; DuckDuckBot-Https/1.1; https://duckduckgo.com/duckduckbot)", "duckduckbot"],
  ["Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)", "yandex"],
  ["CCBot/2.0 (https://commoncrawl.org/faq/)", "ccbot"],
  ["meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)", "meta-ai"],
  ["Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)", "ahrefs"],
  // Negatives — real browsers, the CI probe, and an empty header.
  ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", ""],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", ""],
  ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0", ""],
  ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", ""],
  ["getecoback-ci/1.0", ""],
  ["curl/8.5.0", ""],
  ["", ""],
];

let bad = 0;
for (const [ua, want] of CASES) {
  const got = crawlerName(ua);
  if (got !== want) {
    bad++;
    console.error(`FAIL  want ${want || "(none)"} got ${got || "(none)"}  ${ua.slice(0, 70)}`);
  }
}
if (bad) {
  console.error(`\ntest_crawler_ua: ${bad}/${CASES.length} failed`);
  process.exit(1);
}
console.log(`test_crawler_ua OK (${CASES.length} user agents, ${CASES.filter(c => c[1]).length} crawlers, ${CASES.filter(c => !c[1]).length} non-crawlers)`);
