// ENG-094: measured photo/video contrast, including the brightest one-second title sample.
// node scripts/measure-hero-contrast.mjs [http://127.0.0.1:3210]
// Captures are decoded in memory; no screenshot files are written by this measurement.
import { chromium } from "@playwright/test";
import sharp from "sharp";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3210";
const luminance = ([r, g, b]) => [r, g, b].map((channel) => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((value, channel, index) => value + channel * [.2126, .7152, .0722][index], 0);
const colors = { h1: [237, 218, 175], kicker: [220, 207, 240], location: [220, 207, 240], attend: [248, 246, 240] };
const boxes = { h1: "#hero-title", kicker: ".hero-conference-name", location: ".hero-location" };

async function sample(locator, kind) {
  // Locator screenshots would wait for 'visible', which hidden text deliberately is not.
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No measurable ${kind} box`);
  const page = locator.page();
  const screenshot = await page.screenshot({ clip: { x: box.x, y: box.y, width: Math.max(1, box.width), height: Math.max(1, box.height) } });
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = [];
  let total = 0;
  for (let index = 0; index < data.length; index += info.channels) {
    const pixel = [data[index], data[index + 1], data[index + 2]];
    const light = luminance(pixel);
    pixels.push({ light, pixel }); total += light;
  }
  pixels.sort((a, b) => a.light - b.light);
  const p95 = pixels[Math.min(pixels.length - 1, Math.floor(pixels.length * .95))];
  const foreground = kind === "attend" ? colors.attend.map((channel, index) => .85 * channel + .15 * p95.pixel[index]) : colors[kind];
  const textLuminance = luminance(foreground);
  const contrast = (Math.max(textLuminance, p95.light) + .05) / (Math.min(textLuminance, p95.light) + .05);
  const threshold = kind === "h1" ? 3 : 4.5;
  return { box, backgroundP95: p95.light, backgroundMean: total / pixels.length, textLuminance, contrast, threshold, pass: contrast >= threshold };
}

async function seek(page, time) {
  await page.locator(".conference-hero video").evaluate(async (element, target) => {
    element.pause();
    if (Math.abs(element.currentTime - target) < .01 && element.readyState >= 2) return;
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`Seek timed out at ${target}s`)), 5000);
      element.addEventListener("seeked", () => { clearTimeout(deadline); resolve(); }, { once: true });
      element.currentTime = target;
    });
  }, time);
}

const browser = await chromium.launch();
let failed = false;
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 412, height: 839 }, { width: 1440, height: 900 }]) {
    for (const locale of ["en", "ar"]) {
      const page = await browser.newPage({ viewport, reducedMotion: "no-preference" });
      await page.goto(`${baseURL}/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".conference-hero video").waitFor({ state: "attached" });
      await page.waitForFunction(() => {
        const video = document.querySelector(".conference-hero video");
        return video instanceof HTMLVideoElement && Number.isFinite(video.duration) && video.readyState >= 2;
      });
      await page.waitForTimeout(1100);
      await page.addStyleTag({ content: "#hero-title,.hero-conference-name,.hero-location,.path-tile-description{visibility:hidden!important}.conference-hero *{animation-play-state:paused!important}" });
      const media = await page.locator(".conference-hero video").evaluate((video) => ({ source: video.currentSrc, duration: video.duration, poster: video.poster }));
      const captures = [];
      const capture = async (frame, time) => {
        const measures = {};
        for (const [kind, selector] of Object.entries(boxes)) measures[kind] = await sample(page.locator(selector), kind);
        captures.push({ frame, time, measures });
      };
      const posterStyle = await page.addStyleTag({ content: ".hero-media-video{opacity:0!important}.hero-media-poster{opacity:1!important}" });
      await capture("poster", null);
      await posterStyle.evaluate((style) => style.remove());
      for (const fraction of [0, .25, .5, .75]) {
        const time = fraction * media.duration;
        await seek(page, time);
        await capture(`${fraction * 100}%`, time);
      }
      let peak = { time: 0, mean: -1 };
      for (let time = 0; time < media.duration; time += 1) {
        await seek(page, time);
        const title = await sample(page.locator(boxes.h1), "h1");
        if (title.backgroundMean > peak.mean) peak = { time, mean: title.backgroundMean };
      }
      await seek(page, peak.time);
      await capture("brightest-1s-scan", peak.time);
      const attend = page.locator(".path-tile-description");
      await attend.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      const attendMeasure = await sample(attend, "attend");
      const pass = captures.every((frame) => Object.values(frame.measures).every((measure) => measure.pass)) && attendMeasure.pass;
      failed ||= !pass;
      console.log(JSON.stringify({ locale, viewport, media, peak, captures, attend: attendMeasure, pass }));
      await page.close();
    }
  }
} finally { await browser.close(); }
if (failed) process.exitCode = 1;
