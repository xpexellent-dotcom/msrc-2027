import { expect, test } from "@playwright/test";
import { WORKFLOWS } from "../../src/config/workflows";

// SEC-01, API-02, REL-06: denial happens at the server boundary even when
// requests bypass the public UI. No operational mutation is implemented.
test("health reports only the static foundation, without secrets", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    status: "ok",
    scope: "static-foundation",
    workflows: "closed",
  });
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("all operational gates reject direct requests with a stable code", async ({ request }) => {
  for (const workflow of WORKFLOWS) {
    const response = await request.post(`/api/workflows/${workflow}`, {
      // Untrusted client claims must not open anything.
      data: { enabled: true, role: "super_admin", approved: true },
      headers: { "x-workflow-enabled": "true" },
    });
    expect(response.status(), workflow).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "WORKFLOW_CLOSED", workflow } });
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("malformed bodies and concurrent retries cannot bypass the closed gate", async ({ request }) => {
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => request.post("/api/workflows/registration", {
      data: "{invalid-json",
      headers: { "content-type": "application/json", "idempotency-key": "synthetic-repeated-request" },
    })),
  );
  for (const response of responses) {
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ error: { code: "WORKFLOW_CLOSED", workflow: "registration" } });
  }
});

test("alternate HTTP methods cannot open the closed endpoint", async ({ request }) => {
  for (const method of ["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
    const response = await request.fetch("/api/workflows/cmsEditing", { method });
    expect(response.status(), method).toBe(503);
  }
});

test("unknown and prototype workflow names fail closed", async ({ request }) => {
  for (const workflow of ["unknown", "constructor", "__proto__"]) {
    const response = await request.post(`/api/workflows/${workflow}`);
    expect(response.status()).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "NOT_FOUND" } });
  }
});
