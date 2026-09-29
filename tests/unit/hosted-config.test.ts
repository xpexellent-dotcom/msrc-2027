import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createBrowserDataClient } from "@/lib/supabase/browser";
import { createServerDataClient } from "@/lib/supabase/server";
import { getSupabaseConfig, resolveSupabaseConfig } from "@/lib/supabase/config";

vi.mock("client-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({})) }));

const hostedUrl = "https://abcdefghijklmnopqrst.supabase.co";
const localUrl = "http://127.0.0.1:54321";
const publishableKey = "sb_publishable_synthetic_test_key";

// TypeScript checks this body, but it is never invoked and cannot issue a query.
// An unused @ts-expect-error fails typecheck if the default contract grows tables.
void (() => {
  // @ts-expect-error Hosted/default clients must not claim the local fixture exists.
  createBrowserDataClient()?.from("foundation_samples");
  // @ts-expect-error The server default must enforce the same empty table contract.
  createServerDataClient()?.from("foundation_samples");
  createBrowserDataClient("local")?.from("foundation_samples");
  createServerDataClient("local")?.from("foundation_samples");
});

function setClientEnvironment(target: string | undefined, url = hostedUrl) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_TARGET", target);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", publishableKey);
}

afterEach(() => vi.unstubAllGlobals());

describe("explicit hosted Supabase configuration (INF-01/04, SEC-02/06)", () => {
  it("keeps an unconfigured shell optional and local by default", () => {
    expect(resolveSupabaseConfig({})).toBeNull();
    expect(resolveSupabaseConfig({ target: "", url: "", publishableKey: "" })).toBeNull();
    expect(resolveSupabaseConfig({ url: localUrl, publishableKey })).toEqual({
      target: "local", url: localUrl, publishableKey,
    });
    expect(resolveSupabaseConfig({ target: "local", url: localUrl, publishableKey })).toEqual({
      target: "local", url: localUrl, publishableKey,
    });
    expect(resolveSupabaseConfig({ target: "", url: localUrl, publishableKey })).toEqual({
      target: "local", url: localUrl, publishableKey,
    });
  });

  it.each([hostedUrl, `${hostedUrl}/`])("accepts a standard hosted origin only after opt-in", (url) => {
    const config = resolveSupabaseConfig({ target: "hosted", url, publishableKey });
    expect(config).toEqual({ target: "hosted", url: hostedUrl, publishableKey });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it.each([undefined, "", "local"])("rejects a hosted origin under target %s", (target) => {
    expect(() => resolveSupabaseConfig({ target, url: hostedUrl, publishableKey })).toThrow();
  });

  it.each([" ", "production", "HOSTED", " hosted", "__proto__"])("rejects unknown target %j", (target) => {
    expect(() => resolveSupabaseConfig({ target, url: hostedUrl, publishableKey })).toThrow(
      "Supabase target must be local or hosted.",
    );
  });

  it.each([
    {},
    { url: hostedUrl },
    { publishableKey },
    { url: "", publishableKey: "" },
  ])("requires a complete hosted configuration", (input) => {
    expect(() => resolveSupabaseConfig({ target: "hosted", ...input })).toThrow(
      "Both hosted Supabase environment variables must be configured.",
    );
  });

  it.each([
    localUrl,
    "https://127.0.0.1",
    "http://abcdefghijklmnopqrst.supabase.co",
    "https://abcdefghijklmnopqrs.supabase.co",
    "https://abcdefghijklmnopqrstu.supabase.co",
    "https://ABCDEFGHIJKLMNOPQRST.supabase.co",
    "https://abcdefghijklmnopqrs-.supabase.co",
    "https://abcdefghijklmnopqrst.supabase.co.attacker.example",
    "https://custom-database.example",
    `${hostedUrl}:443`,
    `${hostedUrl}:54321`,
    `${hostedUrl}/rest/v1`,
    `${hostedUrl}/.`,
    `${hostedUrl}/%2e`,
    `${hostedUrl}?token=private`,
    `${hostedUrl}#private`,
    `${hostedUrl}?`,
    `${hostedUrl}#`,
    "https://user:password@abcdefghijklmnopqrst.supabase.co",
    "https://%61bcdefghijklmnopqrst.supabase.co",
    ` ${hostedUrl}`,
    `${hostedUrl}\n`,
  ])("rejects a nonstandard, decorated, or wrong-target hosted URL: %j", (url) => {
    expect(() => resolveSupabaseConfig({ target: "hosted", url, publishableKey })).toThrow(
      "Hosted Supabase requires a standard HTTPS project origin.",
    );
  });

  it.each([
    "sb_secret_synthetic_private_key",
    "eyJhbGciOiJIUzI1NiJ9.synthetic.signature",
    "service_role",
    "sb_publishable_",
    "sb_publishable_key with spaces",
    " sb_publishable_key",
    "sb_publishable_key\n",
    "not-a-key",
  ])("rejects privileged, legacy, or malformed hosted keys", (key) => {
    expect(() => resolveSupabaseConfig({ target: "hosted", url: hostedUrl, publishableKey: key })).toThrow(
      "Use only a Supabase publishable key for the hosted client.",
    );
  });

  it("does not include supplied values in configuration errors", () => {
    const secret = "sb_secret_private_do_not_log";
    for (const input of [
      { target: secret, url: hostedUrl, publishableKey },
      { target: "hosted", url: `${hostedUrl}?secret=${secret}`, publishableKey },
      { target: "hosted", url: hostedUrl, publishableKey: secret },
    ]) {
      let message = "";
      try {
        resolveSupabaseConfig(input);
      } catch (error) {
        message = String(error);
      }
      expect(message).not.toBe("");
      expect(message).not.toContain(secret);
      expect(message).not.toContain(hostedUrl);
    }
  });

  it("reads the explicit public target without a server credential fallback", () => {
    setClientEnvironment("hosted");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_private_do_not_use");
    expect(getSupabaseConfig()).toEqual({ target: "hosted", url: hostedUrl, publishableKey });
  });
});

describe.each([
  ["browser", createBrowserDataClient],
  ["server", createServerDataClient],
] as const)("%s anonymous data-client boundary", (_name, createDataClient) => {
  it("rejects local fixture access to a hosted project before creating a client", () => {
    setClientEnvironment("hosted");
    expect(() => createDataClient("local")).toThrow(
      "Local fixture clients cannot connect to hosted Supabase.",
    );
    expect(createClient).not.toHaveBeenCalled();
  });

  it("uses only the selected publishable key with no session persistence or callback handling", () => {
    setClientEnvironment("hosted");
    createDataClient();
    expect(createClient).toHaveBeenCalledExactlyOnceWith(hostedUrl, publishableKey, expect.objectContaining({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }));
  });

  it("retains explicit local fixture access for the guarded integration suite", () => {
    setClientEnvironment(undefined, localUrl);
    createDataClient("local");
    expect(createClient).toHaveBeenCalledWith(localUrl, publishableKey, expect.any(Object));
  });

  it("returns no client when the optional local configuration is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_TARGET", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(createDataClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects a hosted endpoint without explicit target before constructing a client", () => {
    setClientEnvironment(undefined);
    expect(() => createDataClient()).toThrow();
    expect(createClient).not.toHaveBeenCalled();
  });
});

it("keeps the server client's requests uncached", async () => {
  setClientEnvironment("hosted");
  const network = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", network);
  createServerDataClient();
  const clientOptions = vi.mocked(createClient).mock.calls[0][2];
  await clientOptions?.global?.fetch?.(`${hostedUrl}/rest/v1/`, { cache: "force-cache" });
  expect(network).toHaveBeenCalledExactlyOnceWith(`${hostedUrl}/rest/v1/`, { cache: "no-store" });
});
