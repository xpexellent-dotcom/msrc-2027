import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderLocalEnvironment, writeLocalEnvironmentFile } from "../../scripts/write-local-env.mjs";

const localStatus = {
  API_URL: "http://127.0.0.1:54321",
  PUBLISHABLE_KEY: "sb_publishable_synthetic_test_key",
};
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("safe local environment generation (INF-04, SEC-06)", () => {
  it("copies only validated public values, discarding every other status field", () => {
    const output = renderLocalEnvironment({
      ...localStatus,
      SECRET_KEY: "synthetic-private-value",
      SERVICE_ROLE_KEY: "synthetic-service-role-value",
      JWT_SECRET: "synthetic-jwt-value",
      DB_URL: "synthetic-database-password-value",
    });
    expect(output).toContain("NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321\n");
    expect(output).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_synthetic_test_key\n");
    expect(output.match(/^NEXT_PUBLIC_/gm)).toHaveLength(2);
    expect(output).not.toMatch(/synthetic-(private|service-role|jwt|database-password)-value/);
    expect(output).not.toMatch(/SECRET_KEY|SERVICE_ROLE_KEY|JWT_SECRET|DB_URL/);
  });

  it.each([null, [], "raw status", {}, { API_URL: localStatus.API_URL }, { PUBLISHABLE_KEY: localStatus.PUBLISHABLE_KEY }])(
    "rejects absent, malformed or incomplete local status",
    (status) => expect(() => renderLocalEnvironment(status)).toThrow(),
  );

  it.each([
    { linked_project_ref: "synthetic-reference" },
    { LINKED_PROJECT_REF: "synthetic-reference" },
    { linked_project: { project_ref: "synthetic-reference" } },
  ])("rejects hosted link metadata", (linked) => {
    expect(() => renderLocalEnvironment({ ...localStatus, ...linked })).toThrow(/linked hosted/);
  });

  it.each([
    "https://synthetic.supabase.co",
    "http://localhost.evil.example:54321",
    "http://user:password@localhost:54321",
    "http://127.0.0.1:54321/rest/v1",
    "http://127.0.0.1:54321?token=synthetic",
  ])("rejects remote or decorated origins", (API_URL) => {
    expect(() => renderLocalEnvironment({ ...localStatus, API_URL })).toThrow(/loopback/);
  });

  it.each(["sb_secret_synthetic", "eyJhbGciOiJIUzI1NiJ9.synthetic.signature", "", "sb_publishable_test\nEVIL=true"])(
    "rejects privileged, missing or newline-injected keys without echoing them",
    (PUBLISHABLE_KEY) => {
      let message = "";
      try {
        renderLocalEnvironment({ ...localStatus, PUBLISHABLE_KEY });
        expect.fail("The invalid key must be rejected.");
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toMatch(/loopback|must not be empty/);
      if (PUBLISHABLE_KEY) expect(message).not.toContain(PUBLISHABLE_KEY);
    },
  );

  it("creates a fresh local file and refuses to overwrite existing user settings", () => {
    const directory = mkdtempSync(join(tmpdir(), "msrc-local-env-test-"));
    temporaryDirectories.push(directory);
    const path = join(directory, ".env.local");
    writeLocalEnvironmentFile(directory, localStatus);
    expect(readFileSync(path, "utf8")).toEqual(renderLocalEnvironment(localStatus));
    if (process.platform !== "win32") expect(statSync(path).mode & 0o777).toBe(0o600);
    writeFileSync(path, "EXISTING_USER_SETTING=preserve\n");
    expect(() => writeLocalEnvironmentFile(directory, localStatus)).toThrow(/Refusing to overwrite/);
    expect(readFileSync(path, "utf8")).toBe("EXISTING_USER_SETTING=preserve\n");
  });
});
