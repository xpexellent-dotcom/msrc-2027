import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createSupabaseTotpContract, managedStaffMfa, MANAGED_STAFF_MFA_READY } from "@/features/auth/mfa-provider.server";

const secret = "JBSWY3DPEHPK3PXP";
const uri = `otpauth://totp/MSRC:test?secret=${secret}&issuer=MSRC`;
function fixture() {
  const mfa = {
    enroll: vi.fn().mockResolvedValue({ error: null, data: { type: "totp", id: "synthetic-factor", totp: { secret, uri, qr_code: "<svg>untrusted</svg>" } } }),
    challenge: vi.fn().mockResolvedValue({ error: null, data: { id: "synthetic-challenge" } }),
    verify: vi.fn().mockResolvedValue({ error: null, data: { access_token: "private-token", refresh_token: "private-refresh" } }),
  };
  return { mfa, contract: createSupabaseTotpContract({ mfa } as unknown as SupabaseClient["auth"]) };
}

describe("closed managed Supabase Super Admin TOTP provider contract", () => {
  it("has no live release capability", async () => {
    expect(MANAGED_STAFF_MFA_READY).toBe(false);
    expect(await managedStaffMfa()).toEqual({ state: "unavailable", ready: false });
  });
  it("uses current authenticator enroll/challenge/verify signatures without returning SVG or tokens", async () => {
    const { mfa, contract } = fixture();
    const setup = await contract.enroll();
    expect(setup.state).toBe("ok");
    expect(setup.state === "ok" && setup.data.secret === secret && setup.data.uri === uri).toBe(true);
    expect(setup).not.toHaveProperty("data.qr_code");
    expect(mfa.enroll).toHaveBeenCalledExactlyOnceWith({ factorType: "totp", friendlyName: "MSRC Super Admin authenticator" });
    expect(await contract.challenge("synthetic-factor")).toEqual({ state: "ok", data: { challengeId: "synthetic-challenge" } });
    expect(mfa.challenge).toHaveBeenCalledExactlyOnceWith({ factorId: "synthetic-factor" });
    expect(await contract.verify("synthetic-factor", "synthetic-challenge", "123456")).toEqual({ state: "ok", data: { providerVerified: true } });
    expect(mfa.verify).toHaveBeenCalledExactlyOnceWith({ factorId: "synthetic-factor", challengeId: "synthetic-challenge", code: "123456" });
  });
  it("fails closed on rejected, malformed and throwing provider responses without logs", async () => {
    const { mfa, contract } = fixture();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mfa.enroll.mockRejectedValue(new Error("private-secret"));
    mfa.challenge.mockResolvedValue({ error: { message: "private" }, data: null });
    mfa.verify.mockResolvedValue({ error: { message: "private-code" }, data: null });
    expect(await contract.enroll()).toEqual({ state: "unavailable" });
    expect(await contract.challenge("synthetic-factor")).toEqual({ state: "unavailable" });
    expect(await contract.verify("synthetic-factor", "challenge", "123456")).toEqual({ state: "denied" });
    mfa.enroll.mockResolvedValue({ error: null, data: null });
    mfa.verify.mockResolvedValue({ error: null, data: {} });
    expect(await contract.enroll()).toEqual({ state: "unavailable" });
    expect(await contract.verify("synthetic-factor", "challenge", "123456")).toEqual({ state: "unavailable" });
    expect(error).not.toHaveBeenCalled();
  });
  it.each([
    { type: "phone", id: "factor", totp: { secret, uri } },
    { type: "totp", id: "", totp: { secret, uri } },
    { type: "totp", id: "factor", totp: { secret: "invalid!", uri } },
    { type: "totp", id: "factor", totp: { secret, uri: "https://untrusted.invalid" } },
  ])("rejects mismatched factor and malformed setup case %#", async (data) => {
    const { mfa, contract } = fixture();
    mfa.enroll.mockResolvedValue({ error: null, data });
    expect(await contract.enroll()).toEqual({ state: "unavailable" });
  });
  it("rejects malformed inputs before provider work and exposes no factor reset", async () => {
    const { mfa, contract } = fixture();
    expect(await contract.challenge("")).toEqual({ state: "denied" });
    expect(await contract.verify("factor", "challenge", "12345")).toEqual({ state: "denied" });
    expect(mfa.challenge).not.toHaveBeenCalled();
    expect(mfa.verify).not.toHaveBeenCalled();
    expect(Object.keys(contract)).toEqual(["enroll", "challenge", "verify"]);
  });
});
