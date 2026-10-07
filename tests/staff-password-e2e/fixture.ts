import type { Page } from "@playwright/test";
import type { Role } from "../../src/lib/permissions/contract";
import type { StaffPayload, StaffResponse, StaffState } from "../../src/features/staff-portal/ui-contract";

const actorId = "13000000-0000-4000-8000-000000000001";
const factorId = "13000000-0000-4000-8000-000000000002", challengeId = "13000000-0000-4000-8000-000000000003";

/** UI presentation only. Genuine managed Auth, freshness and session revocation are tested independently. */
export async function passwordFixture(page: Page, options: { roles?: Role[]; fresh?: boolean; failure?: "unavailable" | "denied" | "limited"; hold?: boolean; staleReads?: boolean; available?: boolean; readFailure?: boolean } = {}) {
  let state: StaffState = "authenticated", fresh = options.fresh ?? false, sequence = 0;
  const actions: StaffPayload[] = [], reads: string[] = [];
  let release = () => {};
  const roles = options.roles ?? ["superAdmin"];
  const profile = () => ({ actorId, name: "Synthetic Password Admin", roles });
  await page.route("**/api/staff-portal**", async (route) => {
    const request = route.request();
    let response: StaffResponse = { state, profile: state === "authenticated" ? profile() : null };
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as StaffPayload; actions.push(payload);
      if (payload.action === "signin") { state = "pending-totp"; fresh = false; }
      else if (payload.action === "verify-totp") { state = "authenticated"; fresh = true; }
      else if (payload.action === "logout") { state = "ready"; fresh = false; }
      if (payload.action === "password-change") {
        if (options.hold) await new Promise<void>((resolve) => { release = resolve; });
        const result = !roles.includes("superAdmin") || options.available === false ? "denied" : options.failure ?? (!fresh ? "reauthentication-required" : "password-changed");
        if (["password-changed", "reauthentication-required", "unavailable"].includes(result) && !options.staleReads) state = "ready";
        response = { state: result };
      } else response = { state: payload.action === "logout" ? "signed-out" : state, profile: state === "authenticated" ? profile() : null };
    } else { reads.push(new URL(request.url()).searchParams.get("area") ?? "status"); if (options.readFailure) response = { state: "unavailable", profile: null }; }
    if (state === "pending-totp") { response.factorId = factorId; response.challengeId = challengeId; }
    response.passwordChangeAvailable = options.available ?? true;
    response.formToken = `synthetic-password-form-${++sequence}`;
    await route.fulfill({ status: response.state === "unavailable" ? 503 : ["reauthentication-required", "denied"].includes(response.state) ? 403 : 200,
      contentType: "application/json", body: JSON.stringify(response) });
  });
  return { actions, reads, release: () => release() };
}
