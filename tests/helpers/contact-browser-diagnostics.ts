/** Keep deliberate Contact API failures separate from broken page resources. */
export class ContactBrowserDiagnostics {
  private readonly failures: string[] = [];
  private readonly contactFailures: { url: string; reason: string }[] = [];
  private readonly prefetchCancellations: { url: string; reason: string }[] = [];
  private readonly networkMessages: { text: string; url: string }[] = [];

  constructor(private readonly origins: readonly string[], private readonly expectsContactFailure: boolean) {}

  private contactUrl(url: string) {
    try {
      const parsed = new URL(url);
      return this.origins.includes(parsed.origin) && parsed.pathname === "/api/contact";
    } catch { return false; }
  }

  applicationFailure(message: string) { this.failures.push(message); }

  networkFailure(url: string, reason: string, request?: { method: string; headers: Record<string, string> }) {
    let prefetch = false;
    try {
      const parsed = new URL(url);
      prefetch = this.origins.includes(parsed.origin) && parsed.searchParams.has("_rsc") && request?.method === "GET"
        && request.headers["next-router-prefetch"] === "1" && request.headers.rsc === "1"
        && /^(?:net::ERR_ABORTED|Load request cancel(?:l)?ed|cancel(?:l)?ed|The operation was aborted\.?)$/i.test(reason);
    } catch { /* A malformed address is never an expected cancellation. */ }
    if (prefetch) { this.prefetchCancellations.push({ url, reason }); return; }
    if (this.expectsContactFailure && this.contactUrl(url)) this.contactFailures.push({ url, reason });
    else this.failures.push(`${reason}: ${url}`);
  }

  consoleMessage(text: string, url = "") {
    if (/Failed to load resource|net::ERR_|Load failed|Fetch API cannot load/i.test(text)) this.networkMessages.push({ text, url });
    else this.failures.push(text);
  }

  snapshot() {
    // Some engines omit the console location for fetch failures. Accept that
    // diagnostic only alongside an actual, allowed Contact network failure.
    // Every failed response/request is recorded independently, so an unrelated
    // failed asset still fails even when its console location is empty.
    const matched = (message: { url: string }) => this.contactFailures.length > 0 && (!message.url || this.contactUrl(message.url))
      || Boolean(message.url) && this.prefetchCancellations.some((request) => request.url === message.url);
    return {
      failures: [...this.failures, ...this.networkMessages.filter((message) => !matched(message)).map((message) => message.text)],
      expectedContactFailures: [...this.contactFailures],
      expectedPrefetchCancellations: [...this.prefetchCancellations],
      expectedBrowserDiagnostics: this.networkMessages.filter(matched),
    };
  }
}
