import { expect, type Page } from "@playwright/test";

/** Axe falls back to inline CSS when a same-origin stylesheet is not readable yet. */
export async function expectStylesheetsReady(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).filter((link) => new URL(link.href).origin === location.origin);
    if (!links.length) return ["No application stylesheets are present"];
    return links.filter((link) => {
      try { return link.sheet?.cssRules === undefined; } catch { return true; }
    }).map((link) => new URL(link.href).pathname);
  }), { message: "Application stylesheets must have readable CSSOM before capture or axe" }).toEqual([]);
}
