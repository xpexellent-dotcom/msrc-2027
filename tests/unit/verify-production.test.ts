import { describe, expect, it, vi } from "vitest";
import { deploymentIdFromStatus, verifyServingDeployment } from "../../scripts/verify-production";

const vercelStatusUrl = "https://vercel.com/msrc2027/msrc-2027/Abc123";
const deploymentId = "dpl_Abc123";
const healthRoute = "https://www.msrc2027.com/api/health";

function healthyResponse(database = "reachable", cacheControl = "no-store") {
  return Response.json({ status: "ok", scope: "runtime-health", database }, {
    headers: { "Cache-Control": cacheControl },
  });
}

function homeResponse(url: string, id = deploymentId, direction?: string) {
  const locale = url.endsWith("/ar") ? "ar" : "en";
  return new Response(`<!doctype html><html data-dpl-id="${id}" lang="${locale}" dir="${direction ?? (locale === "ar" ? "rtl" : "ltr")}"></html>`);
}

describe("production deployment verification", () => {
  it("takes an ID only from a successful status for the MSRC Vercel project", () => {
    expect(deploymentIdFromStatus(undefined)).toBeNull();
    expect(deploymentIdFromStatus({ state: "pending" })).toBeNull();
    expect(deploymentIdFromStatus({ state: "success", target_url: vercelStatusUrl })).toBe(deploymentId);
    expect(() => deploymentIdFromStatus({ state: "failure" })).toThrow("failure");
    expect(() => deploymentIdFromStatus({
      state: "success", target_url: "https://vercel.com/another-team/msrc-2027/Abc123",
    })).toThrow("MSRC deployment");
  });

  it("requires the English and Arabic production pages and the apex alias on both sides of an uncached health read", async () => {
    const fetcher = vi.fn<typeof fetch>(async url => String(url) === healthRoute
      ? healthyResponse()
      : homeResponse(String(url)));

    await expect(verifyServingDeployment(deploymentId, fetcher)).resolves.toBe(true);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "https://www.msrc2027.com/en", "https://www.msrc2027.com/ar", "https://msrc2027.com/en",
      healthRoute,
      "https://www.msrc2027.com/en", "https://www.msrc2027.com/ar", "https://msrc2027.com/en",
    ]);
  });

  it("waits for a stale alias and does not report the old deployment's health", async () => {
    const fetcher = vi.fn<typeof fetch>(async url => homeResponse(String(url),
      String(url) === "https://msrc2027.com/en" ? "dpl_Previous" : deploymentId));

    await expect(verifyServingDeployment(deploymentId, fetcher)).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalledWith(healthRoute, expect.anything());
  });

  it("accepts an apex redirect to the canonical homepage and rejects other destinations", async () => {
    let destination = "https://www.msrc2027.com/en";
    const fetcher = vi.fn<typeof fetch>(async url => {
      if (String(url) === healthRoute) return healthyResponse();
      if (String(url) === "https://msrc2027.com/en") return Response.redirect(destination, 308);
      return homeResponse(String(url));
    });

    await expect(verifyServingDeployment(deploymentId, fetcher)).resolves.toBe(true);
    destination = "https://www.msrc2027.com/ar";
    await expect(verifyServingDeployment(deploymentId, fetcher)).rejects.toThrow("outside the canonical English homepage");
  });

  it("waits if an alias moves while the health check is running", async () => {
    let healthy = false;
    const fetcher = vi.fn<typeof fetch>(async url => {
      if (String(url) === healthRoute) {
        healthy = true;
        return healthyResponse();
      }
      return homeResponse(String(url), healthy ? "dpl_Next" : deploymentId);
    });

    await expect(verifyServingDeployment(deploymentId, fetcher)).resolves.toBe(false);
  });

  it("fails when Arabic serves the expected deployment with the wrong direction", async () => {
    const fetcher = vi.fn<typeof fetch>(async url => homeResponse(String(url), deploymentId, "ltr"));
    await expect(verifyServingDeployment(deploymentId, fetcher)).rejects.toThrow("did not declare ar and rtl");
  });

  it.each([["not-configured", "no-store"], ["reachable", "public, max-age=60"]])(
    "rejects HTTP 200 health with database=%s and cache-control=%s",
    async (database, cacheControl) => {
      const fetcher = vi.fn<typeof fetch>(async url => String(url) === healthRoute
        ? healthyResponse(database, cacheControl)
        : homeResponse(String(url)));
      await expect(verifyServingDeployment(deploymentId, fetcher)).rejects.toThrow("uncached read from Supabase");
    },
  );
});
