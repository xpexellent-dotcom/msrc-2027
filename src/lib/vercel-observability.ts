// ORG-008: Vercel Web Analytics and Speed Insights receive a page's address without its query
// string or fragment, so no token or personal value in a URL reaches them (PRV-03). Automated
// browsers are left out: test runs against a deployment neither count as visits nor send data.

export function pageAddress(url: string): string {
  const address = new URL(url);
  address.search = "";
  address.hash = "";
  return address.toString();
}

export function prepareObservabilityEvent<Event extends { url: string }>(event: Event, automated: boolean): Event | null {
  return automated ? null : { ...event, url: pageAddress(event.url) };
}
