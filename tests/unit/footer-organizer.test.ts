import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Footer } from "@/components/footer";
import { locales } from "@/lib/i18n";

// ORG-038: every public page credits the organizing club and faculty in the footer.
describe("footer organizer credit", () => {
  it.each(locales)("%s footer names the Research Principles Club and the Faculty of Medicine, KAU", (locale) => {
    const html = renderToStaticMarkup(Footer({ locale }));
    if (locale === "en") expect(html).toContain("Organized by the Research Principles Club, Faculty of Medicine, King Abdulaziz University.");
    else expect(html).toContain("ينظّمه نادي مبادئ البحث العلمي بكلية الطب، جامعة الملك عبدالعزيز.");
  });
});
