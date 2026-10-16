import { afterEach, describe, expect, it, vi } from "vitest";
import { timingSafeEqual } from "node:crypto";
import { createResendOutboxSender, createTestOutboxSender, OutboxSendError, renderOutboxMessage } from "@/lib/email/outbox.server";
import { drainOutbox } from "@/lib/jobs/outbox.server";
import { createOutboxDrainHandler, resolveOutboxRunConfig, validOutboxSecret } from "@/lib/jobs/outbox-route.server";
import { createRpcOutboxStore, enqueueOutbox } from "@/lib/jobs/outbox-store.server";
import { GET, POST } from "@/app/api/jobs/outbox/drain/route";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, timingSafeEqual: vi.fn(actual.timingSafeEqual) };
});

type Options = Parameters<typeof drainOutbox>[0];
type Store = Options["store"];
type Message = Awaited<ReturnType<Store["claim"]>>[number];
type Envelope = Parameters<Store["prepare"]>[2];
type Outcome = Parameters<Store["finish"]>[2];
const now = Date.UTC(2026, 9, 16, 12);
const secret = "synthetic-outbox-cron-" + "ab".repeat(24);

function message(index = 1, change: Partial<Message> = {}): Message {
  return {
    id: `c3000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    template_key: "synthetic_notice", template_version: 1, locale: "en",
    recipient_email: `synthetic-${index}@example.invalid`, payload: { reference: `TEST-${index}` },
    attempt_count: 1, lease_token: `c4000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    lease_expires_at: new Date(now + 60_000).toISOString(),
    provider_idempotency_key: `outbox-test-${index}`, provider_request: null,
    first_attempt_at: new Date(now).toISOString(), ...change,
  };
}

/** Models atomic claim/lease checks, not the Postgres implementation (tested separately in SQL). */
function fixture(messages = [message()]) {
  const cells = messages.map((value) => ({ value, status: "queued", worker: "", prepared: null as Envelope | null }));
  const finishes: Outcome[] = [];
  let blockFinish = false;
  let reservations = 0;
  const store: Store = {
    claim: vi.fn(async (worker, size, cap) => {
      const available = cap > 0 ? Math.max(0, cap - reservations) : 0;
      const selected = cells.filter((cell) => cell.status === "queued").slice(0, Math.min(size, available));
      for (const cell of selected) { cell.status = "sending"; cell.worker = worker; }
      reservations += selected.length;
      return selected.map((cell) => ({ ...cell.value, provider_request: cell.prepared }));
    }),
    prepare: vi.fn(async (value, worker, envelope) => {
      const cell = cells.find((candidate) => candidate.value.id === value.id);
      if (!cell || cell.status !== "sending" || cell.worker !== worker) throw new Error("stale lease");
      const prepared = cell.prepared ?? structuredClone(envelope);
      cell.prepared = prepared;
      return structuredClone(prepared);
    }),
    finish: vi.fn(async (value, worker, outcome) => {
      if (blockFinish) throw new Error("synthetic crash after provider accepted");
      const cell = cells.find((candidate) => candidate.value.id === value.id);
      if (!cell || cell.status !== "sending" || cell.worker !== worker) return false;
      finishes.push(outcome);
      cell.status = outcome.state;
      return outcome.state === "sent" ? "sent" as const
        : outcome.state === "retryable" ? "failed_retryable" as const : "failed_permanent" as const;
    }),
  };
  return { store, cells, finishes,
    blockFinish(value: boolean) { blockFinish = value; },
    expireLeases() {
      for (const cell of cells) {
        if (cell.status === "sending") {
          cell.status = "queued"; cell.worker = "";
          cell.value = { ...cell.value, attempt_count: cell.value.attempt_count + 1 };
        }
      }
    },
  };
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("closed outbox templates and sender boundaries", () => {
  it.each(["en", "ar"] as const)("renders the reserved %s locale as an English transactional email", (locale) => {
    const envelope = renderOutboxMessage(message(1, { locale }));
    expect(envelope.to).toEqual(["synthetic-1@example.invalid"]);
    expect(envelope.text).toContain("TEST-1");
    expect(envelope.subject).toMatch(/MSRC/);
    expect(envelope.html).toContain("TEST-1");
    expect(envelope).not.toHaveProperty("attachments");
    expect(envelope).not.toHaveProperty("bcc");
    expect(envelope).toEqual(renderOutboxMessage(message(1, { locale: "en" })));
  });

  it.each([
    { template_key: "registration_confirmation" }, { template_version: 2 },
    { payload: { reference: "<script>alert(1)</script>" } },
    { payload: { reference: "x".repeat(81) } },
    { payload: { reference: "TEST-1", secret: "must-never-render" } },
  ] satisfies Partial<Message>[])("rejects an unsupported template or unapproved variables %j", (change) => {
    expect(() => renderOutboxMessage(message(1, change))).toThrow();
  });

  it("captures one delivery per provider idempotency key", async () => {
    const sender = createTestOutboxSender();
    const envelope = renderOutboxMessage(message());
    const first = await sender.send(envelope, "stable-provider-key");
    expect(await sender.send(envelope, "stable-provider-key")).toEqual(first);
    expect(sender.captured.size).toBe(1);
    expect(sender.captured.get("stable-provider-key")).toEqual(envelope);
  });

  it("rejects a different envelope under an existing provider idempotency key", async () => {
    const sender = createTestOutboxSender();
    const envelope = renderOutboxMessage(message());
    await sender.send(envelope, "stable-provider-key");
    await expect(sender.send({ ...envelope, subject: "Changed envelope" }, "stable-provider-key"))
      .rejects.toMatchObject({ retryable: false, errorClass: "idempotency_conflict" });
    expect(sender.captured.size).toBe(1);
  });

  it("uses a fixed Resend endpoint, bounded timeout and the persisted provider idempotency key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: "synthetic-provider-id" }));
    const sender = createResendOutboxSender("re_synthetic_dummy", fetcher);
    const envelope = renderOutboxMessage(message());
    await expect(sender.send(envelope, "stable-provider-key")).resolves.toEqual({ providerMessageId: "synthetic-provider-id" });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(init?.headers);
    expect(headers.get("Idempotency-Key")).toBe("stable-provider-key");
    expect(headers.get("Authorization")).toBe("Bearer re_synthetic_dummy");
    expect(JSON.parse(String(init?.body))).toEqual(envelope);
  });

  it.each([400, 401, 403, 404, 422])("classifies provider HTTP %s as permanent without retaining its response body", async (status) => {
    const sender = createResendOutboxSender("re_synthetic_dummy", vi.fn<typeof fetch>()
      .mockResolvedValue(new Response("private provider response body", { status })));
    const error = await sender.send(renderOutboxMessage(message()), "stable-provider-key").catch((value: unknown) => value);
    expect(error).toBeInstanceOf(OutboxSendError);
    expect(error).toMatchObject({ retryable: false });
    expect(String(error)).not.toContain("private provider response body");
  });

  it.each([429, 500, 502, 503])("classifies provider HTTP %s as retryable", async (status) => {
    const sender = createResendOutboxSender("re_synthetic_dummy", vi.fn<typeof fetch>()
      .mockResolvedValue(new Response("private provider response body", { status })));
    await expect(sender.send(renderOutboxMessage(message()), "stable-provider-key")).rejects.toMatchObject({ retryable: true });
  });

  it.each([new DOMException("private timeout detail", "TimeoutError"), new TypeError("private network detail")])(
    "classifies transport failure as retryable without retaining diagnostics", async (failure) => {
      const sender = createResendOutboxSender("re_synthetic_dummy", vi.fn<typeof fetch>().mockRejectedValue(failure));
      const error = await sender.send(renderOutboxMessage(message()), "stable-provider-key").catch((value: unknown) => value);
      expect(error).toBeInstanceOf(OutboxSendError);
      expect(error).toMatchObject({ retryable: true });
      expect(String(error)).not.toContain("private");
    });

  it.each([
    ["concurrent_idempotent_requests", true], ["invalid_idempotent_request", false],
  ] as const)("classifies the documented Resend conflict %s", async (name, retryable) => {
    const sender = createResendOutboxSender("re_synthetic_dummy", vi.fn<typeof fetch>()
      .mockResolvedValue(Response.json({ name, message: "private diagnostic" }, { status: 409 })));
    await expect(sender.send(renderOutboxMessage(message()), "stable-provider-key")).rejects.toMatchObject({ retryable });
  });
});

describe("durable outbox drain orchestration", () => {
  it("sends each queued message once across repeated invocations", async () => {
    const value = fixture([message(1), message(2)]);
    const sender = createTestOutboxSender();
    const first = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    const second = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    expect(first).toMatchObject({ claimed: 2, sent: 2, retryable: 0, permanent: 0, stale: 0 });
    expect(second).toMatchObject({ claimed: 0, sent: 0 });
    expect(sender.captured.size).toBe(2);
    expect(value.finishes).toEqual([{ state: "sent", providerMessageId: expect.any(String) },
      { state: "sent", providerMessageId: expect.any(String) }]);
  });

  it("lets overlapping workers process disjoint atomic claims", async () => {
    const value = fixture(Array.from({ length: 5 }, (_, index) => message(index + 1)));
    const sender = createTestOutboxSender();
    const outcomes = await Promise.all([
      drainOutbox({ store: value.store, sender, batchSize: 3, dailyCap: 10, workerId: "worker-a", now: () => now }),
      drainOutbox({ store: value.store, sender, batchSize: 3, dailyCap: 10, workerId: "worker-b", now: () => now }),
    ]);
    expect(outcomes.reduce((total, outcome) => total + outcome.sent, 0)).toBe(5);
    expect(sender.captured.size).toBe(5);
    const completed = vi.mocked(value.store.finish).mock.calls.map(([row]) => row.id);
    expect(new Set(completed).size).toBe(completed.length);
  });

  it.each([[true, "retryable"], [false, "permanent"]] as const)("records sanitized %s provider errors as %s", async (retryable, state) => {
    const value = fixture();
    const sender = { send: vi.fn().mockRejectedValue(new OutboxSendError("provider_validation", retryable)) };
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    expect(summary[state]).toBe(1);
    expect(value.finishes).toEqual([{ state, errorClass: "provider_validation" }]);
  });

  it("reports a retryable provider error as permanent when the database exhausts its retry policy", async () => {
    const value = fixture();
    vi.mocked(value.store.finish).mockResolvedValue("failed_permanent");
    const sender = { send: vi.fn().mockRejectedValue(new OutboxSendError("timeout", true)) };
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    expect(value.store.finish).toHaveBeenCalledWith(expect.any(Object), expect.any(String), { state: "retryable", errorClass: "timeout" });
    expect(summary).toMatchObject({ claimed: 1, sent: 0, retryable: 0, permanent: 1, stale: 0 });
  });

  it("keeps a provider-accepted message idempotent after a crash before its database acknowledgement", async () => {
    const value = fixture();
    const sender = createTestOutboxSender();
    const send = vi.spyOn(sender, "send");
    value.blockFinish(true);
    await drainOutbox({ store: value.store, sender, dailyCap: 10, workerId: "worker-before-crash", now: () => now }).catch(() => undefined);
    expect(sender.captured.size).toBe(1);
    value.blockFinish(false);
    value.expireLeases();
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, workerId: "worker-after-crash", now: () => now });
    expect(summary.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
    expect(sender.captured.size).toBe(1);
  });

  it("never counts an acknowledgement rejected for a stale lease as sent", async () => {
    const value = fixture();
    vi.mocked(value.store.finish).mockResolvedValue(false);
    const summary = await drainOutbox({ store: value.store, sender: createTestOutboxSender(), dailyCap: 10, now: () => now });
    expect(summary).toMatchObject({ claimed: 1, sent: 0, stale: 1 });
  });

  it("ships with a zero daily cap and never sends when no reservation is available", async () => {
    const value = fixture();
    const sender = { send: vi.fn() };
    const summary = await drainOutbox({ store: value.store, sender, now: () => now });
    expect(summary).toMatchObject({ sent: 0, claimed: 0 });
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("leaves unclaimed messages available when the remaining run budget cannot cover another bounded attempt", async () => {
    const value = fixture([message(1), message(2), message(3)]);
    const captured = createTestOutboxSender();
    let current = now;
    const sender = { async send(envelope: Envelope, key: string) {
      current += 6_001;
      return captured.send(envelope, key);
    } };
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => current });
    expect(summary).toMatchObject({ claimed: 1, sent: 1 });
    expect(value.cells.filter((cell) => cell.status === "queued")).toHaveLength(2);
    expect(vi.mocked(value.store.claim).mock.calls.every(([, size]) => size === 1)).toBe(true);
  });

  it("stops provider retries before Resend's 24-hour idempotency cache can expire", async () => {
    const value = fixture([message(1, { first_attempt_at: new Date(now - 23 * 60 * 60_000).toISOString() })]);
    const sender = { send: vi.fn() };
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    expect(summary).toMatchObject({ claimed: 1, sent: 0, permanent: 1 });
    expect(value.finishes).toEqual([{ state: "permanent", errorClass: "idempotency_window_expired" }]);
    expect(sender.send).not.toHaveBeenCalled();
  });

  it("does not send or alter a leased row after request snapshot persistence fails", async () => {
    const value = fixture();
    vi.mocked(value.store.prepare).mockRejectedValue(new Error("synthetic storage unavailable"));
    const sender = { send: vi.fn() };
    await expect(drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now })).rejects.toThrow();
    expect(sender.send).not.toHaveBeenCalled();
    expect(value.store.finish).not.toHaveBeenCalled();
    expect(value.cells[0].status).toBe("sending");
  });

  it("permanently rejects an unsupported template without calling its sender", async () => {
    const value = fixture([message(1, { template_key: "unapproved_template" })]);
    const sender = { send: vi.fn() };
    const summary = await drainOutbox({ store: value.store, sender, dailyCap: 10, now: () => now });
    expect(summary.permanent).toBe(1);
    expect(value.finishes).toEqual([{ state: "permanent", errorClass: "template_invalid" }]);
    expect(value.store.prepare).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });
});

describe("protected outbox drain route", () => {
  const enabledEnvironment = {
    OUTBOX_ENABLED: "true", CRON_SECRET: secret, OUTBOX_SUPABASE_URL: "http://127.0.0.1:54321",
    OUTBOX_SUPABASE_SECRET_KEY: "sb_secret_synthetic_test", OUTBOX_DAILY_CAP: "10",
  };
  const request = (authorization?: string) => new Request("https://msrc2027.com/api/jobs/outbox/drain", {
    method: "POST", headers: authorization ? { Authorization: authorization } : {},
  });

  it.each([undefined, "false", "TRUE", "1"])("returns 404 with no work while OUTBOX_ENABLED is %s", async (enabled) => {
    const run = vi.fn();
    const handler = createOutboxDrainHandler({ env: { OUTBOX_ENABLED: enabled, CRON_SECRET: secret }, run });
    const response = await handler(request("Bearer " + secret));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(run).not.toHaveBeenCalled();
  });

  it.each([undefined, "Basic " + secret, "Bearer wrong", "Bearer " + secret + "longer", "Bearer " + secret.slice(1)])(
    "rejects an absent or incorrect credential with an empty 401", async (authorization) => {
      const run = vi.fn();
      const handler = createOutboxDrainHandler({ env: { OUTBOX_ENABLED: "true", CRON_SECRET: secret }, run });
      const response = await handler(request(authorization));
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("");
      expect(run).not.toHaveBeenCalled();
    });

  it("validates short, long, absent and malformed credentials through the same fixed-length digest comparison", () => {
    const compare = vi.mocked(timingSafeEqual);
    compare.mockClear();
    expect(validOutboxSecret("Bearer " + secret, secret)).toBe(true);
    for (const authorization of [null, "", "Bearer x", "Bearer " + "x".repeat(500), "Basic " + secret]) {
      expect(validOutboxSecret(authorization, secret)).toBe(false);
    }
    for (const invalidSecret of [undefined, "short", "x".repeat(257), " ".repeat(64)]) {
      expect(validOutboxSecret("Bearer " + invalidSecret, invalidSecret)).toBe(false);
    }
    expect(compare).toHaveBeenCalledTimes(10);
    expect(compare.mock.calls.every(([expected, supplied]) => expected.byteLength === 32 && supplied.byteLength === 32)).toBe(true);
  });

  it("returns only aggregate counts and a noncacheable response after authorized work", async () => {
    const run = vi.fn().mockResolvedValue({ claimed: 2, sent: 1, retryable: 1, permanent: 0, stale: 0,
      privateProviderDiagnostic: "must-never-appear" });
    const handler = createOutboxDrainHandler({ env: enabledEnvironment, run });
    const response = await handler(request("Bearer " + secret));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ claimed: 2, sent: 1, retryable: 1, permanent: 0, stale: 0 });
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toMatchObject({ dailyCap: 10, batchSize: 10, timeBudgetMs: 20_000, sender: "console" });
  });

  it("keeps concurrent authorized calls safe through the atomic store claim boundary", async () => {
    const value = fixture([message(1), message(2), message(3), message(4)]);
    const sender = createTestOutboxSender();
    const handler = createOutboxDrainHandler({ env: { ...enabledEnvironment, OUTBOX_BATCH_SIZE: "2" },
      run: (config) => drainOutbox({ store: value.store, sender, batchSize: config.batchSize,
        dailyCap: config.dailyCap, timeBudgetMs: config.timeBudgetMs, now: () => now }),
    });
    const responses = await Promise.all([handler(request("Bearer " + secret)), handler(request("Bearer " + secret))]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const summaries = await Promise.all(responses.map((response) => response.json()));
    expect(summaries.reduce((total, summary) => total + summary.sent, 0)).toBe(4);
    expect(sender.captured.size).toBe(4);
  });

  it("hides storage failures behind an empty 503", async () => {
    const handler = createOutboxDrainHandler({ env: enabledEnvironment,
      run: vi.fn().mockRejectedValue(new Error("private storage diagnostic")),
    });
    const response = await handler(request("Bearer " + secret));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
  });

  it.each([
    { OUTBOX_DAILY_CAP: "-1" }, { OUTBOX_DAILY_CAP: "100001" }, { OUTBOX_DAILY_CAP: "1.5" },
    { OUTBOX_BATCH_SIZE: "0" }, { OUTBOX_BATCH_SIZE: "11" },
    { OUTBOX_TIME_BUDGET_MS: "14999" }, { OUTBOX_TIME_BUDGET_MS: "20001" },
    { OUTBOX_SUPABASE_URL: "https://unapproved.example.invalid" }, { OUTBOX_SUPABASE_SECRET_KEY: "public-key" },
    { OUTBOX_SENDER: "test" }, { OUTBOX_SENDER: "resend" }, { VERCEL_ENV: "preview" }, { VERCEL: "1" },
  ])("fails closed for unsupported execution configuration %j", async (change) => {
    const run = vi.fn();
    const handler = createOutboxDrainHandler({ env: { ...enabledEnvironment, ...change }, run });
    const response = await handler(request("Bearer " + secret));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expect(run).not.toHaveBeenCalled();
  });

  it("requires the explicit production Resend gate without sending mail", () => {
    const production = { ...enabledEnvironment, OUTBOX_SUPABASE_URL: "https://ecemjggwlzqpjcwmchrl.supabase.co",
      VERCEL: "1", VERCEL_ENV: "production", OUTBOX_SENDER: "resend", RESEND_API_KEY: "re_synthetic_dummy" };
    expect(resolveOutboxRunConfig(production)).toBeNull();
    expect(resolveOutboxRunConfig({ ...production, OUTBOX_RESEND_ENABLED: "true" })).toMatchObject({ sender: "resend", dailyCap: 10 });
    expect(resolveOutboxRunConfig({ ...production, OUTBOX_RESEND_ENABLED: "true", VERCEL_ENV: "preview" })).toBeNull();
  });

  it("ships the actual route closed and its GET trigger unavailable", async () => {
    vi.stubEnv("OUTBOX_ENABLED", undefined);
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await POST(request())).status).toBe(404);
    expect(GET().status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("service-only outbox RPC transport", () => {
  const config = { databaseUrl: "http://127.0.0.1:54321", databaseKey: "sb_secret_synthetic_test" };
  const input = { idempotencyKey: "synthetic/test-1", templateKey: "synthetic_notice" as const, templateVersion: 1 as const,
    locale: "en" as const, recipientEmail: "synthetic-1@example.invalid", payload: { reference: "TEST-1" } };

  it("enqueues the same event key and preserves an existing-row response", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id: message().id, status: "queued", created: true }))
      .mockResolvedValueOnce(Response.json({ id: message().id, status: "queued", created: false }));
    vi.stubGlobal("fetch", fetcher);
    expect(await enqueueOutbox(config, input)).toEqual({ id: message().id, status: "queued", created: true });
    expect(await enqueueOutbox(config, input)).toEqual({ id: message().id, status: "queued", created: false });
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetcher.mock.calls) {
      expect(url).toBe(config.databaseUrl + "/rest/v1/rpc/msrc_outbox_enqueue");
      expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const headers = new Headers(init?.headers);
      expect(headers.get("apikey")).toBe(config.databaseKey);
      expect(headers.has("authorization")).toBe(false);
      expect(JSON.parse(String(init?.body))).toEqual({ p_idempotency_key: input.idempotencyKey,
        p_template_key: input.templateKey, p_template_version: 1, p_locale: "en",
        p_recipient_email: input.recipientEmail, p_payload: input.payload });
    }
  });

  it.each([
    { recipientEmail: "participant@example.org" }, { idempotencyKey: "invalid key" },
    { payload: { reference: "<unsafe>" } },
  ])("rejects unsupported or nonsynthetic events before network access %j", async (change) => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(enqueueOutbox(config, { ...input, ...change })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { value: null }, { value: {} }, { value: [message(), message()] }, { value: [{ ...message(), attempt_count: "1" }] },
  ])("rejects malformed or overlarge claim output %j", async ({ value }) => {
      vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)));
      await expect(createRpcOutboxStore(config).claim("worker-a", 1, 10)).rejects.toThrow();
    });

  it("accepts an empty queue without fabricating work", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json([])));
    await expect(createRpcOutboxStore(config).claim("worker-a", 1, 10)).resolves.toEqual([]);
  });

  it("fences prepare and finish with the claimed worker and unpredictable lease token", async () => {
    const row = message();
    const envelope = renderOutboxMessage(row);
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([row])).mockResolvedValueOnce(Response.json(envelope))
      .mockResolvedValueOnce(Response.json({ acknowledged: true, status: "sent" }));
    vi.stubGlobal("fetch", fetcher);
    const store = createRpcOutboxStore(config);
    expect(await store.claim("worker-a", 1, 10)).toEqual([row]);
    expect(await store.prepare(row, "worker-a", envelope)).toEqual(envelope);
    expect(await store.finish(row, "worker-a", { state: "sent", providerMessageId: "synthetic-provider-id" })).toBe("sent");
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ p_id: row.id, p_worker_id: "worker-a",
      p_lease_token: row.lease_token, p_provider_request: envelope });
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({ p_id: row.id, p_worker_id: "worker-a",
      p_lease_token: row.lease_token, p_outcome: "sent", p_provider_message_id: "synthetic-provider-id", p_error_class: null });
  });

  it.each([
    { value: true }, { value: false }, { value: null }, { value: [] }, { value: {} },
    { value: { acknowledged: "true", status: "sent" } }, { value: { acknowledged: true, status: null } },
    { value: { acknowledged: false, status: "sent" } }, { value: { acknowledged: true, status: "queued" } },
  ])("rejects malformed or inconsistent finish acknowledgements %j", async ({ value }) => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)));
    await expect(createRpcOutboxStore(config).finish(message(), "worker-a", { state: "retryable", errorClass: "timeout" })).rejects.toThrow();
  });

  it("preserves a rejected lease acknowledgement as a harmless stale result", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json({ acknowledged: false, status: null })));
    await expect(createRpcOutboxStore(config).finish(message(), "worker-a", { state: "retryable", errorClass: "timeout" })).resolves.toBe(false);
  });

  it.each([
    { change: null }, { change: [] }, { change: { extra: "unapproved" } },
    { change: { to: ["other@example.invalid"] } }, { change: { subject: "mutated" } },
  ])("rejects a missing or mutated persisted provider snapshot %j", async ({ change }) => {
    const envelope = renderOutboxMessage(message());
    const value = change === null || Array.isArray(change) ? change : { ...envelope, ...change };
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)));
    await expect(createRpcOutboxStore(config).prepare(message(), "worker-a", envelope)).rejects.toThrow();
  });

  it("sanitizes transport failures and provider diagnostics without exposing private response bodies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("private storage detail", { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(createRpcOutboxStore(config).claim("worker-a", 1, 10)).rejects.toThrow("Outbox storage unavailable.");
    fetcher.mockRejectedValueOnce(new Error("private transport detail"));
    await expect(enqueueOutbox(config, input)).rejects.toThrow("Outbox storage unavailable.");
  });
});
