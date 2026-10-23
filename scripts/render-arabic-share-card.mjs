// Renders the Arabic link-preview card to public/og/msrc-2027-ar.png.
//
// The App Router image renderer (satori) cannot shape Arabic: Noto Sans Arabic's GSUB
// tables throw "lookupType: 5 - substFormat: 3 is not yet supported". A real browser shapes
// it correctly, so the Arabic card is rendered once here and served statically by
// src/app/[locale]/opengraph-image.tsx. Rerun after changing the dates or the copy below:
//
//   node scripts/render-arabic-share-card.mjs
//
// Layout and palette mirror the English card in opengraph-image.tsx, mirrored for RTL.
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
// Inline the fonts: a page set from a string cannot load file: URLs.
const dataUrl = (path, type) => `data:${type};base64,${readFileSync(path).toString("base64")}`;

// Same strings as the site: footer institution, public-site kicker and the confirmed dates.
const copy = {
  institution: "جامعة الملك عبدالعزيز · جدة",
  name: "المؤتمر الخامس لأبحاث طلاب الطب",
  dates: "٢٧–٢٨ يناير ٢٠٢٧",
};

const arabicFont = dataUrl(require.resolve("@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2"), "font/woff2");
// The English card uses the image renderer's bundled Geist; reuse it for the Latin wordmark.
const latinFont = dataUrl(join(dirname(require.resolve("next/package.json")), "dist/compiled/@vercel/og/Geist-Regular.ttf"), "font/ttf");

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face { font-family: "Card Arabic"; src: url("${arabicFont}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Card Latin"; src: url("${latinFont}") format("truetype"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; }
body { display: flex; flex-direction: column; justify-content: space-between; padding: 72px 84px; color: #F8F6F0;
  background: linear-gradient(135deg, #1F1930 0%, #2A1850 55%, #3B1E6D 100%); font-family: "Card Arabic", sans-serif; }
.top { display: flex; justify-content: space-between; align-items: center; font-size: 28px; font-weight: 500; color: #DCCFF0; }
.address { font-family: "Card Latin"; font-size: 24px; color: #C9A24A; letter-spacing: 1px; }
.mark { display: flex; direction: ltr; justify-content: flex-end; align-items: flex-end; font-family: "Card Latin"; }
.mark b { font-weight: 400; font-size: 210px; letter-spacing: -12px; line-height: .9; }
.mark span { font-size: 76px; color: #C9A24A; margin-left: 28px; margin-bottom: 12px; }
.name { font-size: 46px; font-weight: 600; margin-top: 28px; }
.dates { display: flex; align-items: center; gap: 28px; font-size: 34px; font-weight: 500; color: #DCCFF0; }
.dates i { width: 100px; height: 6px; border-radius: 3px; background: #C9A24A; }
</style></head><body>
<div class="top"><span>${copy.institution}</span><span class="address">msrc2027.com</span></div>
<div><div class="mark"><b>MSRC</b><span>2027</span></div><p class="name">${copy.name}</p></div>
<div class="dates"><i></i><span>${copy.dates}</span></div>
</body></html>`;

const output = join(root, "public/og/msrc-2027-ar.png");
mkdirSync(dirname(output), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: "png" });
  // Palette PNG keeps the card well under the ~300 KB some messaging apps accept for previews.
  // sharp ships with Next; resolve it from there rather than adding a direct dependency.
  const sharp = createRequire(require.resolve("next/package.json"))("sharp");
  await sharp(shot).png({ palette: true, quality: 92, effort: 10, dither: 1 }).toFile(output);
} finally {
  await browser.close();
}
console.log(`Wrote ${output}`);
