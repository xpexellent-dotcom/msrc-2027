import { describe, expect, it } from "vitest";
import { ciStorageChildEnvironment, ciStorageContainerChecks, validCiStorageContainer, validateCiStorageBoundary } from "../../scripts/ci-storage-fixture";

const environment = { CI: "true", GITHUB_ACTIONS: "true", RUNNER_ENVIRONMENT: "github-hosted", GITHUB_REPOSITORY: "xpexellent-dotcom/msrc-2027" };
const config = `project_id = "msrc2027-local"
[db]
port = 54322
major_version = 17
[auth]
enable_signup = false
[auth.email]
enable_signup = true
[auth.hook.send_email]
enabled = true
uri = "pg-functions://postgres/msrc_ci_auth/reject_email"
`;
const target = { name: "/supabase_db_msrc2027-local", image: "public.ecr.aws/supabase/postgres:17.6.1.171", running: true,
  network: "msrc2027-local", ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "54322" }] } };

describe("disposable Storage fixture boundary", () => {
  it("admits only the already configured unlinked no-delivery Linux GitHub stack", () => {
    expect(() => validateCiStorageBoundary(config, environment, "linux", false)).not.toThrow();
  });
  it.each([
    { change: { GITHUB_REPOSITORY: "another/repository" } }, { change: { RUNNER_ENVIRONMENT: "self-hosted" } },
    { change: { CI: "false" } }, { change: { SUPABASE_PROJECT_REF: "synthetic-linked-ref" } },
    { change: { SUPABASE_ACCESS_TOKEN: "synthetic-token" } }, { change: { NEXT_PUBLIC_SUPABASE_TARGET: "hosted" } },
    { change: { NEXT_PUBLIC_SUPABASE_URL: "https://example.invalid" } }, { change: { STAFF_PORTAL_ENABLED: "true" } },
    { change: { PARTICIPANT_ACCOUNTS_ENABLED: "true" } }, { change: { STAFF_PASSWORD_CHANGE_ENABLED: "true" } },
  ])("rejects a hosted, live, credentialed or unsupported boundary %j", ({ change }) => {
    expect(() => validateCiStorageBoundary(config, { ...environment, ...change }, "linux", false)).toThrow();
  });
  it.each(["win32", "darwin"])("refuses the operator host %s", (platform) => {
    expect(() => validateCiStorageBoundary(config, environment, platform, false)).toThrow();
  });
  it("refuses a linked directory or changed native configuration", () => {
    expect(() => validateCiStorageBoundary(config, environment, "linux", true)).toThrow();
    for (const altered of [config.replace("54322", "6543"), config.replace("major_version = 17", "major_version = 18"),
      config.replace("enable_signup = false", "enable_signup = true"), config.replace("msrc2027-local", "other-local"),
      config.replace("msrc_ci_auth/reject_email", "other/send_email"), config.replace("[auth.hook.send_email]\nenabled = true", "[auth.hook.send_email]\nenabled = false")]) {
      expect(() => validateCiStorageBoundary(altered, environment, "linux", false)).toThrow();
    }
  });
  it("drops ambient Docker routing, database/API credentials and settings from the child", () => {
    expect(ciStorageChildEnvironment({ PATH: "/usr/bin", LANG: "C.UTF-8", DOCKER_HOST: "tcp://example.invalid:2375", DOCKER_CONTEXT: "remote",
      DOCKER_CONFIG: "/synthetic/credentials", PGHOSTADDR: "192.0.2.1", PGPASSWORD: "synthetic-database-password",
      SUPABASE_SECRET_KEY: "synthetic-secret", STAFF_BOOTSTRAP_PASSWORD: "synthetic-staff-password", GOTRUE_SMTP_PASS: "synthetic-mail-password" }))
      .toEqual({ PATH: "/usr/bin", LANG: "C.UTF-8" });
  });
  it("admits only the exact running loopback Docker database", () => {
    for (const image of ["public.ecr.aws/supabase/postgres:17.6.1.171", "ghcr.io/supabase/postgres:17.6.1.171", "supabase/postgres:17.6.1.171"]) {
      expect(validCiStorageContainer({ ...target, image })).toBe(true);
    }
    for (const changed of [{ ...target, running: false }, { ...target, name: "/other" }, { ...target, network: "bridge" },
      { ...target, image: "untrusted/postgres:17.6" }, { ...target, image: "public.ecr.aws/supabase/postgres:18.1" },
      { ...target, image: "public.ecr.aws/supabase/postgres:17.6.1.063" },
      { ...target, ports: { "5432/tcp": [{ HostIp: "0.0.0.0", HostPort: "54322" }] } },
      { ...target, ports: { ...target.ports, "9999/tcp": [{ HostIp: "127.0.0.1", HostPort: "9999" }] } }]) {
      expect(validCiStorageContainer(changed)).toBe(false);
    }
  });
  it("projects only allowlisted booleans when runtime target metadata differs", () => {
    const checks = ciStorageContainerChecks({ ...target, image: "untrusted/private-image:17", network: "unapproved-network",
      env: ["SYNTHETIC_SECRET=never-output"] });
    expect(checks).toEqual({ exactName: true, running: true, exactNetwork: false, approvedPinnedImage: false,
      loopbackDatabasePort: true, noExtraPublishedPorts: true });
    expect(JSON.stringify(checks)).not.toMatch(/private-image|unapproved-network|never-output|SECRET/);
  });
});
