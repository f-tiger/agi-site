/* Sends the owner-action items to Telegram, and nothing else.

   The restraint is the design. A notifier that reports everything it noticed
   trains its reader to stop reading it, and most of what this pipeline
   notices it has already fixed — a new page generated, a category qualified,
   a crawl delay retuned. None of that is worth a phone buzzing. Only items
   that need judgement, money, or an account we do not hold get sent, and if
   there are none, nothing is sent at all. A weekly "all quiet" message is
   still training someone to ignore the channel.

   Credentials come from GitHub Secrets and are never committed:
     TELEGRAM_BOT_TOKEN   from @BotFather
     TELEGRAM_CHAT_ID     your own chat id — message the bot once, then read
                          it from https://api.telegram.org/bot<TOKEN>/getUpdates

   Without them this exits 0 and prints the setup, because a missing optional
   integration is not a build failure — but it says so loudly rather than
   silently doing nothing, which is how an integration ends up believed-in and
   dead for a month. */

import { readFileSync, existsSync } from "node:fs";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;
const SRC = "content/trends.json";

if (!existsSync(SRC)) {
  console.error(`${SRC} not found — run scripts/detect-trends.mjs first.`);
  process.exit(1);
}
const trends = JSON.parse(readFileSync(SRC, "utf8"));
const items = trends.ownerActions || [];

if (!items.length) {
  console.log("No owner-action items this run. Nothing sent — a weekly 'all quiet' message is how a channel gets muted.");
  process.exit(0);
}

if (!TOKEN || !CHAT) {
  console.log("Telegram is not configured, so these were NOT sent:\n");
  for (const i of items) console.log(`  · ${i.summary}\n    → ${i.action}`);
  console.log(
    "\nTo turn this on, add two repository secrets:\n" +
    "  TELEGRAM_BOT_TOKEN  — create a bot with @BotFather\n" +
    "  TELEGRAM_CHAT_ID    — message your bot once, then read the chat id from\n" +
    "                        https://api.telegram.org/bot<TOKEN>/getUpdates\n" +
    "Nothing else changes; the next weekly run will deliver."
  );
  process.exit(0);
}

/* Telegram's MarkdownV2 escaping is unforgiving and a rejected message is a
   silent loss, so this sends plain text with no parse_mode at all. Formatting
   is not worth a dropped alert. */
const lines = [
  "DollScout — weekly, only what needs you",
  "",
];
for (const i of items) {
  lines.push(`• ${i.summary}`);
  for (const d of i.detail || []) lines.push(`   - ${d}`);
  if (i.confidence && i.confidence !== "n/a") {
    lines.push(`   [${i.confidence}${i.observations ? `, ${i.observations} observations` : ""}]`);
  }
  lines.push(`   → ${i.action}`);
  lines.push("");
}
const selfCount = (trends.selfImproving || []).length;
lines.push(
  selfCount
    ? `${selfCount} other change(s) were detected and already handled automatically — not listed here on purpose.`
    : "Everything else the pipeline noticed, it fixed itself."
);

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    chat_id: CHAT,
    text: lines.join("\n").slice(0, 4000),
    disable_web_page_preview: true,
  }),
});

if (!res.ok) {
  /* A failed notification must not fail the build — the site is fine, the
     messenger is not — but it must be visible in the run, not swallowed. */
  console.error(`Telegram rejected the message: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  process.exit(0);
}
console.log(`Sent ${items.length} owner-action item(s) to Telegram.`);
