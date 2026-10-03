import { describe, expect, it } from "vitest";
import { conferenceDescription } from "@/lib/metadata";

// Search snippets for inner pages lead with the confirmed dates and city, like the homepage.
describe("page descriptions", () => {
  it("prefixes the dates and Jeddah in each language", () => {
    expect(conferenceDescription("en", "Practical learning alongside the scientific programme."))
      .toBe("27–28 January 2027, Jeddah. Practical learning alongside the scientific programme.");
    expect(conferenceDescription("ar", "تعلّم عملي إلى جانب البرنامج العلمي."))
      .toBe("٢٧–٢٨ يناير ٢٠٢٧، جدة. تعلّم عملي إلى جانب البرنامج العلمي.");
  });
});
