import { setTimeout } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const canonicalOrigin = "https://www.msrc2027.com";
const apexOrigin = "https://msrc2027.com";
const statusEndpoint = "https://api.github.com/repos/xpexellent-dotcom/msrc-2027/commits";
const routes = [
  { url: `${canonicalOrigin}/en`, locale: "en", direction: "ltr" },
  { url: `${canonicalOrigin}/ar`, locale: "ar", direction: "rtl" },
  { url: `${apexOrigin}/en`, locale: "en", direction: "ltr" },
] as const;

type VercelStatus = { state: string; target_url?: string };

function fetchOptions(): RequestInit {
  return { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000) };
}

export function deploymentIdFromStatus(status: VercelStatus | undefined): string | null {
  if (!status || status.state === "pending") return null;
  if (status.state !== "success") throw new Error(`Vercel build status is ${status.state}.`);
  const id = status.target_url?.match(/^https:\/\/vercel\.com\/msrc2027\/msrc-2027\/([a-zA-Z0-9]+)$/)?.[1];
  if (!id) throw new Error("Vercel status did not resolve to the MSRC deployment.");
  return `dpl_${id}`;
}

async function checkAliases(expectedId: string, fetcher: typeof fetch): Promise<boolean> {
  const matches = await Promise.all(routes.map(async ({ url, locale, direction }) => {
    const isApex = url.startsWith(apexOrigin);
    const response = await fetcher(url, { ...fetchOptions(), redirect: isApex ? "manual" : "error" });
    if (isApex && [301, 302, 307, 308].includes(response.status)) {
      if (response.headers.get("location") !== `${canonicalOrigin}/en`) {
        throw new Error("The apex alias redirected outside the canonical English homepage.");
      }
      return true;
    }
    if (response.status !== 200) throw new Error(`${url} returned HTTP ${response.status}.`);
    const html = (await response.text()).match(/<html\b[^>]*>/i)?.[0];
    if (!html) throw new Error(`${url} did not return an HTML document.`);
    if (html.match(/\bdata-dpl-id="([^"]+)"/)?.[1] !== expectedId) return false;
    if (!html.includes(` lang="${locale}"`) || !html.includes(` dir="${direction}"`)) {
      throw new Error(`${url} did not declare ${locale} and ${direction}.`);
    }
    return true;
  }));
  return matches.every(Boolean);
}

export async function verifyServingDeployment(expectedId: string, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (!await checkAliases(expectedId, fetcher)) return false;

  const health = await fetcher(`${canonicalOrigin}/api/health`, fetchOptions());
  if (health.status !== 200) throw new Error(`Runtime health returned HTTP ${health.status}.`);
  const body = await health.json();
  if (!health.headers.get("cache-control")?.split(",").some(value => value.trim() === "no-store")
    || body?.status !== "ok" || body.scope !== "runtime-health" || body.database !== "reachable") {
    throw new Error("Runtime health did not confirm an uncached read from Supabase.");
  }

  // Recheck the aliases around the health request in case they moved during the probe.
  return checkAliases(expectedId, fetcher);
}

async function verifyProductionCommit(sha: string, token: string): Promise<string> {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("A full GitHub commit SHA is required.");
  if (!token) throw new Error("GH_TOKEN is required to read the Vercel commit status.");

  const expires = Date.now() + 5 * 60_000;
  let expectedId: string | null = null;
  do {
    if (!expectedId) {
      const response = await fetch(`${statusEndpoint}/${sha}/status`, {
        ...fetchOptions(),
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}` },
      });
      if (response.status !== 200) throw new Error(`GitHub commit status returned HTTP ${response.status}.`);
      const { statuses } = await response.json() as { statuses: Array<VercelStatus & { context: string }> };
      expectedId = deploymentIdFromStatus(statuses.find(status => status.context === "Vercel"));
    }
    if (expectedId && await verifyServingDeployment(expectedId)) return expectedId;
    await setTimeout(10_000);
  } while (Date.now() < expires);
  throw new Error(expectedId
    ? `Production aliases did not converge on deployment ${expectedId}.`
    : `No successful Vercel status appeared for ${sha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.env.GITHUB_SHA ?? "";
  try {
    const deploymentId = await verifyProductionCommit(sha, process.env.GH_TOKEN ?? "");
    console.log(`Verified ${sha} on ${deploymentId}. Production aliases, English and Arabic document direction, and Supabase runtime reachability passed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Production verification failed.");
    process.exitCode = 1;
  }
}
