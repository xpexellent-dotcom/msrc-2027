import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveStaffConfig, type StaffConfig } from "@/features/staff-portal/config.server";
import { createMediaStorage, MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET } from "@/features/staff-portal/media-storage.server";
import { MEDIA_MAX_BYTES } from "@/features/staff-portal/media-processing.server";

const config = (resolveStaffConfig({ STAFF_PORTAL_ENABLED: "true", STAFF_PORTAL_TEST_MODE: "true", STAFF_AUTH_SECURITY_SECRET: "b".repeat(64),
  STAFF_SUPABASE_URL: "http://127.0.0.1:3220", STAFF_SUPABASE_SECRET_KEY: "sb_secret_staff_mock_only",
  STAFF_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staff_mock_only", RESEND_API_KEY: "re_staff_mock_only",
  STAFF_EDITION_KEY: "synthetic-staff-2027", STAFF_AUTH_EMAIL_DAILY_LIMIT: "40" }) as { config: StaffConfig }).config;
const base = `${config.supabaseUrl}/storage/v1`, path = `${config.editionKey}/57000000-0000-4000-8000-000000000001/image.webp`;
const rawPath = path.replace("image.webp", "raw"), bytes = new Uint8Array([82, 73, 70, 70, 16, 0, 0, 0, 87, 69, 66, 80]);
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
afterEach(() => vi.unstubAllGlobals());

function sent(index = 0) {
  const [input, init] = fetchMock.mock.calls[index];
  return { url: new URL(input instanceof Request ? input.url : String(input)), init, headers: new Headers(init?.headers) };
}
function expectPrivateTransport(index = 0) {
  const request = sent(index);
  expect(request.url.origin).toBe(config.supabaseUrl);
  expect(request.headers.get("apikey")).toBe(config.secretKey);
  expect(request.headers.has("authorization")).toBe(false);
  expect(request.url.href).not.toContain(config.secretKey);
  expect(request.init).toMatchObject({ redirect: "error", cache: "no-store", signal: expect.any(AbortSignal) });
  expect(request.init?.signal?.aborted).toBe(false);
}

describe("Supabase media Storage adapter transport", () => {
  it("signs one extensionless raw private path without overwrite or browser credentials", async () => {
    fetchMock.mockResolvedValue(Response.json({ url: `/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}?token=synthetic-capability` }));
    const result = await createMediaStorage(config).signUpload(rawPath);
    expect(result).toBe(`${base}/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}?token=synthetic-capability`);
    expect(result).not.toContain(config.secretKey);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sent().url.href).toBe(`${base}/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}`);
    expect(sent().init).toMatchObject({ method: "POST", body: "{}" });
    expect(sent().headers.get("x-upsert")).not.toBe("true");
    expectPrivateTransport();
  });
  it.each([
    `/object/upload/sign/${MEDIA_PUBLIC_BUCKET}/${rawPath}?token=synthetic`,
    `/object/public/${MEDIA_PRIVATE_BUCKET}/${rawPath}?token=synthetic`,
    `/object/upload/sign/${MEDIA_PRIVATE_BUCKET}-other/${rawPath}?token=synthetic`,
    `/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}-other?token=synthetic`,
    `/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}?token=one&token=two`,
    `//attacker.invalid/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}?token=synthetic`,
  ])("rejects an unexpected signed target: %s", async (url) => {
    fetchMock.mockResolvedValue(Response.json({ url }));
    await expect(createMediaStorage(config).signUpload(rawPath)).rejects.toThrow(/Invalid storage upload URL|signing unavailable/);
    expect(fetchMock).toHaveBeenCalledTimes(1); expectPrivateTransport();
  });
  it("rejects missing signed capabilities and returns a generic signing error", async () => {
    fetchMock.mockResolvedValue(Response.json({ url: `/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${rawPath}` }));
    await expect(createMediaStorage(config).signUpload(rawPath)).rejects.toThrow("Media upload signing unavailable");
  });
  it.each([MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET])("writes stripped WebP to %s with immutable keys and zero browser max-age", async (bucket) => {
    fetchMock.mockResolvedValue(Response.json({ Id: "synthetic", Key: `${bucket}/${path}` }));
    await createMediaStorage(config).write(bucket, path, bytes);
    expect(sent().url.href).toBe(`${base}/object/${bucket}/${path}`);
    expect(sent().init?.method).toBe("POST");
    expect(sent().headers.get("content-type")).toBe("image/webp");
    expect(sent().headers.get("cache-control")).toBe("max-age=0");
    expect(sent().headers.get("x-upsert")).toBe("false");
    expect(sent().init?.body).toEqual(bytes); expectPrivateTransport();
  });
  it("reads original and sanitized private bytes only through the authenticated object endpoint", async () => {
    fetchMock.mockImplementation(async () => new Response(bytes, { headers: { "content-length": String(bytes.length) } }));
    const storage = createMediaStorage(config);
    expect(await storage.read(rawPath)).toEqual(Buffer.from(bytes));
    expect(await storage.read(path)).toEqual(Buffer.from(bytes));
    expect(sent(0).url.href).toBe(`${base}/object/authenticated/${MEDIA_PRIVATE_BUCKET}/${rawPath}`);
    expect(sent(1).url.href).toBe(`${base}/object/authenticated/${MEDIA_PRIVATE_BUCKET}/${path}`);
    expectPrivateTransport(0); expectPrivateTransport(1);
  });
  it("rejects provider errors and oversized advertised content before consuming the body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("denied", { status: 403 }));
    await expect(createMediaStorage(config).read(path)).rejects.toThrow("Media storage unavailable");
    const cancel = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(new ReadableStream({ cancel }), { headers: { "content-length": String(MEDIA_MAX_BYTES + 1) } }));
    await expect(createMediaStorage(config).read(path)).rejects.toThrow("upload-too-large");
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("bounds actual streamed bytes even when Storage omits its length header", async () => {
    fetchMock.mockResolvedValue(new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array(MEDIA_MAX_BYTES)); controller.enqueue(new Uint8Array([1])); controller.close();
    } })));
    await expect(createMediaStorage(config).read(path)).rejects.toThrow("upload-too-large");
  });
  it.each([MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET])("removes the exact supplied variant paths from %s", async (bucket) => {
    fetchMock.mockResolvedValue(Response.json([]));
    const paths = [path, path.replace(".webp", ".640.webp"), path.replace(".webp", ".1280.webp"), path.replace(".webp", ".1920.webp")];
    await createMediaStorage(config).remove(bucket, paths);
    expect(sent().url.href).toBe(`${base}/object/${bucket}`);
    expect(sent().init?.method).toBe("DELETE");
    expect(JSON.parse(String(sent().init?.body))).toEqual({ prefixes: paths });
    expectPrivateTransport();
  });
  it("does not report provider write/remove errors as successful or expose provider details", async () => {
    fetchMock.mockImplementation(async () => Response.json({ statusCode: "403", error: "Unauthorized", message: "Synthetic private diagnostic" }, { status: 403 }));
    const storage = createMediaStorage(config);
    await expect(storage.write(MEDIA_PUBLIC_BUCKET, path, bytes)).rejects.toThrow("Media storage write unavailable");
    await expect(storage.remove(MEDIA_PUBLIC_BUCKET, [path])).rejects.toThrow("Media storage removal unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("never follows redirects with the server secret", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      expect(new URL(String(input)).origin).toBe(config.supabaseUrl);
      expect(init?.redirect).toBe("error");
      throw new TypeError("fetch failed: unexpected redirect");
    });
    await expect(createMediaStorage(config).read(path)).rejects.toThrow(/redirect/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
