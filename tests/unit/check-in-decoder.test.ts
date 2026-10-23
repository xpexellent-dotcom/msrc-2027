import { afterEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
// Resolve the real pinned decoder dependencies during test-module setup. Cold Vitest
// transforms are not part of the frame-decoding assertion's five-second deadline.
// Production still loads these lazily through the default createQrDecoder path.
import "@zxing/browser";
import "@zxing/library";
import { cameraFailure, createQrDecoder, keepScannerAwake, openCheckInCamera, riyadhConferenceDay } from "../../src/features/staff-portal/check-in-decoder";

const video = {} as HTMLVideoElement;
afterEach(() => vi.unstubAllGlobals());

describe("CHK-02 native and fallback QR decoding", () => {
  it("uses native QR detection without downloading the fallback", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: "SYNTHETIC-QR", format: "qr_code" }]), loadFallback = vi.fn();
    class Native { static getSupportedFormats = async () => ["qr_code"]; detect = detect; }
    const decode = await createQrDecoder({ native: Native, loadFallback });
    expect(await decode(video)).toBe("SYNTHETIC-QR"); expect(loadFallback).not.toHaveBeenCalled();
  });
  it("ignores non-QR and empty frames without falling back", async () => {
    const loadFallback = vi.fn();
    class Native { detect = async () => [{ rawValue: "other", format: "code_128" }, { rawValue: "", format: "qr_code" }]; }
    expect(await (await createQrDecoder({ native: Native, loadFallback }))(video)).toBeNull(); expect(loadFallback).not.toHaveBeenCalled();
  });
  it("loads one fallback for unsupported QR formats", async () => {
    class Native { static getSupportedFormats = async () => ["code_128"]; detect = vi.fn(); }
    const fallback = vi.fn().mockResolvedValue("FALLBACK-QR"), loadFallback = vi.fn().mockResolvedValue(fallback);
    const decode = await createQrDecoder({ native: Native, loadFallback });
    expect(await decode(video)).toBe("FALLBACK-QR"); expect(await decode(video)).toBe("FALLBACK-QR"); expect(loadFallback).toHaveBeenCalledTimes(1);
  });
  it("recovers from native constructor failures", async () => {
    class Native { constructor() { throw new Error("Unsupported"); } detect = vi.fn(); }
    const loadFallback = vi.fn().mockResolvedValue(async () => "RECOVERED");
    expect(await (await createQrDecoder({ native: Native, loadFallback }))(video)).toBe("RECOVERED");
  });
  it("recovers from native capability failures", async () => {
    class Native { static getSupportedFormats = async () => { throw new Error("Unsupported"); }; detect = vi.fn(); }
    expect(await (await createQrDecoder({ native: Native, loadFallback: async () => async () => "RECOVERED" }))(video)).toBe("RECOVERED");
  });
  it("switches once when native detection fails after camera startup", async () => {
    const detect = vi.fn().mockRejectedValue(new Error("Broken native implementation"));
    class Native { detect = detect; }
    const loadFallback = vi.fn().mockResolvedValue(async () => "RECOVERED"), decode = await createQrDecoder({ native: Native, loadFallback });
    expect(await decode(video)).toBe("RECOVERED"); expect(await decode(video)).toBe("RECOVERED");
    expect(detect).toHaveBeenCalledTimes(1); expect(loadFallback).toHaveBeenCalledTimes(1);
  });
  it("reports fallback loading failure instead of inventing a ticket", async () => {
    const decode = await createQrDecoder({ native: null, loadFallback: async () => { throw new Error("Chunk unavailable"); } });
    await expect(decode(video)).rejects.toThrow("Chunk unavailable");
  });
  it("decodes an actual generated QR with the pinned browser fallback and tolerates blank frames", async () => {
    const value = "msrc-ticket.synthetic-token-only", matrix = QRCode.create(value).modules, scale = 6, size = (matrix.size + 8) * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let row = 0; row < matrix.size; row++) for (let column = 0; column < matrix.size; column++) {
      if (!matrix.get(row, column)) continue;
      for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
        const offset = (((row + 4) * scale + y) * size + (column + 4) * scale + x) * 4;
        pixels[offset] = 0; pixels[offset + 1] = 0; pixels[offset + 2] = 0;
      }
    }
    const canvas = { width: size, height: size, getContext: () => ({ drawImage: vi.fn(), getImageData: () => ({ data: pixels }) }) };
    vi.stubGlobal("document", { createElement: () => canvas });
    const frame = { videoWidth: size, videoHeight: size } as HTMLVideoElement, decode = await createQrDecoder({ native: null });
    expect(await decode(frame)).toBe(value);
    pixels.fill(255); expect(await decode(frame)).toBeNull();
    expect(await decode({ videoWidth: 0, videoHeight: 0 } as HTMLVideoElement)).toBeNull();
  });
});

describe("CHK-02 camera lifecycle and conference-day selection", () => {
  it("selects today in Riyadh only when configured", () => {
    expect(riyadhConferenceDay(["2027-01-27", "2027-01-28"], new Date("2027-01-26T22:00:00Z"))).toBe("2027-01-27");
    expect(riyadhConferenceDay(["2027-01-27", "2027-01-28"], new Date("2027-01-28T22:00:00Z"))).toBe("");
    expect(riyadhConferenceDay([], new Date("2027-01-27T10:00:00Z"))).toBe("");
  });
  it.each(["NotAllowedError", "SecurityError"])("recognizes %s as a permission refusal", (name) => {
    expect(cameraFailure(new DOMException("refused", name))).toBe("permission");
  });
  it("handles missing devices and unknown failures generically", () => {
    expect(cameraFailure(new DOMException("missing", "NotFoundError"))).toBe("unavailable"); expect(cameraFailure(null)).toBe("unavailable");
  });
  it("requests the rear camera without audio and releases every track on abort", async () => {
    const stop = vi.fn(), stream = { getTracks: () => [{ stop }, { stop }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream), controller = new AbortController();
    const target = { srcObject: null, play: vi.fn().mockResolvedValue(undefined) } as unknown as HTMLVideoElement;
    expect(await openCheckInCamera(target, controller.signal, { getUserMedia })).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: "environment" } } });
    controller.abort(); expect(stop).toHaveBeenCalledTimes(2); expect(target.srcObject).toBeNull();
  });
  it("closes late permission grants after navigation without playing the camera", async () => {
    const stop = vi.fn(), stream = { getTracks: () => [{ stop }] } as unknown as MediaStream, controller = new AbortController();
    const target = { srcObject: null, play: vi.fn() } as unknown as HTMLVideoElement;
    let grant: (stream: MediaStream) => void = () => {};
    const pending = openCheckInCamera(target, controller.signal, { getUserMedia: () => new Promise((resolve) => { grant = resolve; }) });
    controller.abort(); grant(stream); expect(await pending).toBeNull(); expect(stop).toHaveBeenCalledOnce(); expect(target.play).not.toHaveBeenCalled();
  });
  it("releases tracks if video playback cannot begin", async () => {
    const stop = vi.fn(), stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const target = { srcObject: null, play: vi.fn().mockRejectedValue(new Error("play refused")) } as unknown as HTMLVideoElement;
    await expect(openCheckInCamera(target, new AbortController().signal, { getUserMedia: async () => stream })).rejects.toThrow("play refused");
    expect(stop).toHaveBeenCalledOnce(); expect(target.srcObject).toBeNull();
  });
  it("releases the wake lock when scanning stops", async () => {
    const release = vi.fn().mockResolvedValue(undefined), controller = new AbortController();
    const request = vi.fn().mockResolvedValue({ release });
    await keepScannerAwake(controller.signal, { request }); expect(request).toHaveBeenCalledWith("screen"); expect(release).not.toHaveBeenCalled();
    controller.abort(); expect(release).toHaveBeenCalledOnce();
  });
  it("releases a wake lock granted after scanning has stopped", async () => {
    const release = vi.fn().mockResolvedValue(undefined), controller = new AbortController(); controller.abort();
    await keepScannerAwake(controller.signal, { request: vi.fn().mockResolvedValue({ release }) }); expect(release).toHaveBeenCalledOnce();
  });
  it("reports wake-lock refusal without blocking camera use", async () => {
    await expect(keepScannerAwake(new AbortController().signal, { request: vi.fn().mockRejectedValue(new Error("refused")) })).rejects.toThrow("refused");
  });
});
