// ENG-094: measure the exact shipped face, weight, optical size and tracking in Chromium.
// Start the local build, then: node scripts/measure-hero-title.mjs [http://127.0.0.1:3210]
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { homeDisplayStrings } from "./home-display-strings.mjs";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3210";
const browser = await chromium.launch();
try {
  const approved = await homeDisplayStrings();
  for (const locale of ["en", "ar"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    if (baseURL === "--files") {
      const file = locale === "en" ? "fraunces/files/fraunces-latin-opsz-normal.woff2" : "el-messiri/files/el-messiri-arabic-wght-normal.woff2";
      const encoded = readFileSync(`node_modules/@fontsource-variable/${file}`).toString("base64");
      await page.setContent(`<html lang="${locale}"><style>@font-face{font-family:Measured;src:url(data:font/woff2;base64,${encoded});font-weight:100 900}h1{font-family:Measured;font-weight:${locale === "en" ? 600 : 700}}</style><h1 id="hero-title">${approved[locale].hero.map((line) => `<span>${line}</span>`).join("")}</h1></html>`);
    } else await page.goto(`${baseURL}/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    const result = await page.locator("#hero-title").evaluate((heading) => {
      const computed = getComputedStyle(heading);
      const lines = [...heading.children].map((span) => span.textContent);
      const widths = lines.map((text) => {
        const probe = document.createElement("span");
        probe.textContent = text;
        Object.assign(probe.style, {
          position: "absolute", visibility: "hidden", inlineSize: "max-content", whiteSpace: "pre",
          fontFamily: computed.fontFamily, fontWeight: computed.fontWeight, fontSize: "100px",
          fontVariationSettings: '"opsz" 144', letterSpacing: document.documentElement.lang === "ar" ? "0" : "-.02em",
        });
        document.body.append(probe);
        const width = probe.getBoundingClientRect().width;
        probe.remove();
        return width;
      });
      return { lines, widths, family: computed.fontFamily, weight: computed.fontWeight, opticalSize: 144, K: 1.03 * Math.max(...widths) / 100 };
    });
    console.log(JSON.stringify({ locale, ...result }, null, 2));
    await page.close();
  }
} finally { await browser.close(); }
