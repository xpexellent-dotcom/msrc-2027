import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ spawn: vi.fn(), lstat: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn }));
vi.mock("node:fs/promises", () => ({ lstat: mocks.lstat }));
import { deliverIsolatedStaffPreview, staffPreviewEmailMode } from "@/lib/email/isolated-staff-preview.server";

const originalPlatform = process.platform;
function childFixture() {
  const child = Object.assign(new EventEmitter(), { stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
    stdout: new EventEmitter(), stderr: { resume: vi.fn() }, kill: vi.fn() });
  mocks.spawn.mockReturnValue(child);
  return child;
}
const message = () => ({ code: "123456", expiresAt: Date.now() + 300_000 });
async function running() {
  const child = childFixture();
  const result = deliverIsolatedStaffPreview(message());
  await vi.waitFor(() => expect(mocks.spawn).toHaveBeenCalledOnce());
  return { child, result };
}
beforeEach(() => {
  Object.defineProperty(process, "platform", { value: "win32" });
  vi.stubEnv("MSRC_AUTH_PREVIEW", "synthetic"); vi.stubEnv("MSRC_AUTH_PREVIEW_EMAIL", "isolated");
  vi.stubEnv("MSRC_ISOLATED_EMAIL_SELF_RECIPIENT", "approved-self@example.invalid");
  for (const name of ["CI", "GITHUB_ACTIONS", "VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV", "VERCEL_URL", "NEXT_PUBLIC_VERCEL_ENV"]) vi.stubEnv(name, "");
  mocks.spawn.mockReset(); mocks.lstat.mockReset();
  mocks.lstat.mockResolvedValue({ isFile: () => true, isSymbolicLink: () => false });
});
afterEach(() => { Object.defineProperty(process, "platform", { value: originalPlatform }); vi.useRealTimers(); });

describe("local isolated staff delivery dependency", () => {
  it("uses a fixed hidden executable/helper with code only in bounded stdin and exact safe success", async () => {
    const { child, result } = await running();
    const [executable, args, options] = mocks.spawn.mock.calls[0];
    expect(executable).toBe("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    expect(args.slice(0, -1)).toEqual(["-NoLogo", "-NoProfile", "-NonInteractive", "-File"]);
    expect(args.at(-1).endsWith(".tools\\Send-IsolatedStaffCode.ps1") || args.at(-1).endsWith(".tools/Send-IsolatedStaffCode.ps1")).toBe(true);
    expect(args.join(" ").includes(message().code) || args.join(" ").includes("approved-self")).toBe(false);
    expect(options).toEqual({ shell: false, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const packet: unknown = JSON.parse(child.stdin.end.mock.calls[0][0]);
    expect(typeof packet === "object" && packet !== null && Object.keys(packet).sort().join(",") === "code,expiresAt").toBe(true);
    expect(child.stderr.resume).toHaveBeenCalledOnce();
    child.stdout.emit("data", Buffer.from('{"delivered":true}\n')); child.emit("close", 0);
    expect(await result).toBe(true);
  });
  it.each([
    ["MSRC_AUTH_PREVIEW", ""], ["MSRC_AUTH_PREVIEW_EMAIL", ""], ["MSRC_AUTH_PREVIEW_EMAIL", "other"],
    ["MSRC_ISOLATED_EMAIL_SELF_RECIPIENT", ""], ["MSRC_ISOLATED_EMAIL_SELF_RECIPIENT", "invalid"],
    ["MSRC_ISOLATED_EMAIL_SELF_RECIPIENT", "approved@example.invalid\nBcc: other@example.invalid"],
    ["VERCEL_ENV", "production"], ["VERCEL_ENV", "preview"], ["VERCEL_ENV", "development"], ["VERCEL", "1"], ["CI", "true"],
    ["GITHUB_ACTIONS", "true"], ["VERCEL_TARGET_ENV", "staging"], ["VERCEL_URL", "example.vercel.app"], ["NEXT_PUBLIC_VERCEL_ENV", "preview"],
  ])("denies %s=%s before filesystem or transport", async (name, value) => {
    vi.stubEnv(name, value);
    expect(await deliverIsolatedStaffPreview(message())).toBe(false);
    expect(mocks.lstat).not.toHaveBeenCalled(); expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it("denies non-Windows execution without trying another mail transport", async () => {
    Object.defineProperty(process, "platform", { value: "linux" });
    expect(await deliverIsolatedStaffPreview(message())).toBe(false); expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it.each(["", "12345", "1234567", "123456\n", "12\n456", "١٢٣٤٥٦"]) ("denies malformed code before any transport", async (code) => {
    expect(await deliverIsolatedStaffPreview({ ...message(), code })).toBe(false); expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it.each([0, NaN, Infinity, Date.now() - 1, Date.now() + 600_000])("denies stale or excessive expiry", async (expiresAt) => {
    expect(await deliverIsolatedStaffPreview({ ...message(), expiresAt })).toBe(false); expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it.each(["missing", "directory", "symlink"])("denies %s helper without network or fallback", async (kind) => {
    if (kind === "missing") mocks.lstat.mockRejectedValue(new Error("private path"));
    else mocks.lstat.mockResolvedValue({ isFile: () => kind !== "directory", isSymbolicLink: () => kind === "symlink" });
    expect(await deliverIsolatedStaffPreview(message())).toBe(false); expect(mocks.spawn).not.toHaveBeenCalled();
  });
  it.each(['{"delivered":false}', '{"delivered":true,"code":"private"}', '[{"delivered":true}]', 'true', 'private provider response', '{"delivered":"true"}']) (
    "rejects any nonexact success response without exposing it", async (output) => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const { child, result } = await running();
      child.stdout.emit("data", Buffer.from(output)); child.emit("close", 0);
      expect(await result).toBe(false); expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    });
  it("rejects a failed exit even with a success-looking response and does not retry", async () => {
    const { child, result } = await running();
    child.stdout.emit("data", Buffer.from('{"delivered":true}')); child.emit("close", 1);
    expect(await result).toBe(false); expect(mocks.spawn).toHaveBeenCalledOnce();
  });
  it("kills oversized output and reports unavailable without retry", async () => {
    const { child, result } = await running(); child.stdout.emit("data", Buffer.alloc(257, 120));
    expect(await result).toBe(false); expect(child.kill).toHaveBeenCalledOnce(); expect(mocks.spawn).toHaveBeenCalledOnce();
  });
  it.each(["spawn", "stdin"])("fails closed on %s failure", async (kind) => {
    const { child, result } = await running();
    (kind === "stdin" ? child.stdin : child).emit("error", new Error("private details"));
    expect(await result).toBe(false); expect(mocks.spawn).toHaveBeenCalledOnce();
  });
  it("kills a hung delivery after 25 seconds without automatic resend", async () => {
    vi.useFakeTimers(); const child = childFixture(); const result = deliverIsolatedStaffPreview(message());
    await vi.advanceTimersByTimeAsync(0); expect(mocks.spawn).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(await result).toBe(false); expect(child.kill).toHaveBeenCalledOnce(); expect(mocks.spawn).toHaveBeenCalledOnce();
  });
  it("keeps default synthetic mode and makes unknown opt-ins external fail-closed", () => {
    vi.stubEnv("MSRC_AUTH_PREVIEW_EMAIL", ""); expect(staffPreviewEmailMode()).toBe("synthetic");
    vi.stubEnv("MSRC_AUTH_PREVIEW_EMAIL", "invalid"); expect(staffPreviewEmailMode()).toBe("isolated");
  });
});
