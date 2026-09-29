import { beforeAll, describe, expect, it } from "vitest";
import { createBrowserDataClient } from "@/lib/supabase/browser";
import { createServerDataClient } from "@/lib/supabase/server";

const publicSample = {
  id: "00000000-0000-4000-8000-000000000001",
  label: "Synthetic public foundation sample",
  is_public: true,
};
const hiddenSampleId = "00000000-0000-4000-8000-000000000002";
const absentSampleId = "00000000-0000-4000-8000-ffffffffffff";

describe.each([
  ["browser", () => createBrowserDataClient("local")],
  ["server", () => createServerDataClient("local")],
] as const)("%s wrapper against local Supabase (INF-04, SEC-02)", (_name, createClient) => {
  let client: NonNullable<ReturnType<typeof createClient>>;

  beforeAll(() => {
    // Explicit local factories and suite startup independently enforce loopback.
    // Missing settings must fail this explicit command rather than report a skip.
    const configuredClient = createClient();
    if (!configuredClient) {
      throw new Error(
        "Local Supabase is not configured. Start the local stack and set its URL and publishable key in .env.local before running the integration suite.",
      );
    }
    client = configuredClient;
  });

  it("reads the public synthetic seed through the real Data API", async () => {
    const { data, error } = await client
      .from("foundation_samples")
      .select("id,label,is_public")
      .order("id")
      .abortSignal(AbortSignal.timeout(5_000));
    expect(error?.code).toBeUndefined();
    expect(data).toEqual([publicSample]);
  });

  it("does not expose the hidden sample by its known identifier", async () => {
    const { data, error } = await client
      .from("foundation_samples")
      .select("id,label,is_public")
      .eq("id", hiddenSampleId)
      .abortSignal(AbortSignal.timeout(5_000));
    expect(error?.code).toBeUndefined();
    expect(data).toEqual([]);
  });

  it("denies insert without changing the existing seed", async () => {
    // A duplicate primary key also prevents insertion if permissions regress.
    // The expected outcome remains access denial, not a uniqueness error.
    const { error } = await client
      .from("foundation_samples")
      .insert(publicSample)
      .abortSignal(AbortSignal.timeout(5_000));
    expect(error?.code).toBe("42501");
  });

  it("denies update privileges", async () => {
    // A nonexistent id prevents changes even if a write grant accidentally opens.
    const { error } = await client
      .from("foundation_samples")
      .update({ label: "Synthetic forbidden update" })
      .eq("id", absentSampleId)
      .abortSignal(AbortSignal.timeout(5_000));
    expect(error?.code).toBe("42501");
  });

  it("denies delete privileges", async () => {
    const { error } = await client
      .from("foundation_samples")
      .delete()
      .eq("id", absentSampleId)
      .abortSignal(AbortSignal.timeout(5_000));
    expect(error?.code).toBe("42501");
  });
});
