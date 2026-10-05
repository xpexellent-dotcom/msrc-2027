import { describe, expect, it } from "vitest";
import { conferenceDescription } from "@/lib/metadata";

// Search snippets lead with the confirmed dates, venue and city in each language.
describe("page descriptions", () => {
  it("prefixes the confirmed dates, venue and Jeddah in each language", () => {
    expect(conferenceDescription("en", "Practical learning alongside the scientific programme."))
      .toBe("27–28 January 2027, King Faisal Conference Center, Jeddah. Practical learning alongside the scientific programme.");
    expect(conferenceDescription("ar", "تعلّم عملي إلى جانب البرنامج العلمي."))
      .toBe("٢٧–٢٨ يناير ٢٠٢٧، مركز الملك فيصل للمؤتمرات، جدة. تعلّم عملي إلى جانب البرنامج العلمي.");
  });
});

describe("web app manifest", () => {
  it("names the site and points at existing icons", async () => {
    const { default: manifest } = await import("@/app/manifest");
    const value = manifest();
    expect(value).toMatchObject({ short_name: "MSRC 2027", start_url: "/", display: "browser" });
    expect(value.icons?.map((icon) => icon.src)).toEqual(["/icon.svg", "/apple-icon"]);
  });
});
