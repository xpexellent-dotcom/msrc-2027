// ENG-094: cold-page first-paint network bodies, not package estimates or transfer headers.
// node scripts/measure-home-font-payload.mjs [http://127.0.0.1:3210]
import { chromium } from "@playwright/test";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3210";
const before = { en: 110024, ar: 275984 }; // Cold baseline observed at ae3b9e3 on 4 Nov 2026.
const browser = await chromium.launch();
try {
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const fonts = [];
    const pending = [];
    page.on("response", (response) => {
      if (response.url().includes(".woff2")) pending.push(response.body().then((body) => fonts.push({ file: new URL(response.url()).pathname.split("/").at(-1), bytes: body.length })));
    });
    await page.goto(`${baseURL}/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await Promise.all(pending);
    console.log(JSON.stringify({ locale, fonts, total: fonts.reduce((sum, font) => sum + font.bytes, 0), before: before[locale] }, null, 2));
    await page.close();
  }
} finally { await browser.close(); }
