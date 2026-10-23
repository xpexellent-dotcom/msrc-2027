import "server-only";
import type { AssessmentConfiguration, AssessmentProvider, ProviderResponse } from "./contracts.ts";
import { DEEPSEEK_TRANSPORT_POLICY } from "./configuration.server.ts";

/** Only these fixed categories leave the transport; no provider message/body is retained. */
export class DeepSeekProviderError extends Error {
  constructor(readonly code: "rate_limited" | "provider_unavailable" | "provider_configuration" | "invalid_output", readonly retryable: boolean) {
    super("PROVIDER_UNAVAILABLE");
    this.name = "DeepSeekProviderError";
  }
}

/** Plain fetch reads no SDK environment defaults; reject known endpoint/header overrides explicitly. */
function assertTransportEnvironment() {
  if (["DEEPSEEK_BASE_URL", "DEEPSEEK_API_BASE", "DEEPSEEK_CUSTOM_HEADERS", "DEEPSEEK_HEADERS", "ANTHROPIC_CUSTOM_HEADERS"]
    .some(key => Boolean(process.env[key]))) throw new Error("UNAPPROVED_PROVIDER_TRANSPORT");
}

/** Constructed only after the adapter's flag, approval, authority and budget gates. */
export function createDeepSeekProvider(config: Pick<AssessmentConfiguration, "apiKey">): AssessmentProvider {
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
        if (!response.ok) {
          await response.body?.cancel();
          throw new DeepSeekProviderError(response.status === 429 ? "rate_limited" : response.status >= 500 ? "provider_unavailable" : "provider_configuration", response.status === 429 || response.status >= 500);
        }
        try { return await response.json() as ProviderResponse; }
        catch { throw new DeepSeekProviderError("invalid_output", false); }
      } catch (error) {
        // Never propagate bodies, manuscript text, credentials or raw network diagnostics.
        throw error instanceof DeepSeekProviderError ? error : new DeepSeekProviderError("provider_unavailable", true);
      } finally { clearTimeout(timeout); }
    },
  } satisfies AssessmentProvider);
}
