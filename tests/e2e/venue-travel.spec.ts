import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator } from "@playwright/test";

// Static travel guidance must not load an external map, invent travel times or
// publish unset on-site/visa information. Provider pages open only on activation.
const destination = "King Faisal Conference Center, Abdullah Sulayman St, King Abdulaziz University, Jeddah 22254";

async function expectMapLabelsReadable(map: Locator) {
  const layout = await map.evaluate((element) => {
    const svg = element as SVGSVGElement;
    const viewBox = svg.viewBox.baseVal;
    const bounds = (graphic: SVGGraphicsElement) => {
      const { x, y, width, height } = graphic.getBBox();
      return { x, y, width, height };
    };
    const outside = Array.from(svg.querySelectorAll("text")).flatMap((label) => {
      const box = bounds(label);
      const fits = box.x >= viewBox.x - 1 && box.y >= viewBox.y - 1
        && box.x + box.width <= viewBox.x + viewBox.width + 1
        && box.y + box.height <= viewBox.y + viewBox.height + 1;
      return fits ? [] : [{ text: label.textContent, box }];
    });
    const campusText = svg.querySelector(".venue-map-label--campus") as SVGGraphicsElement | null;
    const campus = svg.querySelector(".venue-map-campus") as SVGGraphicsElement | null;
    const pin = svg.querySelector('[data-map-landmark="venue"]') as SVGGraphicsElement | null;
    if (!campusText || !campus || !pin) return { outside, hasCampusElements: false };
    const textBox = bounds(campusText);
    const campusBox = bounds(campus);
    const pinBox = bounds(pin);
    const campusFits = textBox.x >= campusBox.x - 1 && textBox.y >= campusBox.y - 1
      && textBox.x + textBox.width <= campusBox.x + campusBox.width + 1
      && textBox.y + textBox.height <= campusBox.y + campusBox.height + 1;
    const intersectsPin = textBox.x < pinBox.x + pinBox.width && textBox.x + textBox.width > pinBox.x
      && textBox.y < pinBox.y + pinBox.height && textBox.y + textBox.height > pinBox.y;
    return { outside, hasCampusElements: true, campusFits, intersectsPin, textBox, campusBox, pinBox };
  });
  expect(layout.outside, JSON.stringify(layout, null, 2)).toEqual([]);
  expect(layout.hasCampusElements).toBe(true);
  expect(layout.campusFits, JSON.stringify(layout, null, 2)).toBe(true);
  expect(layout.intersectsPin, JSON.stringify(layout, null, 2)).toBe(false);
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
    const language = page.getByRole("link", { name: locale === "en" ? "View this page in Arabic" : "View this page in English" });
    // A fragment-bearing href is an observable hydration readiness condition.
    await expect(language).toHaveAttribute("href", `/${otherLocale}/dates-venue?view=travel#venue`);

    const map = page.getByRole("main").getByRole("img");
    await expect(map).toHaveCount(1);
    await expect(map).toHaveAccessibleName(locale === "en" ? /King Faisal Conference Center/ : /مركز الملك فيصل للمؤتمرات/);
    await expect(map).toHaveAccessibleDescription(locale === "en"
      ? /King Abdulaziz International Airport.*Airport station.*Jeddah Al-Sulaymaniyah station.*King Faisal Conference Center/
      : /مطار الملك عبدالعزيز الدولي.*محطة المطار.*محطة جدة السليمانية.*مركز الملك فيصل للمؤتمرات/);
    await expect(page.locator(".venue-map-caption strong")).toHaveText(locale === "en" ? "Map not to scale" : "الخريطة ليست بمقياس رسم");
    await expectMapLabelsReadable(map);
    if (testInfo.project.name === "chromium-mobile") {
      const originalViewport = page.viewportSize()!;
      await page.setViewportSize({ width: 320, height: originalViewport.height });
      await page.evaluate(() => document.fonts.ready);
      await expectMapLabelsReadable(map);
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
    await expect(page.locator(".venue-travel-time, #at-venue, .venue-visa-link")).toHaveCount(0);
    await expect(page.locator("#international-attendees")).toContainText(/UTC\+3/);
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
    await language.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/${otherLocale}/dates-venue\\?view=travel#venue$`));
    await expect(page.locator("html")).toHaveAttribute("dir", otherLocale === "ar" ? "rtl" : "ltr");
    await expect(page.locator("#venue")).toBeInViewport();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(thirdPartyRequests).toEqual([]);
  });
}
