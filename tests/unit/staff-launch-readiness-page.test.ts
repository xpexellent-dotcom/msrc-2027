import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/permissions/contract";
import { StaffPage } from "@/features/staff-portal/staff-page";
import { readStaffPageState } from "@/features/staff-portal/page-state.server";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/features/staff-portal/page-state.server", () => ({ readStaffPageState: vi.fn() }));
vi.mock("@/features/staff-portal/config.server", () => ({ getStaffConfig: () => ({ state: "closed" }) }));
vi.mock("@/features/staff-portal/handler.server", () => ({ staffPasswordChangeReady: vi.fn() }));
beforeEach(() => { vi.mocked(readStaffPageState).mockResolvedValue({ profile: null, testMode: true }); });
describe("launch readiness server route", () => {
  it.each(["en", "ar"])("allows a verified Super Admin shell in %s without serializing environment values", async (locale) => {
    vi.mocked(readStaffPageState).mockResolvedValue({ profile: { actorId: "synthetic", name: "Synthetic Owner", roles: ["superAdmin"] }, testMode: true });
    const page = await StaffPage({ params: Promise.resolve({ locale }), screen: "launch-readiness" });
    expect(page.props.screen).toBe("launch-readiness");
    expect(Object.keys(page.props).sort()).toEqual(["initialEmailPreviews", "initialPasswordChangeAvailable", "initialProfile", "landing", "locale", "screen", "testMode"]);
  });
  it.each(ROLES.filter((role) => role !== "superAdmin"))("denies the direct route for %s", async (role) => {
    vi.mocked(readStaffPageState).mockResolvedValue({ profile: { actorId: "synthetic", name: "Synthetic Staff", roles: [role] }, testMode: true });
    await expect(StaffPage({ params: Promise.resolve({ locale: "en" }), screen: "launch-readiness" })).rejects.toThrow("NOT_FOUND");
  });
  it("renders only the sign-in shell for an anonymous session", async () => {
    const page = await StaffPage({ params: Promise.resolve({ locale: "en" }), screen: "launch-readiness" });
    expect(page.props.initialProfile).toBeNull();
    expect(page.props.initialEmailPreviews).toBeUndefined();
  });
});
