// ORG-008: Vercel Web Analytics and Speed Insights receive a page's address without its query
// string or fragment, so no token or personal value in a URL reaches them (PRV-03). Automated
// browsers are left out: test runs against a deployment neither count as visits nor send data.

/** The public information pages in app/[locale]/(preview); one slug segment only under program/speakers. */
export const countedSections = ["about", "dates-venue", "program", "programme", "speakers", "workshops", "participate", "participation", "registration", "submissions", "hackathon", "3mt", "media", "contact", "privacy", "terms"] as const;

/**
 * Only public information pages are counted. Future account, review and organizer areas,
 * 404s and internal previews send nothing unless a public section is added here deliberately.
 */
export function isCountedPage(pathname: string): boolean {
  const [locale, section, slug, ...rest] = pathname.replace(/\/+$/, "").split("/").slice(1);
  if (locale !== "en" && locale !== "ar") return false;
  if (section === undefined) return true;
  if (!(countedSections as readonly string[]).includes(section) || rest.length) return false;
  return slug === undefined || section === "program" || section === "speakers";
}

export function pageAddress(url: string): string {
  const address = new URL(url);
  address.search = "";
  address.hash = "";
  return address.toString();
}

export function prepareObservabilityEvent<Event extends { url: string }>(event: Event, automated: boolean): Event | null {
  if (automated || !isCountedPage(new URL(event.url).pathname)) return null;
  return { ...event, url: pageAddress(event.url) };
}
