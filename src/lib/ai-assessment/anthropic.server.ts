import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AssessmentConfiguration, AssessmentProvider } from "./contracts.ts";
import { ANTHROPIC_TRANSPORT_POLICY } from "./configuration.server.ts";

/** Constructed only after the adapter's flag, approval, authority and budget gates. */
export function createAnthropicProvider(config: AssessmentConfiguration): AssessmentProvider {
  // SDK custom-header env can override account/workspace/auth independently of the approved key.
  if (process.env.ANTHROPIC_CUSTOM_HEADERS) throw new Error("UNAPPROVED_PROVIDER_HEADERS");
  const client = new Anthropic({ apiKey: config.apiKey, authToken: null, baseURL: ANTHROPIC_TRANSPORT_POLICY.baseURL,
    logLevel: ANTHROPIC_TRANSPORT_POLICY.logLevel, maxRetries: ANTHROPIC_TRANSPORT_POLICY.maxRetries, timeout: ANTHROPIC_TRANSPORT_POLICY.timeout });
  return {
    assess: request => client.beta.messages.create(request),
    submitBatch: requests => client.messages.batches.create({ requests: [...requests] }),
    retrieveBatch: id => client.messages.batches.retrieve(id),
    batchResults: async function* (id) {
      const results = await client.messages.batches.results(id);
      for await (const item of results) yield item;
    },
  };
}
