import "server-only";
import type { AssessmentConfiguration, AssessmentProvider, ProviderResponse } from "./contracts.ts";
import { DEEPSEEK_TRANSPORT_POLICY } from "./configuration.server.ts";

/** Plain fetch reads no SDK environment defaults; reject known endpoint/header overrides explicitly. */
function assertTransportEnvironment() {
  if (["DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE", "DEEPSEEK_CUSTOM_HEADERS", "DEEPSEEK_HEADERS", "ANTHROPIC_CUSTOM_HEADERS"]
    .some(key => Boolean(process.env[key]))) throw new Error("UNAPPROVED_PROVIDER_TRANSPORT");
}

/** Constructed only after the adapter's flag, approval, authority and budget gates. */
export function createDeepSeekProvider(config: AssessmentConfiguration): AssessmentProvider {
  assertTransportEnvironment();
  const apiKey = config.apiKey; // Only the approved credential, never an ambient provider key/token.
  return Object.freeze({
    async assess(request) {
      assertTransportEnvironment();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TRANSPORT_POLICY.timeout);
      try {
        const response = await fetch(`${DEEPSEEK_TRANSPORT_POLICY.baseURL}${DEEPSEEK_TRANSPORT_POLICY.endpoint}`, {
          method: "POST", redirect: DEEPSEEK_TRANSPORT_POLICY.redirect, credentials: DEEPSEEK_TRANSPORT_POLICY.credentials,
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(request), signal: controller.signal,
        });
        if (!response.ok) throw new Error("PROVIDER_UNAVAILABLE");
        return await response.json() as ProviderResponse;
      } catch {
        // Never propagate bodies, manuscript text, credentials or raw network diagnostics.
        throw new Error("PROVIDER_UNAVAILABLE");
      } finally { clearTimeout(timeout); }
    },
  } satisfies AssessmentProvider);
}
