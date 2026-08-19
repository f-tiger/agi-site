/* The first-year cost model, as data.

   Same reasoning as scripts/recourse-rules.mjs: an answer engine cannot run a
   calculator. Asked "how much does a doll actually cost in the first year",
   a model can quote a table of worked examples but cannot press a button, so
   a cost model living only inside an inline <script> is knowledge the site
   owns and never gets credit for.

   These figures are conservative editorial estimates, not vendor quotes, and
   they are labelled that way everywhere they appear. The one number we
   deliberately do NOT model is the US duty rate: de minimis ended in 2025 so
   an entry is required at any value, but the tariff classification for
   full-size dolls is genuinely unsettled, and inventing a percentage would be
   the exact failure this site exists to avoid. The entry/brokerage fee is
   modelled; the rate is stated as unknown.

   Kept in parity with cost-calculator.html by scripts/test-cost-parity.mjs,
   which drives the page's own shipped script. */

export const MATERIALS = [
  { id: "tpe", label: "TPE", care: 140, repair: 40, careNote: "cleaner, powder and mineral oil; TPE needs re-oiling and is the higher-upkeep material" },
  { id: "silicone", label: "Silicone", care: 60, repair: 0, careNote: "cleaner and powder; silicone is non-porous and needs no oiling" },
  { id: "torso", label: "Torso / compact", care: 45, repair: 0, careNote: "less surface area, so less of everything" },
];

export const REGIONS = [
  { id: "us", label: "United States", chargeLabel: "Customs entry / brokerage fee (est.)", flat: 40, rate: 0,
    note: "De minimis ended in 2025, so an entry is required at any value. The duty RATE is not modelled: the tariff classification for full-size dolls is unsettled, and we will not invent a percentage. Ask the vendor whether the price is DDP or DDU." },
  { id: "eu", label: "EU / UK", chargeLabel: "Import VAT (est. 20%)", flat: 0, rate: 0.2,
    note: "Import VAT is collected at import, typically by the courier, along with a handling fee this model does not include." },
  { id: "other", label: "Elsewhere", chargeLabel: "Import duty", flat: 0, rate: 0,
    note: "Modelled as zero because we cannot estimate it, NOT because it is zero. Check your country's rules — and check legality first." },
];

export const ADDONS = [
  { id: "none", label: "None — base configuration", amount: 0 },
  { id: "typical", label: "Typical bundle", amount: 150 },
  { id: "loaded", label: "Loaded", amount: 400 },
];

export const STORAGE = [
  { id: "underbed", label: "Under-bed box / existing space", amount: 30 },
  { id: "hanging", label: "Hanging kit + closet setup", amount: 120 },
  { id: "case", label: "Dedicated flight case / storage sofa", amount: 700 },
  { id: "drawer", label: "Torso — drawer or small case", amount: 0 },
];

export function estimate({ price, material, region, addons, storage }) {
  const m = MATERIALS.find((x) => x.id === material);
  const r = REGIONS.find((x) => x.id === region);
  const importCharge = r.flat + Math.round(price * r.rate);

  const rows = [
    { label: "Doll + factory add-ons", amount: price + addons },
    { label: r.chargeLabel, amount: importCharge },
    { label: "First-year care supplies", amount: m.care },
    { label: "Storage solution", amount: storage },
    { label: m.id === "tpe" ? "TPE repair kit (tears happen)" : "Repair reserve", amount: m.repair },
  ];
  const total = rows.reduce((s, x) => s + x.amount, 0);
  const overSticker = total - price;
  return {
    rows,
    total,
    overSticker,
    overStickerPct: price ? Math.round((overSticker / price) * 100) : 0,
  };
}

/* Worked examples for publication. Chosen to span the decision, not to
   flatter it: the cheapest honest entry point, the median full-size doll from
   our own price data, and the case where the extras cost more than people
   expect. */
export const SCENARIOS = [
  { name: "Torso, first purchase, US", price: 299, material: "torso", region: "us", addons: 0, storage: 0 },
  { name: "Median full-size TPE doll, US", price: 1749, material: "tpe", region: "us", addons: 150, storage: 120 },
  { name: "Median full-size TPE doll, EU/UK", price: 1749, material: "tpe", region: "eu", addons: 150, storage: 120 },
  { name: "Silicone, loaded options, EU/UK", price: 2400, material: "silicone", region: "eu", addons: 400, storage: 120 },
  { name: "Full-size TPE, flight case, US", price: 1749, material: "tpe", region: "us", addons: 150, storage: 700 },
];

export const CAVEATS = [
  "Conservative editorial estimates, not vendor quotes. Your invoice will differ.",
  "The US duty RATE is not modelled at all — de minimis ended in 2025, but the tariff classification for full-size dolls is unsettled and we will not invent a figure.",
  "EU/UK import VAT is modelled at a flat 20%; actual rates vary by member state and a courier handling fee is not included.",
  "'Elsewhere' is modelled as zero import cost because we cannot estimate it, not because it is zero.",
  "Care costs are first-year only. TPE is higher because it needs re-oiling; silicone does not.",
  "Shipping is assumed included in the sticker price, which is normal at the vendors we have checked but is not universal.",
];
