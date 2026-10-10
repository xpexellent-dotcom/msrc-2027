import { expect, test, type Page } from "@playwright/test";

declare global {
  interface Window {
    premiumRevealStarts: { title: string; transform: string; startedAt: number }[];
  }
}

const content = {
  en: {
    title: "Where curiosity becomes discovery.",
    lead: "Medical students. Shared ideas. New discoveries.",
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
    preview: "معاينة قيد التطوير",
    removedNotes: [
      "جولة في المعاينة", "تصوّر توضيحي · ليس جدولًا معتمدًا",
      "الصفحات المميّزة بنقطة بانتظار المحتوى.",
      "تظهر في مقدّمة الصفحة لقطات مختارة من نسخة ٢٠٢٦. سيُضاف الأرشيف الكامل بعد مراجعته.",
    ],
  },
} as const;

async function checkReadableSections(page: Page) {
  for (const id of ["about", "participate", "program", "legacy"]) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    expect(await section.locator(".reveal").evaluateAll((elements) => elements.every((element) => {
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
  test(`${locale} concise homepage has no preview notice and decorative artwork stays out of the accessibility tree`, async ({ page }) => {
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
    await expect(page.locator(".conference-hero .hero-media-control")).toHaveCount(0);
    await expect(page.locator(".footer-directory-note, .program-sample-label, .hero-media-status")).toHaveCount(0);
    await expect(page.locator(".conference-hero [data-countdown]")).toHaveCount(0);
    await expect(page.locator(".date-band [data-countdown]")).toHaveCount(1);
    await expect(page.locator(".header-primary-action")).toHaveAttribute("href", `/${locale}/participate`);
    await expect(page.locator(".hero-actions a")).toHaveCount(2);
    const opening = await page.locator(".conference-hero").boundingBox();
    const viewport = page.viewportSize()!;
    expect(opening?.width).toBeGreaterThanOrEqual(viewport.width - 1);
    expect(opening?.height).toBeGreaterThanOrEqual(viewport.height - 1);
    expect((opening?.y ?? 0) + (opening?.height ?? 0)).toBeGreaterThanOrEqual(viewport.height - 1);
    const navigation = await page.locator(".site-header-inner").boundingBox();
    expect(navigation?.x).toBeGreaterThan(0);
    expect((navigation?.x ?? 0) + (navigation?.width ?? viewport.width)).toBeLessThan(viewport.width);
    expect(navigation?.y).toBeGreaterThan(0);
    for (const note of content[locale].removedNotes) {
      await expect(page.getByText(note, { exact: true })).toHaveCount(0);
    }

    // ORG-049: approved MSRC 2026 photos replaced most line art; the hackathon card keeps it.
    const artwork = page.locator("svg.research-visual");
    expect(await artwork.count()).toBeGreaterThanOrEqual(1);
    for (const visual of await artwork.all()) {
      await expect(visual).toHaveAttribute("aria-hidden", "true");
      await expect(visual).toHaveAttribute("focusable", "false");
      await expect(visual).not.toHaveAttribute("tabindex", "0");
    }
    await page.locator("#about").scrollIntoViewIfNeeded();
    await expect(page.locator("#about .intro-visual > img")).toBeVisible();
    // Informative photos are described; the one behind the decorative year art is not.
    for (const photo of await page.locator("main img:not(.hero-media-poster)").all()) {
      const decorative = await photo.evaluate((element) => Boolean(element.closest("[aria-hidden='true']")));
      expect(((await photo.getAttribute("alt")) ?? "").length > 0).toBe(!decorative);
    }
  });

  test(`${locale} pathway content reveals in sequence once and stays settled after scrolling away and back`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(() => {
      window.premiumRevealStarts = [];
      document.addEventListener("animationstart", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.matches(".pathway-list > article")) return;
        window.premiumRevealStarts.push({
          title: target.querySelector("h3")?.textContent ?? "",
          transform: getComputedStyle(target).transform,
          startedAt: performance.now(),
        });
      }, true);
    });
    await page.goto(`/${locale}`);
    const pathways = page.locator(".pathway-list");
    const rows = pathways.locator(":scope > article");
    await expect(rows).toHaveCount(4);
    const titles = await rows.locator("h3").allTextContents();
    await pathways.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => window.premiumRevealStarts.length)).toBe(4);
    const starts = await page.evaluate(() => window.premiumRevealStarts);
    expect(starts.map((entry) => entry.title)).toEqual(titles);
    expect(starts[0].transform).not.toBe("none");
    expect(await page.evaluate((transform) => new DOMMatrixReadOnly(transform).isIdentity, starts[0].transform)).toBe(false);
    const styles = await rows.evaluateAll((elements) => elements.map((element) => ({
      delay: parseFloat(getComputedStyle(element).animationDelay),
      duration: getComputedStyle(element).animationDuration,
    })));
    expect(styles[0].delay).toBe(0);
    for (let index = 1; index < styles.length; index++) {
      expect(styles[index].delay).toBeGreaterThan(styles[index - 1].delay);
    }
    // ORG-012: content that waited below the screen fades up over 1 s.
    expect(styles.every((style) => style.duration === "1s")).toBe(true);
    await expect.poll(() => rows.evaluateAll((elements) => elements.every((element) => {
      const transform = getComputedStyle(element).transform;
      const atRest = transform === "none" || new DOMMatrixReadOnly(transform).isIdentity;
      return atRest && element.getAnimations().every((animation) => animation.playState === "finished");
    }))).toBe(true);

    await page.locator("#top").scrollIntoViewIfNeeded();
    await pathways.scrollIntoViewIfNeeded();
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    expect(await page.evaluate(() => window.premiumRevealStarts.length)).toBe(4);
    expect(await rows.evaluateAll((elements) => elements.every((element) => {
      const transform = getComputedStyle(element).transform;
      return (transform === "none" || new DOMMatrixReadOnly(transform).isIdentity) &&
        element.getAnimations().every((animation) => animation.playState === "finished");
    }))).toBe(true);
    await expect(rows.first().getByRole("heading")).toBeVisible();
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
        await fallbackPage.goto(`/${locale}`);
        await expect(fallbackPage.getByRole("heading", { level: 1 })).toHaveText(content[locale].title);
        await expect(fallbackPage.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
        await checkReadableSections(fallbackPage);
      } finally {
        await context.close();
      }
    }
  });

  test(`${locale} reduced motion removes reveal travel while keeping all sections readable`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}`);
    await checkReadableSections(page);
    for (const selector of ["#about .reveal", ".pathway-row", ".program-grid > div", ".legacy-grid > div"]) {
      expect(await page.locator(selector).evaluateAll((elements) => elements.every((element) => {
        const style = getComputedStyle(element);
        return style.animationName === "none" && style.transform === "none" && style.transitionDuration === "0s";
      }))).toBe(true);
    }
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
