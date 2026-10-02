import { pathToFileURL } from "node:url";
import { resolveSupabaseConfig } from "../src/lib/supabase/config.ts";

/** Anonymous own-context probe only. Never signs in, installs fixtures or logs responses. */
export async function verifyHostedAuthorization(input, fetcher = fetch) {
  const config = resolveSupabaseConfig(input);
  if (!config || config.target !== "hosted") throw new Error("Authorization verification requires the configured hosted target and publishable key.");
  let response;
  let payload;
  try {
    response = await fetcher(`${config.url}/rest/v1/rpc/msrc_access_context`, {
      method: "POST", headers: { apikey: config.publishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: "msrc-2027" }),
      redirect: "error", signal: AbortSignal.timeout(10_000), cache: "no-store",
    });
    payload = await response.json();
  } catch {
    throw new Error("Hosted authorization verification could not complete; response details withheld.");
  }
  // A missing function, rejected API key or any successful context is not this assertion.
  if (![401, 403].includes(response.status) || payload?.code !== "42501") {
    throw new Error(`Expected anonymous RPC permission denial was not confirmed (HTTP ${response.status}); response details withheld.`);
  }
  return Object.freeze({ origin: config.url, status: response.status, anonymousContextDenied: true });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyHostedAuthorization({
      target: process.env.NEXT_PUBLIC_SUPABASE_TARGET,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    process.stdout.write(`PASS: hosted own-context RPC denies anonymous access (HTTP ${result.status}). No account, grant or fixture was created.\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Hosted verification failed; details withheld."}\n`);
    process.exitCode = 1;
  }
}
