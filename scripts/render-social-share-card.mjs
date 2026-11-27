import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { conferenceDateLabel } from "../src/config/conference.ts";
import { shareCardCopy, shareCardDomain, shareCardSize } from "../src/content/share-card.ts";

const output = new URL("../public/brand/share/", import.meta.url);
const embedded = async (path, mime) => {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  return `data:${mime};base64,${bytes.toString("base64")}`;
};

const [seal, fraunces, dmSans, arabicDisplay, arabicText] = await Promise.all([
  embedded("public/brand/identity/msrc27-seal-dark-456.webp", "image/webp"),
  embedded("node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2", "font/woff2"),
  embedded("node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2", "font/woff2"),
  embedded("node_modules/@fontsource-variable/el-messiri/files/el-messiri-arabic-wght-normal.woff2", "font/woff2"),
  embedded("node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2", "font/woff2"),
]);

await mkdir(output, { recursive: true });
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: shareCardSize, deviceScaleFactor: 1 });
  for (const [locale, copy] of Object.entries(shareCardCopy)) {
    await page.setContent(`<!doctype html>
      <html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
        <meta charset="utf-8">
        <style>
          @font-face { font-family: Fraunces; src: url("${fraunces}"); font-weight: 100 900; }
          @font-face { font-family: "DM Sans"; src: url("${dmSans}"); font-weight: 100 900; }
          @font-face { font-family: "El Messiri"; src: url("${arabicDisplay}"); font-weight: 400 700; }
          @font-face { font-family: "Noto Sans Arabic"; src: url("${arabicText}"); font-weight: 100 900; }

          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            color: #f8f6f0;
            background:
              radial-gradient(ellipse at 50% 22%, #4b2c80 0, #3b1e6d 31%, transparent 73%),
              #1f1930;
            font-family: "DM Sans", sans-serif;
            overflow: hidden;
          }
          .frame {
            position: absolute;
            inset: 26px;
            border: 1px solid #e8d5a53d;
            overflow: hidden;
          }
          .frame::before, .frame::after {
            content: "";
            position: absolute;
            top: 50%;
            width: 870px;
            aspect-ratio: 1;
            translate: 0 -50%;
            border: 1px solid #dccff022;
            border-radius: 50%;
            box-shadow: 0 0 0 24px #dccff00a, 0 0 0 54px #dccff009;
          }
          .frame::before { right: calc(100% - 215px); }
          .frame::after { left: calc(100% - 215px); }
          main {
            position: relative;
            width: 510px;
            text-align: center;
          }
          .seal { display: block; width: 170px; height: 170px; margin: 0 auto 12px; }
          .wordmark {
            margin: 0;
            font: 600 96px/1 Fraunces, serif;
            letter-spacing: -0.035em;
          }
          .title {
            margin: 12px auto 0;
            max-width: 440px;
            font-size: 35px;
            font-weight: 600;
            line-height: 1.13;
            text-wrap: balance;
          }
          .date, .year { color: #e8d5a5; }
          .date { margin: 22px 0 0; font-size: 30px; font-weight: 650; line-height: 1.35; }
          .institution { margin: 3px 0 0; color: #dccff0; font-size: 23px; line-height: 1.45; }
          .domain { margin: 18px 0 0; color: #e8d5a5; font-size: 18px; line-height: 1.2; }
          [lang="ar"] .title { font: 600 40px/1.22 "El Messiri", "DM Sans", sans-serif; }
          [lang="ar"] .date, [lang="ar"] .institution { font-family: "Noto Sans Arabic", "DM Sans", sans-serif; line-height: 1.55; }
        </style>
        <div class="frame" aria-hidden="true"></div>
        <main>
          <img class="seal" src="${seal}" alt="">
          <p class="wordmark" dir="ltr" lang="en">MSRC<span class="year">’27</span></p>
          <h1 class="title"></h1>
          <p class="date"></p>
          <p class="institution"></p>
          <p class="domain" dir="ltr" lang="en">${shareCardDomain}</p>
        </main>
      </html>`);

    await page.evaluate(async ({ title, date, institution }) => {
      document.querySelector(".title").textContent = title;
      document.querySelector(".date").textContent = date;
      document.querySelector(".institution").textContent = institution;
      await Promise.all([document.fonts.ready, document.images[0].decode()]);
    }, { ...copy, date: conferenceDateLabel(locale) });

    await page.screenshot({ path: fileURLToPath(new URL(`${locale}.png`, output)) });
  }
} finally {
  await browser.close();
}
