/* Fetches product image URLs from the vendor we promote (yourdoll.com, as their
   affiliate) and regenerates js/photos.js. Runs in GitHub Actions on a schedule
   using a real headless browser, because the site sits behind Cloudflare bot
   protection that 403s plain HTTP clients. State lives in scripts/photos.json
   so a failed fetch keeps the last good URL. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// key -> { url: search page to scan, n: which candidate image to take }
const SOURCES = {
  "banner":           { url: "https://www.yourdoll.com/?s=silicone+doll&post_type=product", n: 1 },
  "torso":            { url: "https://www.yourdoll.com/?s=torso&post_type=product", n: 0 },
  "compact-tpe":      { url: "https://www.yourdoll.com/?s=tpe+doll&post_type=product", n: 0 },
  "silicone":         { url: "https://www.yourdoll.com/?s=silicone+doll&post_type=product", n: 0 },
  "brand":            { url: "https://www.yourdoll.com/?s=wm+doll&post_type=product", n: 0 },
  "male":             { url: "https://www.yourdoll.com/?s=male+doll&post_type=product", n: 0 },
  "accessories":      { url: "https://www.yourdoll.com/?s=accessories&post_type=product", n: 0 },
};

const STATE = "scripts/photos.json";
const OUT = "js/photos.js";

const photos = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};

function filterImages(urls) {
  const seen = new Set();
  const out = [];
  for (const raw of urls) {
    if (!raw) continue;
    // srcset values contain "url width," pairs — split into url-like tokens
    for (let u of raw.split(/[\s,]+/)) {
      if (!/^https:\/\/(www\.)?yourdoll\.com\/wp-content\/uploads\//i.test(u)) continue;
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(u)) continue;
      const low = u.toLowerCase();
      if (/logo|banner|icon|favicon|payment|badge|flag|placeholder|supplier/.test(low)) continue;
      const dim = u.match(/-(\d{2,4})x(\d{2,4})\./);
      if (dim && Math.min(+dim[1], +dim[2]) < 250) continue; // brand chips, tiny thumbs
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  // Prefer reasonably-sized grid thumbnails over multi-MB originals
  const sized = out.filter((u) => {
    const d = u.match(/-(\d{2,4})x(\d{2,4})\./);
    return d && +d[1] <= 900;
  });
  // One entry per product: collapse both srcset variants (…-600x900.jpg) and
  // extra shots of the same model (cld159-9 / cld159-25 -> cld159).
  const byProduct = new Map();
  for (const u of sized.length ? sized : out) {
    const file = u.split("/").pop().replace(/-\d{2,4}x\d{2,4}\.\w+$/, "");
    const model = file.replace(/[-_]\d+$/, "").toLowerCase();
    if (!byProduct.has(model)) byProduct.set(model, u);
  }
  return [...byProduct.values()];
}

async function loadsForVisitors(url) {
  // Confirm the image is hotlinkable the way our site requests it.
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "image/*" },
      referrerPolicy: "no-referrer",
    });
    return res.ok && (res.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({
  userAgent: UA,
  viewport: { width: 1366, height: 900 },
  locale: "en-US",
});
const page = await context.newPage();

// Warm-up visit lets any bot-check cookie settle before the real scrapes.
try {
  await page.goto("https://www.yourdoll.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log("warm-up title:", await page.title());
} catch (e) {
  console.warn("warm-up failed:", e.message);
}

let changed = false;
const pageCache = new Map();
for (const [key, src] of Object.entries(SOURCES)) {
  try {
    let imgs = pageCache.get(src.url);
    if (!imgs) {
      await page.goto(src.url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(4000);
      const title = await page.title();
      if (/just a moment|attention required/i.test(title)) {
        await page.waitForTimeout(10000); // let the challenge resolve
      }
      // Trigger lazy-loaded product-grid images
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(1500);
      const raw = await page.evaluate(() => {
        // Scope to the WooCommerce product grid; fall back to all images
        const grid = document.querySelectorAll(
          "ul.products li.product img, .products .product img"
        );
        const nodes = grid.length ? grid : document.images;
        return Array.from(nodes).flatMap((i) => [
          i.currentSrc,
          i.src,
          i.getAttribute("data-src"),
          i.getAttribute("data-lazy-src"),
          i.getAttribute("srcset"),
          i.getAttribute("data-srcset"),
        ]);
      });
      imgs = filterImages(raw);
      pageCache.set(src.url, imgs);
      console.log(`${src.url} -> ${imgs.length} candidate images (title: ${title})`);
    }
    // Walk candidates from the requested index until one is hotlinkable
    let pick = null;
    for (let i = src.n; i < imgs.length && i < src.n + 5; i++) {
      if (await loadsForVisitors(imgs[i])) { pick = imgs[i]; break; }
      console.warn(`${key}: candidate not hotlinkable, trying next — ${imgs[i]}`);
    }
    if (pick && photos[key] !== pick) {
      photos[key] = pick;
      changed = true;
      console.log(`${key}: ${pick}`);
    } else if (!pick) {
      console.warn(`${key}: no usable image (keeping previous: ${photos[key] || "none"})`);
    } else {
      console.log(`${key}: unchanged`);
    }
  } catch (e) {
    console.warn(`${key}: scrape failed (${e.message.split("\n")[0]}) — keeping previous`);
  }
}
/* Bestsellers strip: the vendor's own "Most Loved" grid on their home page.
   We capture title, link and image so the site can show real current products
   instead of a static list that rots. */
let hotPicks = photos._hotPicks || [];
try {
  // The home page's "Most Loved" block is a lazy-loaded carousel that yields
  // almost nothing to a scraper. A popularity-sorted product listing is the
  // same signal, on the standard grid that reliably renders.
  await page.goto("https://www.yourdoll.com/?s=doll&post_type=product&orderby=popularity", {
    waitUntil: "domcontentloaded", timeout: 60000,
  });
  await page.waitForTimeout(3500);
  for (const frac of [0.25, 0.5, 0.75]) {
    await page.evaluate((f) => window.scrollTo(0, document.body.scrollHeight * f), frac);
    await page.waitForTimeout(1200);
  }
  const found = await page.evaluate(() => {
    // The vendor's "Most Loved" block is not a plain WooCommerce grid, so walk
    // product links directly and climb to whichever ancestor holds the card.
    const anchors = Array.from(document.querySelectorAll('a[href*="/product/"]'));
    const out = [];
    for (const a of anchors) {
      let card = a;
      for (let i = 0; i < 4 && card.parentElement; i++) {
        card = card.parentElement;
        if (card.querySelector("img") && /\$|USD/.test(card.textContent)) break;
      }
      const img = card.querySelector("img");
      if (!img) continue;
      const titleEl = card.querySelector("h2, h3, h4, .woocommerce-loop-product__title");
      const title = (titleEl ? titleEl.textContent : a.getAttribute("title") || a.textContent).trim();
      const priceEl = card.querySelector(".price, .amount, [class*=price]");
      out.push({
        url: a.href,
        title: title,
        img: img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "",
        price: priceEl ? priceEl.textContent.trim().replace(/\s+/g, " ") : "",
      });
    }
    return out;
  });
  /* Editorial guardrail. This strip publishes whatever the vendor is promoting,
     unreviewed, on our home page — so it must enforce our own adult-form policy
     rather than trust the vendor's merchandising. Anything whose stated height
     is under 140 cm is dropped unless the listing is explicitly a partial body
     (torso, head, hip and similar), where height is not a proxy for apparent
     age. Every exclusion is logged so the decision is auditable. */
  const PARTIAL = /(torso|head|hip|leg|arm|bust|breast|butt|body\s*part|onahole|mask)/i;
  function passesPolicy(title) {
    const m = title.match(/(\d{2,3})\s*cm/i);
    if (!m) return true;
    const cm = Number(m[1]);
    if (cm >= 140) return true;
    return PARTIAL.test(title);
  }

  /* Popularity sorting floats cheap accessories and payment links to the top,
     which is not what a bestsellers strip should show. Doll and torso listings
     state a height in the title; accessories do not — that is the cleanest
     discriminator available without a second request per product. */
  const ACCESSORY = /(wig|connector|cleaning|cleaner|care kit|sock|drying|storage case|stand|hanger|clothes|lingerie|powder|oil|repair|layaway|split payment|gift card|shipping|insurance|warranty)/i;
  function isDollListing(title, price) {
    if (!/(\d{2,3})\s*cm/i.test(title)) return false;
    if (ACCESSORY.test(title)) return false;
    return /[1-9]/.test((price || "").replace(/[^\d]/g, "").replace(/^0+$/, ""));
  }

  const seen = new Set();
  const picked = [];
  for (const p of found) {
    if (!p.url || !p.title || !p.img) continue;
    if (!/yourdoll\.com/.test(p.url)) continue;
    if (!isDollListing(p.title, p.price)) continue;
    if (!passesPolicy(p.title)) {
      console.log(`  policy-skip (sub-140cm full doll): ${p.title.slice(0, 60)}`);
      continue;
    }
    const model = p.img.split("/").pop().replace(/-\d{2,4}x\d{2,4}\.\w+$/, "").replace(/[-_]\d+$/, "").toLowerCase();
    if (seen.has(model)) continue;
    if (!(await loadsForVisitors(p.img))) continue;
    seen.add(model);
    picked.push({ title: p.title.slice(0, 70), url: p.url.split("?")[0], img: p.img, price: p.price.slice(0, 40) });
    if (picked.length === 8) break;
  }
  if (picked.length) {
    hotPicks = picked;
    changed = true;
    console.log(`hot picks: ${picked.length} products`);
    picked.forEach((p) => console.log(`  ${p.title} — ${p.price}`));
  } else {
    console.warn("hot picks: none found, keeping previous");
  }
} catch (e) {
  console.warn("hot picks: scrape failed (" + e.message.split("\n")[0] + ") — keeping previous");
}

await browser.close();

photos._hotPicks = hotPicks;
writeFileSync(STATE, JSON.stringify(photos, null, 2) + "\n");
const cardPhotos = Object.fromEntries(Object.entries(photos).filter(([k]) => !k.startsWith("_")));
writeFileSync(
  OUT,
  "/* AUTO-GENERATED by scripts/fetch-photos.mjs — do not edit by hand. */\n" +
    "Object.assign(window.DS_CONFIG.productPhotos, " +
    JSON.stringify(cardPhotos, null, 2) +
    ");\n" +
    "window.DS_CONFIG.hotPicks = " +
    JSON.stringify(hotPicks, null, 2) +
    ";\n"
);
console.log(changed ? "photos.js updated" : "no new photos");
