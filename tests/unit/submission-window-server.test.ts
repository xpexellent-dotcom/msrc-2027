import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbstractRpcMissingError } from "@/features/submissions/backend.server";
import { readPublicSubmissionWindow } from "@/features/submissions/window.server";
import { PUBLISHED_WINDOW } from "@/features/submissions/submission-window";
import { resolveWindowReader } from "@/features/submissions/window-config.server";
const mocks = vi.hoisted(() => ({ config: vi.fn(), rpc: vi.fn(), participant: vi.fn() }));
vi.mock("@/features/participant-accounts/config.server", () => ({ getParticipantConfig: mocks.config }));
vi.mock("@/features/registration/handler.server", () => ({ participantReady: mocks.participant }));
vi.mock("@/features/submissions/window-config.server", async importOriginal => ({ ...await importOriginal<typeof import("@/features/submissions/window-config.server")>(), getWindowReader: () => ({ editionKey: "synthetic-window" }) }));
vi.mock("@/features/submissions/backend.server", async importOriginal => ({ ...await importOriginal<typeof import("@/features/submissions/backend.server")>(), readAbstractStatus: mocks.rpc, createAbstractBackend: () => ({ rpc: mocks.rpc }) }));
const window = { version: 1, ...PUBLISHED_WINDOW, enabled: true, observedAt: "2026-12-01T00:00:00.000Z", evidenceReady: true, similarityReady: true, participantEnabled: true, privacyReady: true, emailReady: true, retentionReady: true };
beforeEach(() => { vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "true"); mocks.config.mockReturnValue({ state: "ready", config: { editionKey: "synthetic-window" } }); mocks.participant.mockResolvedValue(true); mocks.rpc.mockResolvedValue({ enabled: true, documentVersion: 2, window }); });
describe("ENG-092 public window projection", () => {
  it("exposes only saved instants and effective state", async () => {
    mocks.rpc.mockResolvedValue({ documentVersion: 2, secret: "canary", window: { ...window, private: "canary" } });
    expect(await readPublicSubmissionWindow()).toEqual({ state: "open", ...PUBLISHED_WINDOW });
  });
  it("keeps effective entry closed when release flags are off", async () => { vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "false"); expect((await readPublicSubmissionWindow()).state).toBe("closed"); });
  it("can show a saved future date while release flags remain off", async () => { vi.stubEnv("ABSTRACT_SUBMISSIONS_ENABLED", "false"); mocks.rpc.mockResolvedValue({ documentVersion: 2, window: { ...window, observedAt: "2026-11-01T00:00:00.000Z" } }); expect((await readPublicSubmissionWindow()).state).toBe("opening"); });
  it("keeps participant-account and email policy mismatches closed", async () => { mocks.participant.mockResolvedValue(false); expect((await readPublicSubmissionWindow()).state).toBe("closed"); });
  it("uses saved opening rather than a default date", async () => { mocks.rpc.mockResolvedValue({ documentVersion: 2, window: { ...window, opensAt: "2026-12-10T00:00:00.000Z" } }); expect(await readPublicSubmissionWindow()).toEqual({ state: "opening", opensAt: "2026-12-10T00:00:00.000Z", closesAt: window.closesAt }); });
  it("handles missing capability without widening access", async () => { mocks.rpc.mockRejectedValue(new AbstractRpcMissingError()); expect((await readPublicSubmissionWindow()).state).toBe("area-not-ready"); });
  it("treats an old status RPC without the window contract as area-not-ready", async () => { mocks.rpc.mockResolvedValue({ documentVersion: 2, enabled: true }); expect((await readPublicSubmissionWindow()).state).toBe("area-not-ready"); });
  it("accepts only the bounded loopback reader in local test mode, independently of activation flags", () => {
    const env = { PARTICIPANT_ACCOUNTS_TEST_MODE: "true", PARTICIPANT_SUPABASE_URL: "http://127.0.0.1:3218", PARTICIPANT_SUPABASE_SECRET_KEY: "sb_secret_participant_mock_only", PARTICIPANT_EDITION_KEY: "synthetic-participants-2027" };
    expect(resolveWindowReader(env)?.editionKey).toBe(env.PARTICIPANT_EDITION_KEY); expect(resolveWindowReader({ ...env, VERCEL_ENV: "preview" })).toBeNull(); expect(resolveWindowReader({ ...env, PARTICIPANT_SUPABASE_URL: "https://example.invalid" })).toBeNull(); expect(resolveWindowReader({})).toBeNull();
  });
});
