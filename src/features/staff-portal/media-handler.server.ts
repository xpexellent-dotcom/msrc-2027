import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { verifiedStaffRegistrationClaims } from "./registration-contract.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin, staffUuid } from "./security.server";
import { MEDIA_MAX_BYTES, MediaInputError, mediaVariantPaths, processMedia } from "./media-processing.server";
import { createMediaStorage, MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET, type MediaStorage } from "./media-storage.server";
import { revalidatePublishedContent } from "@/features/content/revalidate.server";
import { importCurrentSite } from "./current-site-import.server";
import { isMediaVideoPath } from "./media-contract";
import { revalidatePublishedMedia } from "@/features/media/revalidate.server";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const stateNames = new Set(["denied", "invalid", "invalid_transition", "conflict", "busy", "alt_required", "rights_required", "expired", "not_found", "limited", "rate_limited", "unavailable", "failed"]);
const validArchiveFields = (a: Record<string, unknown>) => (a.editionYear === null || integer(a.editionYear, 1900, 2200))
  && integer(a.displayOrder, 0, 2_147_483_647) && (a.kind === "photograph" && a.videoPath === null || a.kind === "film" && isMediaVideoPath(a.videoPath));
function safePath(value: unknown, config: StaffConfig, raw = false): value is string {
  return typeof value === "string" && value.startsWith(config.editionKey + "/") && !value.includes("..")
    && /^[a-z0-9/_\-.]+$/.test(value) && value.length < 320 && (raw || value.endsWith("/image.webp"));
}
function assetProjection(value: unknown, config: StaffConfig) {
  const a = record(value); if (!a || typeof a.id !== "string" || !staffUuid.test(a.id) || !safePath(a.storagePath, config)
    || !text(a.fileName, 200) || !["draft", "published", "archived"].includes(String(a.state)) || a.mime !== "image/webp"
    || !integer(a.size, 1, MEDIA_MAX_BYTES) || !integer(a.width, 1, 2560) || !integer(a.height, 1, 2560) || !integer(a.version, 1, 2_147_483_647)
    || !["altEn", "altAr", "captionEn", "captionAr", "creditEn", "creditAr", "rightsEvidence"].every((key) => text(a[key], 2000))
    || typeof a.rightsConfirmed !== "boolean" || ![a.focalX, a.focalY].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100)
    || ![a.createdAt, a.updatedAt].every((v) => typeof v === "string" && Number.isFinite(Date.parse(v)))
    || !validArchiveFields(a)
    || a.state === "published" && !safePath(a.publicPath, config)) return null;
  return { id: a.id, filename: a.fileName, mime: a.mime, size: a.size, width: a.width, height: a.height, version: a.version,
    state: a.state, altEn: a.altEn, altAr: a.altAr, captionEn: a.captionEn, captionAr: a.captionAr, creditEn: a.creditEn, creditAr: a.creditAr,
    focalX: a.focalX, focalY: a.focalY, rightsConfirmed: a.rightsConfirmed, rightsEvidence: a.rightsEvidence,
    editionYear: a.editionYear, kind: a.kind, displayOrder: a.displayOrder, videoPath: a.videoPath,
    createdAt: a.createdAt, updatedAt: a.updatedAt, busy: a.busy === true,
    previewUrl: `/api/staff-portal/media?preview=${a.id}`, publicUrl: a.state === "published" ? `${config.supabaseUrl}/storage/v1/object/public/${MEDIA_PUBLIC_BUCKET}/${a.publicPath}` : null };
}
export function createMediaHandler(dependencies: { readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend; storage?: (config: StaffConfig) => MediaStorage; now?: () => number; revalidate?: () => void; importCurrentSite?: typeof importCurrentSite } = {}) {
  return async (request: Request): Promise<Response> => {
    let rotated: string | undefined;
    const readiness = (dependencies.readiness ?? getStaffConfig)();
    const basic = (body: Record<string, unknown>, status: number) => Response.json(body, { status, headers });
    if (readiness.state !== "ready") return basic({ state: readiness.state }, 503);
    const config = readiness.config, now = (dependencies.now ?? Date.now)();
    const origin = staffOrigin(config, request);
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))
      || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin) return basic({ state: "invalid" }, 400);
    const reply = (body: Record<string, unknown>, status = 200) => Response.json({ ...body, formToken: staffFormToken(config, origin, now) },
      { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = record(await backend.rpc("msrc_staff_status"));
      if (status?.enabled !== true || status.emailDailyLimit !== config.emailDailyLimit) return reply({ state: "closed" }, 503);
      let session = readStaffSession(config, request, now);
      if (!session) return reply({ state: "denied" }, 403);
      if (nativeTokenNeedsRefresh(session.accessToken, now)) {
        const refreshed = await backend.refresh(session.refreshToken);
        if (!refreshed || refreshed.actorId !== session.actorId || refreshed.sessionId !== session.sessionId) return reply({ state: "denied" }, 403);
        session = { ...session, ...refreshed }; rotated = staffCookie(config, session, now);
      }
      const authority = await readStaffToolAuthority(config, backend, session, now);
      if (!authority || authority.context.timing.absoluteExpiresAtMs !== session.deadline
        || !authority.profile.roles.some((role) => role === "contentMediaEditor" || role === "superAdmin")) return reply({ state: "denied" }, 403);
      const claims = verifiedStaffRegistrationClaims(session, now);
      if (!claims) return reply({ state: "denied" }, 403);
      const rpc = async (name: string, args: Record<string, unknown>, service = false) => record(await backend.rpc("msrc_staff_media_" + name,
        { edition_key: config.editionKey, ...args, ...(service ? { session_claims: claims } : {}) }, service ? undefined : session.accessToken));
      const outcome = (data: Record<string, unknown> | null) => {
        const state = typeof data?.state === "string" ? data.state : "unavailable";
        if (stateNames.has(state)) {
          const projected = state === "expired" ? "upload-expired" : state === "invalid_transition" || state === "not_found" ? "conflict" : state === "failed" ? "unavailable" : state === "rate_limited" ? "limited" : state.replaceAll("_", "-");
          return reply({ state: projected }, projected === "denied" ? 403 : projected === "limited" ? 429 : projected === "unavailable" ? 503 : 409);
        }
        const asset = assetProjection(data?.asset, config);
        return ["updated", "created", "duplicate", "completed", "ready"].includes(state) && asset ? reply({ state: "ready", asset, duplicate: state === "duplicate" }) : reply({ state: "unavailable" }, 503);
      };
      const storage = (dependencies.storage ?? createMediaStorage)(config);
      const revalidate = () => {
        if (dependencies.revalidate) dependencies.revalidate();
        else { for (const collection of ["speakers", "sessions", "partners", "team"] as const) revalidatePublishedContent(collection); revalidatePublishedMedia(); }
      };
      if (request.method === "GET") {
        const params = new URL(request.url).searchParams;
        if ([...params.keys()].some((key) => !["q", "state", "year", "preview"].includes(key) || params.getAll(key).length !== 1)) return reply({ state: "invalid" }, 400);
        if (params.has("preview")) {
          const id = params.get("preview")!;
          if (params.size !== 1 || !staffUuid.test(id)) return reply({ state: "invalid" }, 400);
          const data = await rpc("get", { asset_id: id }), asset = record(data?.asset);
          if (data?.state !== "ready" || !assetProjection(asset, config) || !safePath(asset?.storagePath, config)) return outcome(data);
          const bytes = await storage.read(asset.storagePath);
          return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/webp", ...(rotated ? { "Set-Cookie": rotated } : {}) } });
        }
        const search = params.get("q") ?? "", filter = params.get("state") ?? "all", year = params.get("year") ?? "all";
        if (!text(search, 120) || !["all", "draft", "published", "archived"].includes(filter) || year !== "all" && !/^(19|20|21|22)\d{2}$/.test(year)
          || year !== "all" && !integer(Number(year), 1900, 2200)) return reply({ state: "invalid" }, 400);
        const data = await rpc("list", { search_query: search, state_filter: filter, year_filter: year === "all" ? null : Number(year) });
        if (data?.state !== "ready") return outcome(data);
        if (!Array.isArray(data.assets) || data.assets.length > 100 || !integer(data.total, 0, 2_147_483_647)) return reply({ state: "unavailable" }, 503);
        const assets = data.assets.map((asset) => assetProjection(asset, config));
        const years = data.years;
        if (!Array.isArray(years) || years.length > 301 || !years.every((value) => integer(value, 1900, 2200))) return reply({ state: "unavailable" }, 503);
        return assets.every(Boolean) ? reply({ state: "ready", assets, total: data.total, years, canImport: authority.profile.roles.includes("superAdmin") }) : reply({ state: "unavailable" }, 503);
      }
      let input: Record<string, unknown> | null;
      try { input = record(await readStaffJson(request)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const claimed = record(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }));
      if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      const keys = (...allowed: string[]) => Object.keys(input).every((key) => ["action", "formToken", ...allowed].includes(key));
      if (input.action === "import-current-site") {
        if (!keys()) return reply({ state: "invalid" }, 400);
        if (!authority.profile.roles.includes("superAdmin")) return reply({ state: "denied" }, 403);
        const result = await (dependencies.importCurrentSite ?? importCurrentSite)({ config, backend, storage, claims, accessToken: session.accessToken });
        if (result.state === "ready") revalidate();
        return reply(result, result.state === "ready" ? 200 : result.state === "denied" ? 403 : result.state === "unavailable" ? 503 : 409);
      }
      if (input.action === "upload-url") {
        if (!keys("filename", "size") || !text(input.filename, 200) || !input.filename.trim() || /[\\/\x00-\x1f\x7f]/.test(input.filename) || !integer(input.size, 1, MEDIA_MAX_BYTES)) return reply({ state: Number(input.size) > MEDIA_MAX_BYTES ? "upload-too-large" : "invalid" }, 400);
        const data = await rpc("upload_reserve", { file_name: input.filename.trim(), file_size: input.size });
        if (data?.state !== "reserved") return outcome(data);
        if (typeof data.uploadId !== "string" || !staffUuid.test(data.uploadId) || !safePath(data.storagePath, config, true)) return reply({ state: "unavailable" }, 503);
        const signedUrl = await storage.signUpload(data.storagePath);
        return reply({ state: "ready", uploadId: data.uploadId, signedUrl, path: data.storagePath, expiresAt: data.expiresAt });
      }
      if (input.action === "complete-upload") {
        if (!keys("uploadId") || typeof input.uploadId !== "string" || !staffUuid.test(input.uploadId)) return reply({ state: "invalid" }, 400);
        const data = await rpc("upload_claim", { upload_id: input.uploadId });
        if (data?.state !== "reserved") return outcome(data);
        if (!safePath(data.storagePath, config, true) || !safePath(data.sanitizedPath, config)) return reply({ state: "unavailable" }, 503);
        try {
          const processed = await processMedia(await storage.read(data.storagePath));
          for (const variant of processed.variants) await storage.write(MEDIA_PRIVATE_BUCKET, data.sanitizedPath.replace(/\.webp$/, variant.suffix + ".webp"), variant.bytes);
          await storage.remove(MEDIA_PRIVATE_BUCKET, [data.storagePath]);
          const { mime, size, width, height, sha256 } = processed;
          const completed = await rpc("upload_complete", { upload_id: input.uploadId, media: { mime, size, width, height, sha256 } }, true);
          if (completed?.state === "duplicate") await storage.remove(MEDIA_PRIVATE_BUCKET, mediaVariantPaths(data.sanitizedPath));
          return outcome(completed);
        } catch (error) {
          if (!(error instanceof MediaInputError)) throw error;
          await storage.remove(MEDIA_PRIVATE_BUCKET, [data.storagePath]);
          await rpc("upload_reject", { upload_id: input.uploadId }, true);
          return reply({ state: error.state }, 400);
        }
      }
      if (typeof input.assetId !== "string" || !staffUuid.test(input.assetId) || !integer(input.version, 1, 2_147_483_647)) return reply({ state: "invalid" }, 400);
      if (input.action === "reorder") {
        if (!keys("assetId", "version", "direction") || !["earlier", "later"].includes(String(input.direction))) return reply({ state: "invalid" }, 400);
        const response = outcome(await rpc("reorder", { asset_id: input.assetId, expected_version: input.version, direction: input.direction }));
        if (response.ok) (dependencies.revalidate ?? revalidatePublishedMedia)();
        return response;
      }
      if (input.action === "save") {
        const fieldNames = ["altEn", "altAr", "captionEn", "captionAr", "creditEn", "creditAr", "focalX", "focalY", "rightsConfirmed", "rightsEvidence", "editionYear", "kind", "displayOrder", "videoPath"];
        if (!keys("assetId", "version", ...fieldNames) || !fieldNames.slice(0, 6).every((key) => text(input[key], key.startsWith("caption") ? 2000 : 500))
          || !validArchiveFields(input) || !text(input.rightsEvidence, 2000) || typeof input.rightsConfirmed !== "boolean" || ![input.focalX, input.focalY].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100)) return reply({ state: "invalid" }, 400);
        const response = outcome(await rpc("update", { asset_id: input.assetId, expected_version: input.version, fields: Object.fromEntries(fieldNames.map((key) => [key, input[key]])) }));
        if (response.ok) revalidate();
        return response;
      }
      if (!["publish", "unpublish", "archive"].includes(String(input.action)) || !keys("assetId", "version", "operationId")
        || typeof input.operationId !== "string" || !staffUuid.test(input.operationId)) return reply({ state: "invalid" }, 400);
      const transitionOutcome = (result: Record<string, unknown> | null) => {
        const response = outcome(result);
        if (response.ok) revalidate();
        return response;
      };
      const data = await rpc("transition_begin", { asset_id: input.assetId, expected_version: input.version, action: input.action, operation_id: input.operationId });
      if (data?.state !== "reserved") return transitionOutcome(data);
      const asset = record(data.asset);
      if (data.operationId !== input.operationId || !safePath(asset?.storagePath, config) || data.publicPath !== null && !safePath(data.publicPath, config)) return reply({ state: "unavailable" }, 503);
      // Reservation is durable. Never release it on ambiguous Storage/DB errors:
      // an in-flight remote request cannot be fenced by a database lease expiry.
      if (input.action === "publish") {
        if (!safePath(data.publicPath, config)) return reply({ state: "unavailable" }, 503);
        const privatePaths = mediaVariantPaths(asset.storagePath), publicPaths = mediaVariantPaths(data.publicPath);
        const bytes: Buffer[] = [];
        try { for (const path of privatePaths) bytes.push(await storage.read(path)); }
        catch { await rpc("transition_finish", { operation_id: input.operationId, success: false }, true); return reply({ state: "unavailable" }, 503); }
        for (let i = 0; i < publicPaths.length; i++) await storage.write(MEDIA_PUBLIC_BUCKET, publicPaths[i], bytes[i]);
      } else if (data.publicPath !== null) await storage.remove(MEDIA_PUBLIC_BUCKET, mediaVariantPaths(data.publicPath as string));
      return transitionOutcome(await rpc("transition_finish", { operation_id: input.operationId, success: true }, true));
    } catch (error) {
      return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503);
    }
  };
}
export const handleMediaRequest = createMediaHandler();
