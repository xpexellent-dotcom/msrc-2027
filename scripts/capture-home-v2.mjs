// ORG-072 / ENG-094. Opt-in local visual receipt; never starts or deploys a server.
// MSRC_QA_CAPTURE=1 node scripts/capture-home-v2.mjs http://127.0.0.1:3240 --scope=home
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, expect } from "@playwright/test";

if (process.env.MSRC_QA_CAPTURE !== "1") {
  console.log("Capture disabled: set MSRC_QA_CAPTURE=1 to write .tools/home-v2 screenshots.");
  process.exit(0);
}

const baseURL = process.argv.find((value) => /^https?:\/\//.test(value)) ?? "http://127.0.0.1:3240";
const scope = process.argv.find((value) => value.startsWith("--scope="))?.split("=")[1] ?? "all";
if (!["all", "home", "interior"].includes(scope)) throw new Error("--scope must be home, interior or all");
const output = resolve(".tools/home-v2");
await mkdir(output, { recursive: true });
const index = { baseURL, scope, capturedAt: new Date().toISOString(), screenshots: [], routes: [], failures: [] };
const browser = await chromium.launch();
const widths = [320, 390, 430, 600, 768, 1024, 1280, 1440, 1920];
const sections = [
  ["hero", ".conference-hero"], ["belt", ".sponsor-belt"], ["paths", "#participate"],
  ["program", "#program"], ["speakers", "#speakers"], ["legacy", ".legacy-section"],
  ["venue", "#venue"], ["faq", "#faq"], ["closing", ".city-closing"],
  ["footer", ".site-footer"], ["header", ".axiom-header"],
];
const interiors = ["participate", "program", "speakers", "registration", "abstracts", "workshops", "hackathon", "3mt", "dates-venue", "contact", "sponsors", "team", "privacy", "terms", "sign-in", "sign-up", "my-msrc", "submissions"];
const workflowConfig = { "sign-in": "playwright.auth.config.ts", "sign-up": "playwright.auth.config.ts", "my-msrc": "playwright.participant.config.ts", submissions: "playwright.abstracts.config.ts" };
const height = (width) => width < 768 ? 844 : width < 1024 ? 1024 : 900;
const saveIndex = () => writeFile(resolve(output, `capture-index-${scope}.json`), JSON.stringify(index, null, 2) + "\n");

async function ready(page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.locator("body").waitFor({ state: "visible" });
  if (await page.locator(".menu-toggle").count()) await expect(page.locator(".menu-toggle")).toBeEnabled();
}

async function readyImage(img) {
  await img.scrollIntoViewIfNeeded();
  // A full-page QA image needs every supplied visible portrait. Explicitly
  // request the asset after scrolling it into view; Chromium can otherwise
  // leave distant portraits in its native lazy-load queue. This capture-only
  // request does not change the site's loading policy.
  await img.evaluate(async (node) => {
    node.loading = "eager";
    await new Promise(requestAnimationFrame);
    // Freeze the browser-selected candidate for this fixed-size capture. Changing
    // candidates during decode can strand Chromium's lazy portrait promise.
    const selected = node.currentSrc || node.src;
    node.removeAttribute("srcset");
    node.src = selected;
    await node.decode();
  });
  await expect.poll(() => img.evaluate((node) => node.complete && node.naturalWidth > 0), { message: `Visible image must load: ${await img.getAttribute("src")}` }).toBe(true);
}

async function capture(page, pageName, section, locale, width, selector) {
  const filename = `${pageName}-${section}-${locale}-${width}.png`;
  try {
    if (selector) {
      const element = page.locator(selector).first();
      if (!await element.count()) {
        index.screenshots.push({ filename, status: "ABSENT", selector });
        return;
      }
      await element.scrollIntoViewIfNeeded();
      // A long section can contain lazy images outside its visible portion.
      // Bring each through the viewport before decoding, then restore the rail's
      // reading start and the section framing for a deterministic capture.
      for (const img of await element.locator("img").all()) {
        if (!await img.isVisible()) continue;
        await readyImage(img);
      }
      await element.locator(".rail-track").evaluateAll((rails) => rails.forEach((rail) => rail.scrollTo({ left: 0, behavior: "instant" })));
      await element.scrollIntoViewIfNeeded();
      if (section === "hero") await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
      await element.screenshot({ path: resolve(output, filename), animations: "disabled", style: ["hero", "header"].includes(section) ? undefined : ".site-header { visibility: hidden !important; }" });
    } else {
      if (section !== "boundary") await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: resolve(output, filename), fullPage: section === "full", animations: "disabled" });
    }
    index.screenshots.push({ filename, status: "CAPTURED" });
  } catch (error) {
    index.failures.push({ filename, error: String(error) });
  }
}

async function home() {
  for (const locale of ["en", "ar"]) for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: height(width) }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}/${locale}`, { waitUntil: "domcontentloaded" });
    await ready(page);
    index.routes.push({ route: `/${locale}`, width, status: response?.status(), motion: "reduce" });
    for (const [section, selector] of sections) await capture(page, "home", section, locale, width, selector);
    await capture(page, "home", "full", locale, width);
    if (width === 390) {
      await page.locator(".faq-item summary").first().click();
      await capture(page, "home", "faq-open", locale, width, "#faq");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.locator(".menu-toggle").click();
      await page.locator(".mobile-menu").waitFor({ state: "visible" });
      await capture(page, "home", "menu-open", locale, width);
      await page.keyboard.press("Escape");
      await page.emulateMedia({ forcedColors: "active" });
      await capture(page, "home", "paths-forced-colors", locale, width, "#participate");
      await capture(page, "home", "legacy-forced-colors", locale, width, "#legacy");
    }
    await context.close();
    await saveIndex();
    console.log(`Captured homepage ${locale} ${width}`);
  }
  for (const locale of ["en", "ar"]) for (const width of [390, 1024, 1280, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: height(width) }, reducedMotion: "no-preference" });
    await page.goto(`${baseURL}/${locale}`, { waitUntil: "domcontentloaded" });
    await ready(page);
    await capture(page, "home", "hero-normal", locale, width, ".conference-hero");
    if (width === 390 || width === 1440) await capture(page, "home", "belt-normal", locale, width, ".sponsor-belt");
    await page.close();
    await saveIndex();
  }
  for (const locale of ["en", "ar"]) for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: height(width) }, reducedMotion: "no-preference" });
    const page = await context.newPage();
    for (const target of ["paths", "program"]) {
      await page.goto(`${baseURL}/${locale}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      const selector = target === "paths" ? "#participate .path-bento" : "#program .program-experiences";
      await page.locator(selector).evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 120, behavior: "instant" }));
      await page.waitForTimeout(100);
      const filename = `home-${target}-mid-reveal-${locale}-${width}.png`;
      await page.screenshot({ path: resolve(output, filename) });
      index.screenshots.push({ filename, status: "CAPTURED", motion: "no-preference", elapsedAfterScrollMs: 100 });
    }
    if (width === 1440) {
      await page.goto(`${baseURL}/${locale}`, { waitUntil: "domcontentloaded" });
      await ready(page);
      await page.mouse.move(700, 700);
      await page.evaluate(() => window.scrollTo({ top: 1400, behavior: "instant" }));
      await page.waitForFunction(() => document.querySelector(".axiom-header")?.getAttribute("data-compact") === "true");
      await page.waitForFunction(() => !document.querySelector(".wordmark")?.getAnimations().some((animation) => animation.playState === "running"));
      // Capture the viewport: the compact wordmark pill extends outside the header's box.
      const filename = `home-header-scrolled-${locale}-${width}.png`;
      await page.screenshot({ path: resolve(output, filename) });
      index.screenshots.push({ filename, status: "CAPTURED", motion: "no-preference" });
    }
    await context.close();
    await saveIndex();
  }
}

async function interior() {
  for (const locale of ["en", "ar"]) for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: height(width) }, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const name of interiors) {
      const route = `/${locale}/${name}`;
      try {
        const response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded" });
        await ready(page);
        const hasPublicShell = !!await page.locator(".site-header").count();
        index.routes.push({ route, width, status: response?.status(), finalURL: page.url(), hasPublicShell, enabledWorkflowConfig: workflowConfig[name] });
        await capture(page, name, "intro", locale, width);
        await capture(page, name, "header", locale, width, ".axiom-header");
        await capture(page, name, "footer", locale, width, ".site-footer");
        await page.locator(".site-footer").evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 300, behavior: "instant" }));
        await capture(page, name, "boundary", locale, width);
        if (name === "dates-venue" && await page.locator(".venue-arrival-journey").count()) {
          await page.locator(".venue-arrival-journey").evaluate((element) => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + 150, behavior: "instant" }));
          await page.waitForTimeout(200);
          const filename = `${name}-journey-header-${locale}-${width}.png`;
          await page.screenshot({ path: resolve(output, filename) });
          index.screenshots.push({ filename, status: "CAPTURED" });
        }
        // Bring lazy media through the viewport before a full-page image.
        for (const img of await page.locator("main img").all()) {
          if (!await img.isVisible()) continue;
          await readyImage(img);
        }
        await capture(page, name, "full", locale, width);
        await saveIndex();
        console.log(`Captured ${route} ${width} (${response?.status()})`);
      } catch (error) {
        index.failures.push({ route, width, error: String(error) });
        await saveIndex();
      }
    }
    await context.close();
  }
}

try {
  if (scope !== "interior") await home();
  if (scope !== "home") await interior();
} finally {
  await browser.close();
  await saveIndex();
}
console.log(`${index.screenshots.filter((shot) => shot.status === "CAPTURED").length} screenshots; ${index.failures.length} capture failures. Index: .tools/home-v2/capture-index-${scope}.json`);
if (index.failures.length) process.exitCode = 1;
