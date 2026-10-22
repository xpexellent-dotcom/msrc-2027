import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffPage } from "@/features/staff-portal/staff-page";
import { readStaffPageState } from "@/features/staff-portal/page-state.server";
import { renderRegistrationEmailPreviews } from "@/features/staff-portal/email-previews.server";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/features/staff-portal/page-state.server", () => ({ readStaffPageState: vi.fn() }));
vi.mock("@/features/staff-portal/config.server", () => ({ getStaffConfig: () => ({ state: "closed" }) }));
vi.mock("@/features/staff-portal/handler.server", () => ({ staffPasswordChangeReady: vi.fn() }));

beforeEach(() => { vi.mocked(readStaffPageState).mockResolvedValue({ profile: null, testMode: true }); });
describe("server-rendered email preview gate", () => {
  it.each(["en", "ar"])("serializes fixed previews only after authenticated Super Admin observation in %s", async (locale) => {
    vi.mocked(readStaffPageState).mockResolvedValue({ profile: { actorId: "synthetic", name: "Synthetic Owner", roles: ["superAdmin"] }, testMode: true });
    const page = await StaffPage({ params: Promise.resolve({ locale }), screen: "email-previews" });
    expect(page.props.initialEmailPreviews).toEqual(renderRegistrationEmailPreviews());
  });
  it("does not serialize previews for anonymous sessions", async () => {
    const page = await StaffPage({ params: Promise.resolve({ locale: "en" }), screen: "email-previews" });
    expect(page.props.initialEmailPreviews).toBeUndefined();
  });
  it("denies the direct route to other authenticated staff", async () => {
    vi.mocked(readStaffPageState).mockResolvedValue({ profile: { actorId: "synthetic", name: "Synthetic Staff", roles: ["registrationWorkshopAdministrator"] }, testMode: true });
    await expect(StaffPage({ params: Promise.resolve({ locale: "en" }), screen: "email-previews" })).rejects.toThrow("NOT_FOUND");
  });
});
