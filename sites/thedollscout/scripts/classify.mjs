/* Decides whether a listing is a partial body, and whether it may be kept.

   This is a safety file, not a data-tidiness one. The height rule — nothing
   under 140 cm unless the listing is explicitly a partial body — exists
   because on a whole doll a small stated height is a proxy for apparent age,
   while on a torso or a head it is not. Which means EVERY false "this is a
   partial body" punches a hole in that rule: a sub-140 cm whole doll wearing
   a mislabel walks straight through.

   That has now happened twice, from the same cause both times — a body-part
   word matched inside an unrelated one:

     "Head #266"          → matched `head`, so whole dolls carrying a head
                            code were read as heads. Fixed by stripping codes.
     "Ready to Ship"      → matched `hip`. A 150 cm whole doll was filed as a
                            torso, and any sub-140 cm doll whose title said
                            "Ready to Ship" would have passed the guard.

   So the asymmetry is made explicit here. Under-detecting a partial body
   costs us a row of data. Over-detecting one costs us the guard. When the
   two conflict, lose the row.

   Two tiers:
     - Definitive nouns name a product that is unambiguously not a whole body.
     - Soft nouns ("breast", "hips", "head") appear constantly in whole-doll
       titles as descriptions or options, so they only count when the title
       does NOT state a full-body height. A listing that says "160cm" is a
       160 cm doll, whatever else the title mentions. */

/* Word-boundaried, always. The bug this file exists for was an unanchored
   substring, and every pattern below would reintroduce it without \b. */
const DEFINITIVE = /\b(torso|torsos|onahole|masturbator|half[-\s]?body|body\s*part)\b/i;
const SOFT = /\b(bust|breasts?|hips?|legs?|arms?|butt|buttocks?|ass|head|heads|mask)\b/i;

/* "Head #266", "Head GE95-1", "Movable Jaw Head M5" — a head CODE on a whole
   doll. Stripped before testing so the code cannot be read as the product.
   Note this does not catch a trailing bare "ROS Max Head", which is why the
   soft tier is gated on stated height rather than trusted on its own. */
export const stripHeadCodes = (t) => String(t).replace(/\bhead\s*#?\s*[A-Za-z0-9-]+/gi, " ");

/* Heights are sometimes decimal ("49.5cm"), which an integer-only pattern
   once mis-read as 33 cm from a 49.5 cm product. */
export function statedHeightCm(title) {
  const m = String(title).match(/(\d{2,3}(?:\.\d+)?)\s*cm/i);
  return m ? Number(m[1]) : null;
}

export function isPartialBody(title) {
  const stripped = stripHeadCodes(title);
  if (DEFINITIVE.test(stripped)) return true;
  const h = statedHeightCm(title);
  /* A stated full-body height beats a soft noun. "160cm … ROS Max Head" is a
     160 cm doll that mentions a head, not a head. */
  if (h !== null && h >= 140) return false;
  return SOFT.test(stripped);
}

/* Accessory pages carry the spec table of the doll they FIT, so a $129 hoodie
   was once collected as a 163cm/115lb "doll" — a full-size doll at
   counterfeit-zone pricing, the exact counter-example to our own published
   finding. */
export const ACCESSORY = /\b(cloth|clothes|clothing|hoodie|outfit|wig|lingerie|dress|apparel|costume|uniform|stocking|shoes?)\b/i;

export function passesPolicy(title) {
  if (ACCESSORY.test(title)) return false;
  const h = statedHeightCm(title);
  if (h === null) return true;
  return h >= 140 || isPartialBody(title);
}

/* A parse can fail by returning a number rather than nothing, and a number
   survives every check a null would have failed. Two 160 cm dolls came back
   at 2.5 kg — a shipping or head weight — and those two rows alone moved the
   site's published full-size weight floor from 43 lb to 6 lb.

   The threshold sits far below the lightest whole doll ever recorded here
   (43 lb / 19.5 kg) so it rejects impossibilities without trimming the low
   end of a real distribution. */
export const IMPLAUSIBLE_KG = 15;

export function implausibleWeight({ title, heightCm, weightKg }) {
  if (isPartialBody(title)) return false;
  if (!(Number(heightCm) >= 140)) return false;
  return Number(weightKg) < IMPLAUSIBLE_KG;
}
