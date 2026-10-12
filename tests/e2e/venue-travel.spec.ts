import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";
import { approvedAtVenue, approvedTravelTime, approvedVisaResponsibility } from "../fixtures/approved-venue-guidance";
import { languageLink } from "./helpers/header-navigation";

// Static travel guidance must not load an external map, invent travel times or
// publish unset on-site information. Provider pages open only on activation.
const destination = "King Faisal Conference Center, Abdullah Sulayman St, King Abdulaziz University, Jeddah 22254";

async function expectMapLabelsReadable(map: Locator) {
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeVisible();
  const layout = await map.evaluate(async (element) => {
    const image = element as HTMLImageElement;
    await image.decode();
    const content = await (await fetch(image.currentSrc)).text();
    const svg = new DOMParser().parseFromString(content, "image/svg+xml").documentElement as unknown as SVGSVGElement;
    // Render the actual local map offscreen to measure every baked label. This
    // preserves label collision/clipping coverage after the schematic replacement.
    svg.style.cssText = "position:fixed;left:-10000px;top:0;visibility:hidden";
    document.body.appendChild(svg);
    const viewBox = svg.viewBox.baseVal;
    const labels = Array.from(svg.querySelectorAll("text")).map((label) => {
      const box = label.getBBox();
      const matrix = label.getCTM()!;
      const first = new DOMPoint(box.x, box.y).matrixTransform(matrix);
      const last = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
      return { text: label.textContent, left: first.x, top: first.y, right: last.x, bottom: last.y };
    });
    const outside = labels.filter(box => box.left < -1 || box.top < -1 || box.right > viewBox.width + 1 || box.bottom > viewBox.height + 1);
    const overlapping = labels.flatMap((label, index) => labels.slice(index + 1).filter(other => label.left < other.right && label.right > other.left && label.top < other.bottom && label.bottom > other.top).map(other => [label.text, other.text]));
    const result = { outside, overlapping, paths: svg.querySelectorAll("path").length,
      projection: svg.dataset.mapProjection, scale: svg.dataset.metresPerPixel,
      latitude: svg.dataset.venueLat, longitude: svg.dataset.venueLon,
      source: svg.querySelector("metadata")?.textContent, naturalWidth: image.naturalWidth,
      sourceIsLocal: new URL(image.currentSrc).origin === window.location.origin };
    svg.remove();
    return result;
  });
  expect(layout.outside, JSON.stringify(layout)).toEqual([]);
  expect(layout.overlapping, JSON.stringify(layout)).toEqual([]);
  expect(layout.paths).toBeGreaterThan(100);
  expect(layout.projection).toBe("local-equirectangular");
  expect(layout.scale).toBe("2.5");
  expect(layout.latitude).toBe("21.492891");
  expect(layout.longitude).toBe("39.241681");
  expect(layout.source).toContain("OpenStreetMap contributors");
  expect(layout.naturalWidth).toBeGreaterThanOrEqual(500);
  expect(layout.sourceIsLocal).toBe(true);
}
for (const locale of ["en", "ar"] as const) {
  test(`${locale} venue travel guidance is localized, accessible and private until a map link is opened`, async ({ page, baseURL }, testInfo) => {
    const thirdPartyRequests: string[] = [];
    const localOrigin = new URL(baseURL!).origin;
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== localOrigin) thirdPartyRequests.push(request.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect((await page.goto(`/${locale}/dates-venue?view=travel#venue`))?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    await page.evaluate(() => document.fonts.ready);
    const otherLocale = locale === "en" ? "ar" : "en";
    const language = await languageLink(page, locale === "en" ? "View this page in Arabic" : "View this page in English");
    // A fragment-bearing href is an observable hydration readiness condition.
    await expect(language).toHaveAttribute("href", `/${otherLocale}/dates-venue?view=travel#venue`);

    const map = page.getByTestId("venue-geographic-map").getByRole("img");
    await expect(map).toHaveCount(1);
    const photos = page.locator(".venue-photo-gallery").getByRole("img");
    await expect(photos).toHaveCount(4);
    for (const photo of await photos.all()) await expect(photo).toHaveAccessibleName(/\S/);
    await expect.poll(() => photos.first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(map).toHaveAttribute("dir", "ltr");
    // Arabic page flow must preserve the map's geographic east/west orientation.
    expect(await map.evaluate((element) => getComputedStyle(element).transform)).toBe("none");
    await expect(map).toHaveAccessibleName(locale === "en" ? /King Faisal Conference Center/ : /مركز الملك فيصل للمؤتمرات/);
    await expect(map).toHaveAccessibleDescription(locale === "en" ? /Campus streets.*current driving directions/ : /شوارع الحرم الجامعي.*اتجاهات القيادة/);
    await expect(page.getByTestId("venue-geographic-map").getByRole("link")).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expectMapLabelsReadable(map);
    if (testInfo.project.name === "chromium-mobile") {
      const originalViewport = page.viewportSize()!;
      for (const width of [320, 360, 390, 430]) {
        await page.setViewportSize({ width, height: originalViewport.height });
        await page.evaluate(() => document.fonts.ready);
        await expectMapLabelsReadable(map);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
      await page.setViewportSize(originalViewport);
    }
    const mapLinks = page.locator(".venue-map-links a");
    await expect(mapLinks).toHaveCount(3);
    const urls = await mapLinks.evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
    const expected = [
      { origin: "https://www.google.com", path: "/maps/dir/", parameter: "destination" },
      { origin: "https://maps.apple.com", path: "/directions", parameter: "destination" },
      { origin: "https://waze.com", path: "/ul", parameter: "q" },
    ];
    for (const [index, link] of urls.entries()) {
      const url = new URL(link);
      expect(url.origin).toBe(expected[index].origin);
      expect(url.pathname).toBe(expected[index].path);
      expect(url.searchParams.get(expected[index].parameter)).toBe(destination);
      expect(url.hash).toBe("");
      expect(Array.from(url.searchParams.keys())).toEqual(index === 0 ? ["api", "destination"] : [expected[index].parameter]);
      if (index === 0) expect(url.searchParams.get("api")).toBe("1");
      const anchor = mapLinks.nth(index);
      await expect(anchor).toHaveAttribute("target", "_blank");
      await expect(anchor).toHaveAttribute("rel", /noopener/);
      await expect(anchor).toHaveAttribute("referrerpolicy", "no-referrer");
      await expect(anchor).toHaveAccessibleName(locale === "en" ? /new tab/i : /علامة تبويب جديدة/);
    }

    const cards = page.locator(".venue-travel-cards article");
    await expect(cards).toHaveCount(3);
    expect(await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-travel-mode"))))
      .toEqual(["taxi", "train", "rental"]);
    for (const card of await cards.all()) {
      await expect(card.getByRole("heading")).toHaveText(/\S/);
      await expect(card.locator("p").first()).toHaveText(/\S/);
    }
    await expect(page.locator(".venue-travel-time")).toHaveCount(2);
    for (const mode of ["taxi", "rental"]) {
      await expect(page.locator(`[data-travel-mode="${mode}"] .venue-travel-time`)).toContainText(approvedTravelTime[locale]);
    }
    await expect(page.locator('[data-travel-mode="train"] .venue-travel-time')).toHaveCount(0);
    await expect(page.locator("#at-venue [data-venue-detail]")).toHaveCount(6);
    const arrivalDetails = page.locator("#at-venue details");
    await expect(arrivalDetails).not.toHaveAttribute("open", "");
    await arrivalDetails.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(arrivalDetails).toHaveAttribute("open", "");
    for (const [key, value] of Object.entries(approvedAtVenue)) {
      await expect(page.locator(`#at-venue [data-venue-detail="${key}"] dd`)).toHaveText(value[locale]);
    }
    const contact = page.locator('[data-venue-detail="accessibility"]').getByRole("link", { name: locale === "en" ? "contact form" : "نموذج التواصل", exact: true });
    await expect(contact).toHaveAttribute("href", `/${locale}/contact`);
    await expect(page.locator(".venue-visa-link, #international-attendees a")).toHaveCount(0);
    const internationalDetails = page.locator("#international-attendees details");
    await expect(internationalDetails).not.toHaveAttribute("open", "");
    await internationalDetails.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(internationalDetails).toHaveAttribute("open", "");
    await expect(page.locator("#international-attendees")).toContainText(/UTC\+3/);
    await expect(page.locator("#international-attendees")).toContainText(approvedVisaResponsibility[locale]);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator('link[rel="prefetch"][href^="https://"], link[rel="preconnect"][href*="google"], link[rel="preconnect"][href*="apple"], link[rel="preconnect"][href*="waze"], link[rel="dns-prefetch"][href*="google"], link[rel="dns-prefetch"][href*="apple"], link[rel="dns-prefetch"][href*="waze"]')).toHaveCount(0);

    // Read through the entire page and focus map choices without opening them.
    await map.scrollIntoViewIfNeeded();
    await mapLinks.first().focus();
    await expect(mapLinks.first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(mapLinks.nth(1)).toBeFocused();
    await page.locator("#international-attendees").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(thirdPartyRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    await testInfo.attach(`${locale}-venue-travel-axe`, { body: JSON.stringify({ violations: accessibility.violations, needsManualReview: accessibility.incomplete }, null, 2), contentType: "application/json" });
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    // Reset only the capture state after checking keyboard focus and full-page reading.
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await testInfo.attach(`${locale}-venue-travel-${testInfo.project.name}`, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });

    // Exercise a local page transition after hydration and full-page reading.
    // Reading and focusing the map leaves the current fragment intact for language activation.
    const transitionLanguage = await languageLink(page, locale === "en" ? "View this page in Arabic" : "View this page in English");
    await transitionLanguage.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${otherLocale}/dates-venue\\?view=travel#venue$`));
    await expect(page.locator("html")).toHaveAttribute("dir", otherLocale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#venue")).toBeInViewport();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(thirdPartyRequests).toEqual([]);
  });
}
