import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { homepageCopy } from "@/content/public-site";

const hooks = vi.hoisted(() => ({ effects: [] as (() => void | (() => void))[] }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
}));
import { HorizontalRail } from "@/components/horizontal-rail";
import { PathwayDeck } from "@/components/pathway-deck";

// No DOM package is added for this CSS-first feature. These focused DOM doubles
// exercise the effect's browser boundaries; real geometry is covered by Playwright.
function mountGate({ height = 844, bodyHeight = 240, reduce = false, phone = true } = {}) {
  const dataset: { deck?: string } = {};
  const bodies = [{ getBoundingClientRect: () => ({ height: bodyHeight }) }];
  const list = { dataset, querySelectorAll: () => bodies };
  const probe = { offsetHeight: height, setAttribute: vi.fn(), style: { cssText: "" }, remove: vi.fn() };
  const media = {
    phone: { matches: phone, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    reduce: { matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn() },
  };
  const resize = { observe: vi.fn(), disconnect: vi.fn() };
  const add = vi.fn(), remove = vi.fn();
  vi.stubGlobal("document", { querySelector: () => list, createElement: () => probe, body: { append: vi.fn() }, documentElement: { clientHeight: height }, fonts: { ready: Promise.resolve() } });
  vi.stubGlobal("innerHeight", height);
  vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "96" }));
  vi.stubGlobal("matchMedia", (query: string) => query.includes("reduced-motion") ? media.reduce : media.phone);
  vi.stubGlobal("ResizeObserver", class { observe = resize.observe; disconnect = resize.disconnect; });
  vi.stubGlobal("addEventListener", add);
  vi.stubGlobal("removeEventListener", remove);
  expect(PathwayDeck()).toBeNull();
  const cleanup = hooks.effects.pop()!();
  return { dataset, probe, resize, media, add, remove, cleanup: cleanup as () => void };
}

beforeEach(() => { hooks.effects.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); });

describe("ORG-071 immersive public copy", () => {
  it("retains Arabic-localized digits and removes filler only from rendering", () => {
    expect(JSON.stringify(homepageCopy.ar)).not.toMatch(/[0-9]/);
    const source = readFileSync("src/components/homepage.tsx", "utf8");
    expect(source).not.toMatch(/pathwaysBody|pathway\.description|PortraitPlaceholder/);
    expect(homepageCopy.en.lead).toBeTruthy();
    expect(homepageCopy.ar.lead).toBeTruthy();
  });
  it("hides only the selected rail hint while preserving navigation tools", () => {
    const props = { locale: "en" as const, label: "Synthetic gallery", children: createElement("div", null, "Synthetic item") };
    const hidden = renderToStaticMarkup(createElement(HorizontalRail, { ...props, hint: false }));
    expect(hidden).not.toMatch(/<p(?:\s|>)/);
    expect(hidden).toContain("rail-tools--no-hint");
    expect(hidden).toContain('aria-label="Next"');
    const normal = renderToStaticMarkup(createElement(HorizontalRail, props));
    expect(normal).toContain("<p>Scroll to explore</p>");
    expect(normal).not.toContain("rail-tools--no-hint");
  });
});

describe("ENG-093 content-fit gate", () => {
  it("enables the CSS deck when normal phone content fits", () => {
    const gate = mountGate();
    expect(gate.dataset.deck).toBe("stack");
    expect(gate.add.mock.calls.map(([event]) => event)).toEqual(["resize"]);
    expect(gate.resize.observe).toHaveBeenCalledTimes(2);
    gate.cleanup();
  });
  it.each([{ reduce: true }, { height: 400 }, { bodyHeight: 800 }, { phone: false }])("uses readable static mode for %j", (options) => {
    const gate = mountGate(options);
    expect(gate.dataset.deck).toBe("static");
    gate.cleanup();
  });
  it("removes its probe, observers, listeners and mode on cleanup, including delayed fonts", async () => {
    const gate = mountGate();
    gate.cleanup();
    await Promise.resolve();
    expect(gate.dataset.deck).toBeUndefined();
    expect(gate.probe.remove).toHaveBeenCalledOnce();
    expect(gate.resize.disconnect).toHaveBeenCalledOnce();
    expect(gate.remove).toHaveBeenCalledWith("resize", expect.any(Function));
    for (const media of Object.values(gate.media)) expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
