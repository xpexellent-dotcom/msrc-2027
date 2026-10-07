import { describe, expect, it } from "vitest";
import { handlerDiagnostic, nativeAuthDiagnostic } from "../staff-native/diagnostic";

describe("private native staff CI diagnostics", () => {
  it("retains only fixed provider status/code and trigger reason enums", () => {
    expect(nativeAuthDiagnostic({ status: 500, code: "unexpected_failure", message: "Database error creating new user" }))
      .toBe(" (Auth status=500, code=unexpected_failure, SQLSTATE=withheld, reason=native_database_creation)");
    expect(nativeAuthDiagnostic({ status: 403, code: "42501", message: "Bootstrap native prerequisites required." }))
      .toBe(" (Auth status=403, code=withheld, SQLSTATE=42501, reason=bootstrap_prerequisites)");
  });
  it("withholds arbitrary messages, addresses, credentials and unknown codes", () => {
    const message = "person@example.invalid password=PrivateSecret token=PrivateToken";
    expect(nativeAuthDiagnostic({ status: 9999, code: message, message, details: message })).toBe(" (Auth status=withheld, code=withheld, SQLSTATE=withheld, reason=withheld)");
    expect(nativeAuthDiagnostic(null)).toBe("");
  });
  it("projects only allowlisted handler outcomes", () => {
    expect(handlerDiagnostic({ status: 503, result: { state: "unavailable" } })).toBe(" (handler status=503, state=unavailable)");
    expect(handlerDiagnostic({ status: 9999, result: { state: "secret@example.invalid" } })).toBe(" (handler status=withheld, state=withheld)");
  });
});
