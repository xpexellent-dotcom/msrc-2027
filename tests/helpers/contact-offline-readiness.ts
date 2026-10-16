import type { Locator, Page } from "@playwright/test";

export async function waitForContactOfflineReady(page: Page, submit: Locator) {
  // This scenario disconnects the whole browser after the form has loaded.
  // Scrolling can reveal footer links whose prefetches load additional scripts;
  // let those dependencies finish before the intentional connection loss.
  await submit.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
}
