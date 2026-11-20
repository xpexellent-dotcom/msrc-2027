// ENG-094: normalized Arabic advances over every approved homepage display string.
// Start the local build, then: node scripts/measure-font-metrics.mjs [http://127.0.0.1:3210]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { homeDisplayStrings } from "./home-display-strings.mjs";
const require = createRequire(import.meta.url);
const fontkit = require("../node_modules/.pnpm/fontkit@2.0.4/node_modules/fontkit");

const baseURL = process.argv[2] ?? "http://127.0.0.1:3210";
let strings;
if (baseURL === "--files") {
  const approved = (await homeDisplayStrings()).ar;
  strings = [...approved.hero, ...approved.h2];
} else {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  await page.goto(`${baseURL}/ar`);
  strings = await page.locator("#hero-title > span, .homepage-journey h2").allTextContents();
 } finally { await browser.close(); }
}
const displayFile = "node_modules/@fontsource-variable/el-messiri/files/el-messiri-arabic-wght-normal.woff2";
const fallbackFile = "C:/Windows/Fonts/tahomabd.ttf";
const display = fontkit.openSync(displayFile);
const fallback = fontkit.openSync(fallbackFile);
const text = strings.join("");
const avgAdvance = (font) => {
  const run = font.layout(text);
  return run.positions.reduce((total, position) => total + position.xAdvance, 0) / text.length / font.unitsPerEm;
};
const M = avgAdvance(display) / avgAdvance(fallback);
const A = display.hhea.ascent / display.unitsPerEm / M;
const D = Math.abs(display.hhea.descent) / display.unitsPerEm / M;
console.log(JSON.stringify({ method: "avg normalized shaped advance of concatenated approved AR hero lines and every homepage h2; El Messiri default axis / Tahoma Bold; hhea metrics / unitsPerEm / M", strings, displayFile, fallbackFile, M, A, D, css: { sizeAdjust: `${(M * 100).toFixed(4)}%`, ascentOverride: `${(A * 100).toFixed(4)}%`, descentOverride: `${(D * 100).toFixed(4)}%`, lineGapOverride: "0%" } }, null, 2));
