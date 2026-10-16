import { describe, expect, it } from "vitest";
import { ContactBrowserDiagnostics } from "../helpers/contact-browser-diagnostics";

const origin = "http://127.0.0.1:3212";

describe("Contact visitor network evidence", () => {
  it.each(["/missing.png", "/_next/static/missing.js", "/fonts/missing.woff2", "/api/unrelated"])("fails an unrelated broken resource %s", (path) => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.networkFailure(`${origin}${path}`, "HTTP 404");
    expect(audit.snapshot().failures).toEqual([`HTTP 404: ${origin}${path}`]);
  });

  it("fails unexpected Contact API failures in a success case", () => {
    const audit = new ContactBrowserDiagnostics([origin], false);
    audit.networkFailure(`${origin}/api/contact`, "HTTP 500");
    expect(audit.snapshot().failures).toHaveLength(1);
  });

  it("records deliberate local Contact failures and their browser diagnostic", () => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.networkFailure(`${origin}/api/contact?locale=ar`, "net::ERR_INTERNET_DISCONNECTED");
    audit.consoleMessage("Failed to load resource: net::ERR_INTERNET_DISCONNECTED", `${origin}/api/contact?locale=ar`);
    expect(audit.snapshot()).toMatchObject({ failures: [], expectedContactFailures: [{ url: `${origin}/api/contact?locale=ar` }], expectedBrowserDiagnostics: [{ url: `${origin}/api/contact?locale=ar` }] });
  });

  it("does not allow a foreign-origin Contact path", () => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.networkFailure("https://unrelated.example.invalid/api/contact", "HTTP 503");
    audit.consoleMessage("Failed to load resource", "https://unrelated.example.invalid/api/contact");
    expect(audit.snapshot().failures).toHaveLength(2);
  });

  it("fails an empty-location diagnostic without an observed Contact failure", () => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.consoleMessage("Failed to load resource");
    expect(audit.snapshot().failures).toEqual(["Failed to load resource"]);
  });

  it("correlates empty-location diagnostics without hiding a simultaneously broken asset", () => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.networkFailure(`${origin}/api/contact`, "HTTP 500");
    audit.networkFailure(`${origin}/missing.css`, "HTTP 404");
    audit.consoleMessage("Failed to load resource");
    expect(audit.snapshot().failures).toEqual([`HTTP 404: ${origin}/missing.css`]);
    expect(audit.snapshot().expectedBrowserDiagnostics).toHaveLength(1);
  });

  it("does not hide hydration or application errors alongside deliberate API failures", () => {
    const audit = new ContactBrowserDiagnostics([origin], true);
    audit.networkFailure(`${origin}/api/contact`, "HTTP 503");
    audit.consoleMessage("Hydration failed");
    audit.applicationFailure("Uncaught application failure");
    expect(audit.snapshot().failures).toEqual(["Hydration failed", "Uncaught application failure"]);
  });

  it("records an aborted same-origin Next prefetch separately", () => {
    const audit = new ContactBrowserDiagnostics([origin], false);
    const url = `${origin}/en/program?_rsc=synthetic`;
    audit.networkFailure(url, "net::ERR_ABORTED", { method: "GET", headers: { rsc: "1", "next-router-prefetch": "1" } });
    expect(audit.snapshot()).toMatchObject({ failures: [], expectedContactFailures: [], expectedPrefetchCancellations: [{ url, reason: "net::ERR_ABORTED" }] });
  });

  it.each(["/missing.png", "/_next/static/missing.js"])("still fails an aborted ordinary asset %s", (path) => {
    const audit = new ContactBrowserDiagnostics([origin], false);
    audit.networkFailure(`${origin}${path}`, "net::ERR_ABORTED", { method: "GET", headers: { rsc: "1", "next-router-prefetch": "1" } });
    expect(audit.snapshot().failures).toHaveLength(1);
  });

  it.each<{ method: string; headers: Record<string, string> }>([
    { method: "GET", headers: {} },
    { method: "GET", headers: { rsc: "0", "next-router-prefetch": "1" } },
    { method: "GET", headers: { rsc: "1", "next-router-prefetch": "0" } },
    { method: "POST", headers: { rsc: "1", "next-router-prefetch": "1" } },
  ])("does not classify a request with wrong prefetch metadata as expected: %j", (request) => {
    const audit = new ContactBrowserDiagnostics([origin], false);
    audit.networkFailure(`${origin}/en/program?_rsc=synthetic`, "net::ERR_ABORTED", request);
    expect(audit.snapshot().failures).toHaveLength(1);
  });

  it.each([404, 500])("still fails an actual HTTP %s prefetch response", (status) => {
    const audit = new ContactBrowserDiagnostics([origin], false);
    audit.networkFailure(`${origin}/en/program?_rsc=synthetic`, `HTTP ${status}`, { method: "GET", headers: { rsc: "1", "next-router-prefetch": "1" } });
    expect(audit.snapshot().failures).toHaveLength(1);
  });
});
