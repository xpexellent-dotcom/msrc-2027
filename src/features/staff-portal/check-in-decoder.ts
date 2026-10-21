/** CHK-02: QR-only decoding. Pixels and ticket credentials never leave this browser except for the staff check-in request. */
export type QrFrameDecoder = (frame: HTMLVideoElement) => Promise<string | null>;
type NativeDetector = { detect(frame: HTMLVideoElement): Promise<{ rawValue: string; format?: string }[]> };
type NativeConstructor = { new (options: { formats: string[] }): NativeDetector; getSupportedFormats?: () => Promise<string[]> };
type DecoderOptions = { native?: NativeConstructor | null; loadFallback?: () => Promise<QrFrameDecoder> };

async function browserFallback(): Promise<QrFrameDecoder> {
  // Loaded only after staff choose the camera and native QR decoding is unavailable.
  const [{ BrowserQRCodeReader }, { NotFoundException, ChecksumException, FormatException }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const reader = new BrowserQRCodeReader(), canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("camera-unavailable");
  return async (video) => {
    if (!video.videoWidth || !video.videoHeight) return null;
    const scale = Math.min(1, 960 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    try { return reader.decodeFromCanvas(canvas).getText() || null; }
    catch (error) {
      // Constructor identity remains reliable when the production bundler minifies class names.
      if (error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException) return null;
      throw error;
    }
  };
}

/** Native initialization/detection failures fall back once; an empty frame is not an error. */
export async function createQrDecoder(options: DecoderOptions = {}): Promise<QrFrameDecoder> {
  const Native = options.native === undefined ? (globalThis as typeof globalThis & { BarcodeDetector?: NativeConstructor }).BarcodeDetector : options.native;
  const load = options.loadFallback ?? browserFallback;
  let fallback: Promise<QrFrameDecoder> | undefined;
  const fallbackDecode = async (video: HTMLVideoElement) => (await (fallback ??= load()))(video);
  let detector: NativeDetector | undefined;
  if (Native) {
    try { if (!Native.getSupportedFormats || (await Native.getSupportedFormats()).includes("qr_code")) detector = new Native({ formats: ["qr_code"] }); }
    catch { /* Unsupported native implementations use the same QR-only fallback. */ }
  }
  if (!detector) return fallbackDecode;
  return async (video) => {
    if (!detector) return fallbackDecode(video);
    try { return (await detector.detect(video)).find((result) => (!result.format || result.format === "qr_code") && result.rawValue)?.rawValue ?? null; }
    catch { detector = undefined; return fallbackDecode(video); }
  };
}

export function riyadhConferenceDay(days: readonly string[], now = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return days.includes(today) ? today : "";
}

export function cameraFailure(error: unknown): "permission" | "unavailable" {
  return error instanceof Error && ["NotAllowedError", "SecurityError"].includes(error.name) ? "permission" : "unavailable";
}

/** All tracks are closed even if permission resolves after navigation or Stop. */
export async function openCheckInCamera(video: HTMLVideoElement, signal: AbortSignal, devices: Pick<MediaDevices, "getUserMedia">): Promise<MediaStream | null> {
  const stream = await devices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
  const stop = () => { for (const track of stream.getTracks()) track.stop(); if (video.srcObject === stream) video.srcObject = null; };
  if (signal.aborted) { stop(); return null; }
  signal.addEventListener("abort", stop, { once: true });
  video.srcObject = stream;
  try { await video.play(); }
  catch (error) { signal.removeEventListener("abort", stop); stop(); throw error; }
  return signal.aborted ? null : stream;
}

/** A camera-owned signal releases even a wake lock granted after Stop or navigation. */
export async function keepScannerAwake(signal: AbortSignal, wakeLock: Pick<WakeLock, "request">): Promise<void> {
  const lock = await wakeLock.request("screen");
  const release = () => { void lock.release().catch(() => {}); };
  if (signal.aborted) release(); else signal.addEventListener("abort", release, { once: true });
}
