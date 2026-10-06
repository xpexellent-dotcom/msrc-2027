import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readApprovedPolicy, visibleMarkdown, type SourceBlock } from "../policy-source";

const version = "v1.0", effectiveDate = "2026-10-06";
const titles = { en: { privacy: "MSRC 2027 Privacy Policy", terms: "MSRC 2027 Terms and Conditions" }, ar: { privacy: "سياسة الخصوصية لمؤتمر MSRC ٢٠٢٧", terms: "شروط وأحكام مؤتمر MSRC ٢٠٢٧" } } as const;
const footerLabels = { en: { privacy: "Privacy", terms: "Terms" }, ar: { privacy: "الخصوصية", terms: "الشروط" } } as const;
const unfinished = /\b(?:draft|placeholder)\b|Organizer decision|awaiting review|wording pending|مسودة|نص مؤقت|بانتظار/iu;

for (const locale of ["en", "ar"] as const) for (const kind of ["privacy", "terms"] as const) {
  test(`${locale} ${kind} current and v1.0 preserve approved content, links and accessible read-only design`, async ({ page, context, request }, testInfo) => {
    const errors: string[] = [], writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url()); });
    const source = readApprovedPolicy(kind);
    const evidenceDir = path.resolve("deliverables/policy-v1.0");
    await mkdir(evidenceDir, { recursive: true });
    let initialContent: string | undefined;
    for (const suffix of ["", `/${version}`]) {
      const response = await page.goto(`/${locale}/${kind}${suffix}`);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(`${titles[locale][kind]} | MSRC 2027`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[locale][kind]);
      await expect(page.locator(".policy-page")).toHaveAttribute("data-policy-version", version);
      await expect(page.locator(".policy-version-details")).toContainText(locale === "en" ? "Version 1.0" : "الإصدار ١.٠");
      await expect(page.locator(`.policy-version-details time[datetime="${effectiveDate}"]`)).toHaveText(locale === "en" ? "6 October 2026" : "٦ أكتوبر ٢٠٢٦");
      await expect(page.getByRole("main")).not.toContainText(unfinished);
      await expect(page.locator(".policy-draft-notice, .policy-section-status, [data-policy-section-status=placeholder]")).toHaveCount(0);
      // Branch previews and local review retain ORG-013's noindex safety.
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.msrc2027.com/${locale}/${kind}${suffix}`);
      for (const language of ["en", "ar"]) await expect(page.locator(`link[rel="alternate"][hreflang="${language}"]`)).toHaveAttribute("href", `https://www.msrc2027.com/${language}/${kind}${suffix}`);
      await expect(page.locator("form, input, textarea, select, iframe, video")).toHaveCount(0);
      expect(await context.cookies()).toEqual([]);
      expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

      const sections = await page.locator(".policy-sections").innerText();
      if (initialContent === undefined) initialContent = sections;
      else expect(sections).toBe(initialContent);
      const rendered = await page.locator(".policy-section").evaluateAll((sections) => sections.map((section) => ({
        title: section.querySelector("h2")!.textContent!.replace(/\s+/g, " ").trim(),
        blocks: Array.from(section.children).flatMap<SourceBlock>((child) => {
          const text = (element: Element) => element.textContent!.replace(/\s+/g, " ").trim();
          if (child.tagName === "P") return [{ type: "paragraph", text: text(child) }];
          if (child.tagName === "UL" || child.tagName === "OL") return [{ type: "list", ordered: child.tagName === "OL", items: Array.from(child.children).map(text) }];
          const table = child.tagName === "TABLE" ? child : child.querySelector("table");
          if (table) return [{ type: "table", headers: Array.from(table.querySelectorAll("thead th")).map(text), rows: Array.from(table.querySelectorAll("tbody tr")).map((row) => Array.from(row.children).map(text)) }];
          return [];
        }),
      })));
      expect(rendered).toHaveLength(source.sections.length);
      if (locale === "en") {
        expect(await page.locator(".policy-lead").allTextContents()).toEqual(source.intro);
        expect(rendered).toEqual(source.sections.map(({ title, blocks }) => ({ title, blocks: blocks.map((block) => block.type === "paragraph"
          ? { ...block, text: visibleMarkdown(block.text) } : block.type === "list" ? { ...block, items: block.items.map(visibleMarkdown) }
            : { ...block, headers: block.headers.map(visibleMarkdown), rows: block.rows.map((row) => row.map(visibleMarkdown)) }) })));
      } else {
        expect(rendered.map(({ blocks }) => blocks.map((block) => block.type))).toEqual(source.sections.map(({ blocks }) => blocks.map((block) => block.type)));
        for (const section of rendered) {
          expect(section.title).toMatch(/[\u0600-\u06ff]/);
          for (const block of section.blocks) expect(JSON.stringify(block)).toMatch(/[\u0600-\u06ff]/);
        }
      }
      await expect(page.locator(".policy-section table")).toHaveCount(kind === "privacy" ? 4 : 0);
      if (kind === "privacy") {
        const paymentDomain = page.locator('#providers-transfers bdi').filter({ hasText: "(lms.waqf.org.sa)" });
        await expect(paymentDomain).toHaveText("(lms.waqf.org.sa)");
        await expect(paymentDomain).toHaveAttribute("dir", "ltr");
        await expect(paymentDomain).toHaveCSS("unicode-bidi", "isolate");
      }
      const missingAnchors = await page.locator(".policy-contents a").evaluateAll((links) => links
        .map((link) => decodeURIComponent(new URL((link as HTMLAnchorElement).href).hash.slice(1)))
        .filter((id) => !document.getElementById(id)));
      expect(missingAnchors).toEqual([]);
      const links = await page.getByRole("main").locator("a").evaluateAll((links) => links.map((link) => ({ href: link.getAttribute("href")!, label: link.textContent!.trim() })));
      const internalPaths = new Set<string>();
      for (const link of links) {
        expect(link.label.length).toBeGreaterThan(0);
        expect(link.href).not.toMatch(/draft|undefined|^$/);
        const target = new URL(link.href, page.url());
        expect(["http:", "https:", "mailto:"]).toContain(target.protocol);
        if (target.protocol === "mailto:") { expect(target.pathname).toBe("contact@msrc2027.com"); continue; }
        if (target.origin === new URL(page.url()).origin || target.origin === "https://www.msrc2027.com") {
          expect(target.pathname).toMatch(new RegExp(`^/${locale}(?:/|$)`));
          internalPaths.add(target.pathname);
        } else {
          expect(target.protocol).toBe("https:");
          expect(target.hostname).toBe("kau.edu.sa");
          expect(target.pathname).toBe(`/${locale}/page/privacy-policy`);
        }
      }
      for (const target of internalPaths) expect((await request.get(target)).status(), target).toBe(200);
      await page.evaluate(() => document.fonts.ready);
      const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const name = `${locale}-${kind}-${suffix ? "v1.0" : "current"}-${testInfo.project.name}`;
      const axeBody = JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2);
      await writeFile(path.join(evidenceDir, `${name}-axe.json`), axeBody);
      await testInfo.attach(`${name}-accessibility`, { body: axeBody, contentType: "application/json" });
      expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
      const screenshot = await page.screenshot({ path: path.join(evidenceDir, `${name}.png`), fullPage: true });
      await testInfo.attach(name, { body: screenshot, contentType: "image/png" });
      if (!suffix && testInfo.project.name !== "chromium-tablet") {
        await testInfo.attach(`${name}-entrance`, { body: await page.screenshot({ path: path.join(evidenceDir, `${name}-entrance.png`) }), contentType: "image/png" });
        const tables = page.locator(".policy-section table");
        for (let index = 0; index < await tables.count(); index++) await testInfo.attach(`${name}-table-${index + 1}`, {
          // Isolated table evidence must not include the floating navigation overlay.
          body: await tables.nth(index).screenshot({ path: path.join(evidenceDir, `${name}-table-${index + 1}.png`), style: ".site-header, .skip-link { visibility: hidden !important; }" }), contentType: "image/png",
        });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    }
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    if (testInfo.project.name === "chromium-mobile") {
      await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
      await page.setViewportSize({ width: 320, height: 850 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
    expect(errors).toEqual([]); expect(writes).toEqual([]);
  });
}

test("policy versions survive keyboard language and native section navigation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/en/privacy/${version}?view=review`);
  await page.keyboard.press("Tab");
  await expect(page.locator('a[href="#main-content"]')).toBeFocused();
  await page.keyboard.press("Enter"); await expect(page.getByRole("main")).toBeFocused();
  await page.locator('.policy-contents a[href="#rights"]').focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#rights")).toBeFocused(); await expect(page.locator("#rights")).toBeInViewport();
  await page.getByRole("link", { name: "View this page in Arabic" }).focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/ar/privacy/${version}\\?view=review#rights$`));
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); await expect(page.locator("#rights")).toBeInViewport();
  await page.getByRole("link", { name: "View this page in English" }).focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/en/privacy/${version}\\?view=review#rights$`));
  await expect(page.locator("#rights")).toBeInViewport();
  await page.locator(".policy-version-link").click(); await expect(page).toHaveURL(/\/en\/privacy$/);
  await page.locator(".policy-version-link").click(); await expect(page).toHaveURL(new RegExp(`/en/privacy/${version}$`));
});

test("footer and locale-free policy links resolve while the old draft and unknown versions return 404", async ({ page, request }) => {
  for (const locale of ["en", "ar"] as const) for (const kind of ["privacy", "terms"] as const) {
    await page.goto(`/${locale}`);
    await page.getByRole("contentinfo").getByRole("link", { name: footerLabels[locale][kind], exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/${kind}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titles[locale][kind]);
    for (const unavailable of ["2026-10-04-draft", "2027-approved"]) expect((await request.get(`/${locale}/${kind}/${unavailable}`)).status()).toBe(404);
    expect((await request.get(`/fr/${kind}`)).status()).toBe(404);
    expect((await request.get(`/fr/${kind}/${version}`)).status()).toBe(404);
    for (const suffix of ["", `/${version}`]) {
      const response = await request.get(`/${kind}${suffix}`, { headers: { "Accept-Language": locale === "ar" ? "ar-SA,ar;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ar;q=0.8" }, maxRedirects: 0 });
      expect(response.status()).toBe(307); expect(response.headers().location).toBe(`/${locale}/${kind}${suffix}`);
    }
  }
});
