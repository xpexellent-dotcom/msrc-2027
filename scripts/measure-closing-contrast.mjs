// ENG-094. Sample the rendered closing poster and four decoded film frames.
// node scripts/measure-closing-contrast.mjs [http://127.0.0.1:3240]
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3240";
const output = ".tools/home-v2/closing-contrast.json";
const luminance = (rgb) => rgb.map((channel) => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);

async function sample(page, selector, color, threshold, inset = 0) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Missing ${selector}`);
  const clip = { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset };
  const { data, info } = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const lights = [];
  for (let index = 0; index < data.length; index += info.channels) {
    lights.push(luminance([data[index], data[index + 1], data[index + 2]]));
  }
  lights.sort((a, b) => a - b);
  const background = lights[Math.min(lights.length - 1, Math.floor(lights.length * .95))];
  const foreground = luminance(color);
  const contrast = (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
  return { box, p95: background, textLuminance: foreground, contrast, threshold, pass: contrast >= threshold };
}

const browser = await chromium.launch();
const rows = [];
try {
  for (const locale of ["en", "ar"]) for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: "no-preference" });
    await page.goto(`${baseURL}/${locale}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".city-closing").scrollIntoViewIfNeeded();
    await page.locator(".city-media > img").evaluate((image) => image.decode());
    await page.waitForFunction(() => {
      const video = document.querySelector(".city-closing video");
      return video instanceof HTMLVideoElement && Number.isFinite(video.duration) && video.readyState >= 2;
    }, null, { timeout: 8000 });
    await page.waitForTimeout(1000);
    const video = page.locator(".city-closing video");
    const meta = await video.evaluate((node) => ({ src: node.currentSrc, duration: node.duration, poster: node.poster }));
    const dateColor = await page.locator(".closing-date").evaluate((node) => getComputedStyle(node).color);
    const dateRGB = dateColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    // Hide glyph paint while retaining the exact layout, scrim and background.
    await page.addStyleTag({ content: '#closing-title{color:transparent!important;-webkit-text-fill-color:transparent!important;background:none!important;text-shadow:none!important}.closing-date{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}.closing-date .sparkle{visibility:hidden!important}' });
    const captures = [];
    const capture = async (frame, time) => captures.push({
      frame, time,
      h2: await sample(page, "#closing-title", [237, 218, 175], 3),
      date: await sample(page, ".closing-date", dateRGB, 4.5, 1.5),
    });
    const posterStyle = await page.addStyleTag({ content: ".city-media video{opacity:0!important}" });
    await capture("poster", null);
    await posterStyle.evaluate((node) => node.remove());
    for (const fraction of [0, .25, .5, .75]) {
      const time = meta.duration * fraction;
      await video.evaluate(async (node, target) => {
        node.pause();
        if (Math.abs(node.currentTime - target) < .01 && node.readyState >= 2) return;
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("seek timeout")), 4000);
          node.addEventListener("seeked", () => { clearTimeout(timeout); resolve(); }, { once: true });
          node.currentTime = target;
        });
      }, time);
      await capture(`${fraction * 100}%`, time);
    }
    const row = {
      locale, width, meta, dateColor, captures,
      renderedScrim: await page.locator(".city-closing").evaluate((node) => getComputedStyle(node).getPropertyValue("--scrim-closing")),
      pass: captures.every((capture) => capture.h2.pass && capture.date.pass),
    };
    rows.push(row);
    console.log(JSON.stringify({ locale, width, minH2: Math.min(...captures.map((capture) => capture.h2.contrast)), minDate: Math.min(...captures.map((capture) => capture.date.contrast)), pass: row.pass }));
    await page.close();
  }
} finally {
  await browser.close();
  mkdirSync(".tools/home-v2", { recursive: true });
  writeFileSync(output, JSON.stringify(rows, null, 2) + "\n");
}
if (rows.some((row) => !row.pass)) process.exitCode = 1;
