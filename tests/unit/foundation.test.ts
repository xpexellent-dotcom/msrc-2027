import { describe, expect, it, vi } from "vitest";
import { conferenceConfig } from "@/config/conference";
import { WORKFLOWS } from "@/config/workflows";
import {
  assertWorkflowOpen,
  isWorkflow,
  WorkflowClosedError,
  workflowFlags,
} from "@/lib/workflows.server";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";

describe("unapproved business configuration (CFG-01/02/10)", () => {
  it("keeps dates, prices, capacities, and deployment regions unset", () => {
    expect(conferenceConfig).toMatchObject({
      dates: null,
      venue: null,
      registrationPrice: null,
      conferenceCapacity: null,
      workshopCapacity: null,
      production: { vercelRegion: null, supabaseRegion: null },
    });
  });
});

describe("server-side operational closure (SEC-01, API-02)", () => {
  it.each(WORKFLOWS)("denies %s before any future operation can run", (workflow) => {
    const operation = vi.fn();
    expect(workflowFlags[workflow]).toBe(false);
    expect(() => {
      assertWorkflowOpen(workflow);
      operation();
    }).toThrow(WorkflowClosedError);
    expect(operation).not.toHaveBeenCalled();
  });

  it("does not trust an environment flag to open a gate", () => {
    vi.stubEnv("NEXT_PUBLIC_REGISTRATION_ENABLED", "true");
    vi.stubEnv("REGISTRATION_ENABLED", "true");
    expect(() => assertWorkflowOpen("registration")).toThrow(WorkflowClosedError);
    expect(Object.isFrozen(workflowFlags)).toBe(true);
  });

  it.each(["__proto__", "constructor", "prototype", "REGISTRATION", "unknown", ""])(
    "treats %j as an unknown workflow",
    (value) => expect(isWorkflow(value)).toBe(false),
  );

  it("returns a stable, user-safe closed error", () => {
    try {
      assertWorkflowOpen("payments");
    } catch (error) {
      expect(error).toBeInstanceOf(WorkflowClosedError);
      expect(error).toMatchObject({ code: "WORKFLOW_CLOSED", status: 503, workflow: "payments" });
      return;
    }
    expect.fail("The payment gate must always reject in M1.");
  });
});

describe("optional local data configuration (SEC-02/06, INF-04)", () => {
  const key = "sb_publishable_synthetic_test_key";

  it("allows the public shell to start without data configuration", () => {
    expect(resolveLocalSupabaseConfig({})).toBeNull();
    expect(resolveLocalSupabaseConfig({ url: "", publishableKey: "" })).toBeNull();
  });

  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"])(
    "accepts a local-only origin %s",
    (url) => expect(resolveLocalSupabaseConfig({ url, publishableKey: key })).toEqual({ url, publishableKey: key }),
  );

  it.each([
    { url: "http://127.0.0.1:54321" },
    { publishableKey: key },
  ])("rejects a partially configured client", (values) => {
    expect(() => resolveLocalSupabaseConfig(values)).toThrow();
  });

  it.each([
    "https://example.supabase.co",
    "http://127.0.0.1.example.com:54321",
    "https://localhost:54321",
    "http://user:password@localhost:54321",
    "http://localhost:54321/rest/v1",
    "http://localhost:54321?token=test",
    "http://localhost:54321#test",
  ])("rejects remote or decorated origins: %s", (url) => {
    expect(() => resolveLocalSupabaseConfig({ url, publishableKey: key })).toThrow();
  });

  it.each(["sb_secret_synthetic", "eyJhbGciOiJIUzI1NiJ9.synthetic.signature", "service_role", "not-a-key"])(
    "rejects a secret, legacy, or malformed client key",
    (publishableKey) => {
      expect(() => resolveLocalSupabaseConfig({ url: "http://localhost:54321", publishableKey })).toThrow();
    },
  );
});
