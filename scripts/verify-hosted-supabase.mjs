import { pathToFileURL } from "node:url";
import { resolveSupabaseConfig } from "../src/lib/supabase/config.ts";

/** Check public service settings only: no table reads, mutations, sessions or email. */
export async function verifyHostedSupabase(input, fetcher = fetch) {
  const config = resolveSupabaseConfig(input);
  if (!config || config.target !== "hosted") {
    throw new Error("Hosted verification requires target=hosted, its HTTPS project URL and a publishable key.");
  }

  let response;
  try {
    response = await fetcher(`${config.url}/auth/v1/settings`, {
      method: "GET",
      headers: { apikey: config.publishableKey, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Hosted Supabase could not be reached within the timeout. Check project health and network access; response details withheld.");
  }

  // Discard settings instead of logging provider configuration or response bodies.
  try {
    await response.body?.cancel();
  } catch {
    throw new Error("Hosted Supabase response could not be safely finalized; details withheld.");
  }
  if (!response.ok) {
    throw new Error(`Hosted Supabase verification failed (HTTP ${response.status}). Check project health and the publishable key; response details withheld.`);
  }
  if (!response.headers.get("content-type")?.includes("json")) {
    throw new Error("Hosted Supabase did not return the expected settings response; response details withheld.");
  }

  return Object.freeze({ origin: config.url, status: response.status });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyHostedSupabase({
      target: process.env.NEXT_PUBLIC_SUPABASE_TARGET,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    process.stdout.write(`PASS: hosted Supabase accepted the publishable key (HTTP ${result.status}) at ${result.origin}. No rows read or changed.\n`);
    process.stdout.write("This confirms service connectivity, not Data API CRUD access, production readiness or RLS policy coverage.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Hosted verification failed; details withheld."}\n`);
    process.exitCode = 1;
  }
}
