import { expect, test, type Page } from "@playwright/test";

const content = {
  en: {
    title: "Where curiosity becomes discovery.",
    lead: "Medical students. Shared ideas. New discoveries.",
    benefitsTitle: "Come with curiosity. Leave with possibility.",
    preview: "Development preview",
    removedNotes: [
      "Inside the preview", "Illustrative format · Not a schedule",
      "An early website preview. Content and visual identity are subject to approval.",
      "Pages marked with a dot are awaiting content.",
      "Selected MSRC2026 footage introduces the conference above. The full archive will follow after review.",
    ],
  },
  ar: {
    title: "حيث يتحوّل الفضول إلى اكتشاف.",
    lead: "طلاب طب. أفكار نتشاركها. واكتشافات جديدة.",
    benefitsTitle: "ابدأ بفضولك. واكتشف إمكاناتك.",
    preview: "معاينة قيد التطوير",
    removedNotes: [
      "جولة في المعاينة", "تصوّر توضيحي · ليس جدولًا معتمدًا",
      "الصفحات المميّزة بنقطة بانتظار المحتوى.",
      "تظهر في مقدّمة الصفحة لقطات مختارة من نسخة ٢٠٢٦. سيُضاف الأرشيف الكامل بعد مراجعته.",
    ],
  },
} as const;

async function checkReadableSections(page: Page) {
  for (const id of ["participate", "program", "legacy", "venue"]) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    // Ambient artwork is deliberately translucent and aria-hidden; this guard
    // protects readable content rather than prescribing decorative opacity.
    expect(await section.locator('.reveal:not([aria-hidden="true"])').evaluateAll((elements) => elements.every((element) => {
      const style = getComputedStyle(element);
      return style.visibility === "visible" && style.display !== "none" && Number(style.opacity) === 1;
    }))).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
}

// DSN-01/02, LOC-01/03, ACC-01: the current cinematic public-experience
// revision keeps a clean cinematic opening, semantic background pause and
// one-time enhancement readable with every fallback path.
for (const locale of ["en", "ar"] as const) {
  test(`${locale} cinematic homepage has a hero countdown, floating navigation and decorative photographs`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(content[locale].title);
    await expect(page.locator(".hero-lead")).toHaveText(content[locale].lead);
    // ORG-013: the site is public; the development-preview notice is gone.
    await expect(page.getByText(content[locale].preview, { exact: true })).toHaveCount(0);
    await expect(page.locator(".preview-banner")).toHaveCount(0);
    const control = page.locator(".conference-hero .hero-media-toggle");
    await expect(control).toHaveCount(1);
    await expect(control).toHaveJSProperty("tagName", "BUTTON");
    await expect(control).toBeEmpty();
    if ((page.viewportSize()?.width ?? 1280) <= 700) await expect(control).toBeHidden();
    else await expect(control).toBeVisible();
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    await expect(page.locator(".footer-directory-note, .program-sample-label, .hero-media-status")).toHaveCount(0);
    await expect(page.locator(".conference-hero [data-countdown]")).toHaveCount(1);
    await expect(page.locator(".date-band [data-countdown]")).toHaveCount(0);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".hero-actions a")).toHaveCount(2);
    const opening = await page.locator(".conference-hero").boundingBox();
    const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: window.innerHeight }));
    expect(opening?.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(opening?.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect((opening?.y ?? 0) + (opening?.height ?? 0)).toBeGreaterThanOrEqual(viewport.height - 1);
    const masthead = await page.locator(".site-header").boundingBox();
    expect(masthead).not.toBeNull();
    expect(Math.abs(masthead!.x)).toBeLessThanOrEqual(1);
    expect(masthead!.y).toBeGreaterThanOrEqual(12);
    expect(masthead!.y).toBeLessThanOrEqual(24);
    expect(Math.abs(masthead!.width - viewport.width)).toBeLessThanOrEqual(1);
    const navigation = await page.locator(".site-header-inner").boundingBox();
    expect(navigation).not.toBeNull();
    expect(navigation!.x).toBeGreaterThanOrEqual(12);
    expect(navigation!.x + navigation!.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(navigation!.y).toBeGreaterThanOrEqual(masthead!.y);
    expect(navigation!.y + navigation!.height).toBeLessThanOrEqual(masthead!.y + masthead!.height + 1);
    for (const note of content[locale].removedNotes) {
      await expect(page.getByText(note, { exact: true })).toHaveCount(0);
    }

    const photographs = page.locator(".pathway-photo img");
    await expect(photographs).toHaveCount(5);
    for (const visual of await photographs.all()) {
      await expect(visual).toHaveAttribute("alt", "");
      await expect(visual).not.toHaveAttribute("tabindex", "0");
    }
    await expect(page.locator(".homepage-journey svg.flow-lines")).toHaveCount(0);
    await page.locator("#program").scrollIntoViewIfNeeded();
    const benefitsHeading = page.locator("#program").getByRole("heading", { level: 2 });
    await expect(benefitsHeading).toHaveText(content[locale].benefitsTitle);
    await expect(benefitsHeading).toBeVisible();
  });

  test(`${locale} five photographic pathways remain readable during down and up scrolling`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(`/${locale}`);
    const cards = page.locator(".pathway-list > .pathway-card");
    await expect(cards).toHaveCount(5);
    expect(await cards.locator(".pathway-action").evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname)))
      .toEqual(["registration", "submissions", "workshops", "hackathon", "3mt"].map((path) => `/${locale}/${path}`));
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card.getByRole("heading", { level: 3 })).toBeVisible();
      await expect(card.locator(".pathway-action")).toBeInViewport();
      await expect(card.locator(".status-badge")).toContainText(locale === "en" ? /not open/i : /لم.*يفتح|لم.*يُفتح|غير متاح|لم يبدأ/);
      expect(await card.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    }
    await page.locator("#top").scrollIntoViewIfNeeded();
    await cards.first().scrollIntoViewIfNeeded();
    await expect(cards.first().getByRole("heading")).toBeVisible();
    expect(await cards.evaluateAll((elements) => elements.every((element) => {
      const style = getComputedStyle(element);
      return style.opacity === "1" && style.visibility === "visible";
    }))).toBe(true);
  });
  test(`${locale} content stays readable without JavaScript or IntersectionObserver`, async ({ browser, page, baseURL }) => {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({
        baseURL, javaScriptEnabled, viewport: page.viewportSize() ?? undefined,
      });
      try {
        const fallbackPage = await context.newPage();
        if (javaScriptEnabled) await fallbackPage.addInitScript(() => {
          Object.defineProperty(window, "IntersectionObserver", { configurable: true, value: undefined });
        });
        // This checks the readable document and its visible media. The full load
        // event can wait for offscreen native-lazy carousel images in no-JS mobile contexts.
        await fallbackPage.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
        await expect(fallbackPage.getByRole("heading", { level: 1 })).toHaveText(content[locale].title);
        await expect(fallbackPage.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await checkReadableSections(fallbackPage);
        const visibleArchiveImage = fallbackPage.locator("#legacy .gallery-photo img").first();
        await expect(visibleArchiveImage).toBeVisible();
        await expect.poll(() => visibleArchiveImage.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
      } finally {
        await context.close();
      }
    }
  });

  test(`${locale} reduced motion removes reveal travel while keeping all sections readable`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await checkReadableSections(page);
    for (const selector of ['#program .reveal:not([aria-hidden="true"])', ".pathway-card", ".program-experiences > article", ".gallery-card"]) {
      expect(await page.locator(selector).count(), selector).toBeGreaterThan(0);
      expect(await page.locator(selector).evaluateAll((elements) => elements.every((element) => {
        const style = getComputedStyle(element);
        return style.animationName === "none" && style.transform === "none" && style.transitionDuration === "0s";
      }))).toBe(true);
    }
    // The decorative composition may have a static rotation, but must never
    // travel or animate when the visitor requests reduced motion.
    const artwork = page.locator(".ambient-art, .ambient-art *");
    expect(await artwork.count()).toBeGreaterThan(0);
    expect(await artwork.evaluateAll((elements) => elements.every((element) => {
      const style = getComputedStyle(element);
      return style.animationName === "none" && style.transitionDuration === "0s";
    }))).toBe(true);
  });
}

test("the opening headline and navigation appear while footage is still loading", async ({ page }) => {
  let releaseFilm: (() => void) | undefined;
  const filmHeld = new Promise<void>((resolve) => { releaseFilm = resolve; });
  await page.route("**/media/msrc2026/*.mp4", async (route) => {
    await filmHeld;
    await route.abort("failed");
  });
  try {
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(content.en.title);
    await expect(page.locator(".site-header-inner")).toBeVisible();
    await expect(page.locator(".conference-hero .hero-media-poster")).toBeVisible();
    await expect(page.locator(".hero-actions a").first()).toBeVisible();
  } finally {
    releaseFilm?.();
  }
});
