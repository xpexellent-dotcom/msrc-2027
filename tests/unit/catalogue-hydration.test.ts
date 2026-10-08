import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MediaExperience, ProgrammeExperience } from "@/components/conference-experiences";
import type { PublicSession } from "@/content/conference-experiences";

const address = vi.hoisted(() => ({ query: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => address.query }));
const session: PublicSession = {
  slug: "synthetic-session", publication: "approved", day: "day2", title: "Synthetic session", description: "Synthetic only", topic: "Synthetic",
  category: { id: "synthetic", label: { en: "Synthetic", ar: "مصطنعة" } }, room: "Synthetic Room", startAt: null, endAt: null,
  speakerSlugs: [], objectives: [], recordingSlug: null,
};
function controls(html: string) { return html.match(/<(?:input|select|button)\b[^>]*>/g) ?? []; }

describe("public catalogue server hydration boundary", () => {
  beforeEach(() => { address.query = new URLSearchParams(); });
  it.each(["en", "ar"] as const)("%s programme controls stay disabled in server HTML even when category/room options exist", (locale) => {
    const html = renderToStaticMarkup(createElement(ProgrammeExperience, { locale, sessions: [session], speakers: [] }));
    expect(controls(html)).toHaveLength(6);
    expect(controls(html).every((control) => control.includes('disabled=""'))).toBe(true);
    expect(html).toContain('value="synthetic"');
    expect(html).toContain('value="Synthetic Room"');
  });
  it.each(["en", "ar"] as const)("%s media filters stay disabled in server HTML", (locale) => {
    const html = renderToStaticMarkup(createElement(MediaExperience, { locale, media: [], sessions: [] }));
    expect(controls(html)).toHaveLength(3);
    expect(controls(html).every((control) => control.includes('disabled=""'))).toBe(true);
  });
  it.each(["en", "ar"] as const)("%s media deep-link selections are preserved while clear/search controls remain inert", (locale) => {
    address.query = new URLSearchParams("edition=2026&kind=recording&q=synthetic");
    const html = renderToStaticMarkup(createElement(MediaExperience, { locale, media: [], sessions: [] }));
    expect(controls(html)).toHaveLength(4);
    expect(controls(html).every((control) => control.includes('disabled=""'))).toBe(true);
    expect(html).toContain('value="2026" selected=""');
    expect(html).toContain('value="recording" selected=""');
    expect(html).toContain('value="synthetic"');
  });
  it.each(["en", "ar"] as const)("%s programme deep-link fields and selected day survive server rendering", (locale) => {
    address.query = new URLSearchParams("day=day2&category=synthetic&room=Synthetic+Room&q=synthetic");
    const html = renderToStaticMarkup(createElement(ProgrammeExperience, { locale, sessions: [session], speakers: [] }));
    expect(controls(html)).toHaveLength(7);
    expect(controls(html).every((control) => control.includes('disabled=""'))).toBe(true);
    expect(html).toMatch(/data-testid="program-day-day2"[^>]*aria-pressed="true"/);
    expect(html).toContain('value="synthetic" selected=""');
    expect(html).toContain('value="Synthetic Room" selected=""');
  });
});
