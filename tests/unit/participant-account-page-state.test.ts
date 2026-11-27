import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { getParticipantConfig, type ParticipantConfig } from "@/features/participant-accounts/config.server";
import { observeParticipantPage } from "@/features/participant-accounts/handler.server";
import { readParticipantPageState } from "@/features/participant-accounts/page-state.server";
import { readParticipantFormToken, readParticipantLogoutToken } from "@/features/participant-accounts/security.server";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/features/participant-accounts/config.server", () => ({ getParticipantConfig: vi.fn() }));
vi.mock("@/features/participant-accounts/handler.server", () => ({ observeParticipantPage: vi.fn() }));

const origin = "http://127.0.0.1:3216";
const config: ParticipantConfig = {
  origins: [origin], securitySecret: "a".repeat(64), testMode: false,
  supabaseUrl: "https://participant-fixture.example.invalid",
  publishableKey: "sb_publishable_synthetic", secretKey: "sb_secret_synthetic",
  resendKey: "re_synthetic", resendUrl: "https://email-fixture.example.invalid",
  editionKey: "synthetic-participants-2027", emailDailyLimit: 40,
};
const profile = { accountState: "verified" as const, name: "Synthetic Participant" };

describe("server-rendered participant sign-out token", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 10, 27, 8));
    vi.mocked(headers).mockResolvedValue(new Headers({ Host: new URL(origin).host, Cookie: "synthetic-session" }));
    vi.mocked(getParticipantConfig).mockReturnValue({ state: "ready", config });
  });

  afterEach(() => vi.restoreAllMocks());

  it("issues a fresh signed token only on the opted-in authenticated page", async () => {
    vi.mocked(observeParticipantPage).mockResolvedValue({ enabled: true, profile });
    const prepared = await readParticipantPageState("en", { prepareLogout: true });
    const [request, configuration] = vi.mocked(observeParticipantPage).mock.calls[0];
    expect(configuration).toBe(config);
    expect(request.headers.get("cookie")).toBe("synthetic-session");
    expect(prepared).toMatchObject({ profile, sessionState: "authenticated", formToken: expect.any(String) });
    expect(readParticipantLogoutToken(config, prepared.formToken, origin)).not.toBeNull();
    expect(readParticipantFormToken(config, prepared.formToken, origin)).toBeNull();
    expect(await readParticipantPageState("en")).not.toHaveProperty("formToken");
  });

  it.each([true, false])("does not issue a token for a page without a verified profile (ready: %s)", async (enabled) => {
    vi.mocked(observeParticipantPage).mockResolvedValue({ enabled, profile: null });
    const state = await readParticipantPageState("ar", { prepareLogout: true });
    expect(state).toMatchObject({ enabled, profile: null, sessionState: "anonymous" });
    expect(state).not.toHaveProperty("formToken");
  });

  it("keeps the synthetic UI bypass independent of session observation and token issuance", async () => {
    vi.mocked(getParticipantConfig).mockReturnValue({ state: "ready", config: { ...config, testMode: true } });
    expect(await readParticipantPageState("en", { prepareLogout: true })).not.toHaveProperty("formToken");
    expect(observeParticipantPage).not.toHaveBeenCalled();
  });
});
