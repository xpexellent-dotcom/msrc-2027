import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { experienceCopy } from "../../src/content/conference-experiences";

async function assertFilters(page: Page, route: "program" | "media") {
  if (route === "media") {
    await expect.poll(() => new URL(page.url()).searchParams.toString()).toBe("edition=2026&kind=recording");
    await expect(page.getByTestId("media-edition")).toHaveValue("2026");
    await expect(page.getByTestId("media-kind")).toHaveValue("recording");
  } else {
    await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ day: "day2", q: "synthetic session" });
    await expect(page.getByTestId("program-day-day2")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("program-search")).toHaveValue("synthetic session");
  }
  expect(new URL(page.url()).hash).toBe("#main-content");
}

for (const locale of ["en", "ar"] as const) for (const route of ["media", "program"] as const) {
  test(`${locale} ${route} held JavaScript keeps first filter interaction inert until hydration`, async ({ page }) => {
    let release!: () => void;
    const scripts = new Promise<void>((resolve) => { release = resolve; });
    const writes: string[] = [];
    page.on("request", (request) => { if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method()); });
    await page.route("**/_next/static/**/*.js", async (request) => { await scripts; await request.continue(); });
    const initial = route === "media" ? "edition=2027&kind=highlight" : "day=day1&q=initial+query";
    try {
      await page.goto(`/${locale}/${route}?${initial}#main-content`, { waitUntil: "domcontentloaded" });
      const search = page.getByTestId(route === "media" ? "media-search" : "program-search");
      await expect(search).toBeDisabled();
      await expect(page.getByTestId(`${route}-clear`)).toBeDisabled();
      if (route === "media") {
        await expect(page.getByTestId("media-edition")).toBeDisabled();
        await expect(page.getByTestId("media-kind")).toBeDisabled();
        await expect(page.getByTestId("media-edition")).toHaveValue("2027");
        await expect(page.getByTestId("media-kind")).toHaveValue("highlight");
      } else {
        for (const day of ["all", "day1", "day2"]) await expect(page.getByTestId(`program-day-${day}`)).toBeDisabled();
        await expect(page.getByTestId("program-day-day1")).toHaveAttribute("aria-pressed", "true");
        await expect(search).toHaveValue("initial query");
      }
      expect(new URL(page.url()).searchParams.toString()).toBe(initial);
      release();
      await expect(search).toBeEnabled();
      await expect(page.getByTestId(`${route}-clear`)).toBeEnabled();
      if (route === "media") {
        await expect(page.getByTestId("media-edition")).toBeEnabled();
        await expect(page.getByTestId("media-kind")).toBeEnabled();
        // The original two changes still happen synchronously in the same turn.
        await page.evaluate(() => {
          for (const [id, value] of [["media-edition", "2026"], ["media-kind", "recording"]]) {
            const select = document.getElementById(id) as HTMLSelectElement;
            select.value = value; select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      } else {
        await page.getByTestId("program-day-day2").focus(); await page.keyboard.press("Space");
        await search.fill("synthetic session");
        // Empty approved catalogues must keep unavailable category/room options disabled.
        await expect(page.getByTestId("program-category")).toBeDisabled();
        await expect(page.getByTestId("program-room")).toBeDisabled();
      }
      await assertFilters(page, route);
      await page.goto(`/${locale}/about`); await page.goBack();
      await expect(search).toBeEnabled(); await assertFilters(page, route);
      const other = locale === "en" ? "ar" : "en";
      await page.getByRole("link", { name: other === "ar" ? "View this page in Arabic" : "View this page in English", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${other}/${route}\\?`));
      await expect(page.locator("html")).toHaveAttribute("lang", other);
      await expect(page.locator("html")).toHaveAttribute("dir", other === "ar" ? "rtl" : "ltr");
      await assertFilters(page, route);
      await expect(page).toHaveTitle(`${experienceCopy[other].pages[route].label} | MSRC 2027`);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([]);
      expect(writes).toEqual([]);
    } finally { release(); }
  });
}
