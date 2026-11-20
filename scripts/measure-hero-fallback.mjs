// ENG-094: calibrate the weight-600 Times New Roman fallback to Fraunces at opsz144.
// next/font's automatic fallback measures the font's default opsz9/wght900, so it is
// too wide for the guaranteed two-line hero. Keep the automatic declaration and add
// one measured weight-600 fallback face (also the nearest match for card weight560).
// node scripts/measure-hero-fallback.mjs [http://127.0.0.1:3210]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fontkit = require("../node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit");
const baseURL = process.argv[2] ?? "http://127.0.0.1:3210";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await page.goto(`${baseURL}/en`);
  await page.evaluate(() => document.fonts.ready);
  const measured = await page.locator("#hero-title").evaluate(async (heading) => {
    const lines = [...heading.children].map((line) => line.textContent);
    const family = getComputedStyle(heading).fontFamily;
    const width = (text, fontFamily) => {
      const span = document.createElement("span"); span.textContent = text;
      Object.assign(span.style, { position: "absolute", whiteSpace: "pre", fontFamily, fontSize: "100px", fontWeight: "600", fontVariationSettings: '"opsz" 144', letterSpacing: "-.02em" });
      document.body.append(span); const result = span.getBoundingClientRect().width; span.remove(); return result;
    };
    const targetWidths = lines.map((line) => width(line, family));
    const localWidths = lines.map((line) => width(line, '"Times New Roman"'));
    const longest = targetWidths.indexOf(Math.max(...targetWidths));
    // Letter spacing is applied outside size-adjust: remove that contribution first.
    const letterSpacing = -.02 * 100 * lines[longest].length;
    const M = (targetWidths[longest] - letterSpacing) / (localWidths[longest] - letterSpacing);
    const face = new FontFace("MSRC Hero Calibration", 'local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT")', { weight: "600", sizeAdjust: `${M * 100}%` });
    document.fonts.add(await face.load());
    const calibratedWidths = lines.map((line) => width(line, '"MSRC Hero Calibration"'));
    return { lines, targetWidths, localWidths, calibratedWidths, letterSpacing, M };
  });
  const font = fontkit.openSync("node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2");
  const A = font.hhea.ascent / font.unitsPerEm / measured.M;
  const D = Math.abs(font.hhea.descent) / font.unitsPerEm / measured.M;
  console.log(JSON.stringify({ ...measured, A, D, css: { sizeAdjust: `${(measured.M * 100).toFixed(4)}%`, ascentOverride: `${(A * 100).toFixed(4)}%`, descentOverride: `${(D * 100).toFixed(4)}%`, lineGapOverride: "0%" } }, null, 2));
} finally { await browser.close(); }
