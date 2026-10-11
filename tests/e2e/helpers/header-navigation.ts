import { expect, type Page } from "@playwright/test";

/** A reader brings the compact desktop navigation back by scrolling upward. */
export async function revealDesktopHeader(page: Page) {
  const header = page.locator(".axiom-header");
  if (await header.getAttribute("data-compact") === "true") {
    // Wheel over the page's top edge, away from nested form or catalogue scrollers.
    // Pointer proximity itself must never reopen the compact navigation.
    await page.mouse.move((page.viewportSize()?.width ?? 1280) / 2, 8);
    await page.mouse.wheel(0, -160);
  }
  await expect(header).toHaveAttribute("data-compact", "false");
}

/** Language lives in the desktop bar and in the phone's explicit Menu disclosure. */
export async function languageLink(page: Page, name: string) {
  const toggle = page.locator(".menu-toggle");
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") !== "true") {
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".mobile-menu")).toBeVisible();
  } else if (!await toggle.isVisible()) {
    await revealDesktopHeader(page);
  }
  return page.getByRole("link", { name, exact: true });
}
