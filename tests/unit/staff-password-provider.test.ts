import { afterEach, describe, expect, it, vi } from "vitest";
import { createStaffBackend, type NativeStaffSession } from "@/features/staff-portal/backend.server";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";

const actorId = "30000000-0000-4000-8000-000000000001", operationId = "30000000-0000-4000-8000-000000000006";
const session: NativeStaffSession = { actorId, sessionId: "30000000-0000-4000-8000-000000000002", accessToken: "synthetic-session-jwt", refreshToken: "synthetic-refresh" };
const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_PASSWORD_CHANGE_ENABLED: "true",
  STAFF_AUTH_SECURITY_SECRET: "b".repeat(64), STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only",
  STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only", STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;

afterEach(() => vi.unstubAllGlobals());

describe("dedicated guarded password provider transport", () => {
  it("sends only the owner password and transient protected operation marker through native Admin", async () => {
    const fetcher = vi.fn(async () => Response.json({ id: actorId, app_metadata: { provider: "email", msrcStaffPasswordChange: operationId } }));
    vi.stubGlobal("fetch", fetcher);
    expect(await createStaffBackend(config).changeOwnPassword(session, operationId, "SyntheticNewPassword!")).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(config.supabaseUrl + "/auth/v1/admin/users/" + actorId);
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body as string)).toEqual({ password: "SyntheticNewPassword!", app_metadata: { msrcStaffPasswordChange: operationId } });
    expect(new Headers(options.headers).get("apikey")).toBe(config.secretKey);
    expect(new Headers(options.headers).has("authorization")).toBe(false);
    expect(options.redirect).toBe("error"); expect(options.cache).toBe("no-store");
  });
  it("does not treat another native actor response as a completed change", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ id: operationId })));
    expect(await createStaffBackend(config).changeOwnPassword(session, operationId, "SyntheticNewPassword!")).toBe(false);
  });
  it("rejects native provider errors without a fallback reset or retry", async () => {
    const fetcher = vi.fn(async () => Response.json({ error_code: "unexpected_failure", msg: "Synthetic denied" }, { status: 500 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await createStaffBackend(config).changeOwnPassword(session, operationId, "SyntheticNewPassword!")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
