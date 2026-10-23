import "server-only";
import { createStaffBackend, StaffRpcMissingError, type StaffBackend } from "./backend.server";
import { getStaffConfig, type StaffConfig, type StaffReadiness } from "./config.server";
import { readStaffToolAuthority } from "./handler.server";
import { nativeTokenNeedsRefresh, readStaffFormToken, readStaffJson, readStaffSession, staffCookie, staffFormToken, staffHash, staffIp, staffOrigin } from "./security.server";
import { contentRecord, contentUuid, contentVersion, decodeContentFields, decodeContentItem, isContentCollection, type ContentCollection, type ContentResponse, type ContentRevision, type ContentState } from "./content-contract";
import { revalidatePublishedContent } from "@/features/content/revalidate.server";

const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
const failures: Record<string, ContentState> = { denied: "denied", invalid: "invalid", conflict: "conflict", not_found: "conflict", referenced: "referenced", translation_required: "translation-required", permission_required: "permission-required", media_required: "media-required", limited: "limited", unavailable: "unavailable" };

export function createContentHandler(dependencies: {
  readiness?: () => StaffReadiness; backend?: (config: StaffConfig) => StaffBackend;
  now?: () => number; revalidate?: (collection: ContentCollection) => void;
} = {}) {
  return async (request: Request): Promise<Response> => {
    const readiness = (dependencies.readiness ?? getStaffConfig)();
    if (readiness.state !== "ready") return Response.json({ state: readiness.state }, { status: 503, headers });
    const config = readiness.config, now = (dependencies.now ?? Date.now)(), origin = staffOrigin(config, request);
    let rotated: string | undefined;
    const reply = (body: ContentResponse, status = 200) => Response.json({ ...body, ...(origin ? { formToken: staffFormToken(config, origin, now) } : {}) }, { status, headers: { ...headers, ...(rotated ? { "Set-Cookie": rotated } : {}) } });
    if (!origin || ![null, "same-origin", "none"].includes(request.headers.get("sec-fetch-site"))
      || request.headers.get("origin") && request.headers.get("origin") !== origin
      || request.method === "POST" && request.headers.get("origin") !== origin) return reply({ state: "invalid" }, 400);
    if (!["GET", "POST"].includes(request.method)) return reply({ state: "invalid" }, 405);
    const backend = (dependencies.backend ?? createStaffBackend)(config);
    try {
      const status = contentRecord(await backend.rpc("msrc_staff_status"));
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
      const rpc = async (name: string, args: Record<string, unknown>) => contentRecord(await backend.rpc("msrc_staff_content_" + name, { edition_key: config.editionKey, ...args }, session.accessToken));
      const outcome = (data: Record<string, unknown> | null): Response => {
        if (typeof data?.state !== "string") return reply({ state: "unavailable" }, 503);
        const failure = Object.hasOwn(failures, data.state) ? failures[data.state] : undefined;
        if (failure) return reply({ state: failure }, failure === "denied" ? 403 : failure === "limited" ? 429 : failure === "unavailable" ? 503 : 409);
        if (!["ready", "updated", "created"].includes(data.state)) return reply({ state: "unavailable" }, 503);
        const result: ContentResponse = { state: data.state === "ready" ? "ready" : "updated" };
        if (data.item !== undefined) { const item = decodeContentItem(data.item); if (!item) return reply({ state: "unavailable" }, 503); result.item = item; }
        if (data.items !== undefined) {
          if (!Array.isArray(data.items) || data.items.length > 1000) return reply({ state: "unavailable" }, 503);
          const items = data.items.map(decodeContentItem);
          if (items.some((item) => !item) || new Set(items.map((item) => item?.id)).size !== items.length) return reply({ state: "unavailable" }, 503);
          result.items = items.filter((item) => item !== null);
        }
        if (data.history !== undefined) {
          if (!Array.isArray(data.history) || data.history.length > 1000) return reply({ state: "unavailable" }, 503);
          const history: ContentRevision[] = [];
          for (const value of data.history) {
            const entry = contentRecord(value), fields = decodeContentFields(entry?.fields);
            if (!entry || !fields || !contentVersion(entry.version) || typeof entry.action !== "string" || !["create", "save", "publish", "unpublish", "restore", "reorder"].includes(entry.action)
              || typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt))) return reply({ state: "unavailable" }, 503);
            history.push({ version: entry.version, action: entry.action, fields, createdAt: entry.createdAt });
          }
          result.history = history;
        }
        if (!result.item && !result.items && !result.history) return reply({ state: "unavailable" }, 503);
        return reply(result);
      };
      if (request.method === "GET") {
        const query = new URL(request.url).searchParams;
        if (query.size !== 1) return reply({ state: "invalid" }, 400);
        const collection = query.get("collection"), itemId = query.get("itemId");
        if (isContentCollection(collection)) return outcome(await rpc("list", { collection_key: collection }));
        if (typeof itemId === "string" && contentUuid.test(itemId)) return outcome(await rpc("history", { item_id: itemId }));
        return reply({ state: "invalid" }, 400);
      }
      let input: Record<string, unknown> | null;
      try { input = contentRecord(await readStaffJson(request, 131072)); } catch { return reply({ state: "invalid" }, 400); }
      const nonce = readStaffFormToken(config, input?.formToken, origin, now), ip = staffIp(config, request);
      if (!input || !nonce || !ip) return reply({ state: "invalid" }, 400);
      const claimed = contentRecord(await backend.rpc("msrc_staff_form_claim", { nonce_hash: staffHash(config, "nonce", nonce), ip_hash: staffHash(config, "ip", ip) }));
      if (claimed?.state !== "claimed") return reply({ state: "limited" }, 429);
      const keys = (...allowed: string[]) => Object.keys(input).every((key) => ["action", "formToken", ...allowed].includes(key));
      if (input.action === "save") {
        const fields = decodeContentFields(input.fields);
        if (!keys("collection", "itemId", "version", "fields") || !isContentCollection(input.collection) || !fields
          || input.itemId !== null && (typeof input.itemId !== "string" || !contentUuid.test(input.itemId))
          || !contentVersion(input.version, input.itemId === null ? 0 : 1) || input.itemId === null && input.version !== 0) return reply({ state: "invalid" }, 400);
        return outcome(await rpc("save", { collection_key: input.collection, item_id: input.itemId, expected_version: input.version, fields }));
      }
      if (input.action === "reorder") {
        if (!keys("collection", "items") || !isContentCollection(input.collection) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 1000) return reply({ state: "invalid" }, 400);
        const items = input.items.map(contentRecord);
        if (items.some((item) => !item || Object.keys(item).length !== 2 || typeof item.id !== "string" || !contentUuid.test(item.id) || !contentVersion(item.version))
          || new Set(items.map((item) => item?.id)).size !== items.length) return reply({ state: "invalid" }, 400);
        return outcome(await rpc("reorder", { collection_key: input.collection, items }));
      }
      if (typeof input.itemId !== "string" || !contentUuid.test(input.itemId) || !contentVersion(input.version)) return reply({ state: "invalid" }, 400);
      if (input.action === "restore") {
        if (!keys("itemId", "version", "restoreVersion") || !contentVersion(input.restoreVersion)) return reply({ state: "invalid" }, 400);
        return outcome(await rpc("transition", { item_id: input.itemId, expected_version: input.version, action: "restore", restore_version: input.restoreVersion }));
      }
      if (!["publish", "unpublish"].includes(String(input.action)) || !keys("itemId", "version", "confirmed") || input.confirmed !== true) return reply({ state: "invalid" }, 400);
      const data = await rpc("transition", { item_id: input.itemId, expected_version: input.version, action: input.action, restore_version: null });
      const response = outcome(data);
      // Invalidate only after a validated, committed database publication transition.
      if (response.ok) {
        const item = decodeContentItem(data?.item);
        if (!item) return reply({ state: "unavailable" }, 503);
        (dependencies.revalidate ?? revalidatePublishedContent)(item.collection);
      }
      return response;
    } catch (error) {
      return reply({ state: error instanceof StaffRpcMissingError ? "area-not-ready" : "unavailable" }, 503);
    }
  };
}
export const handleContentRequest = createContentHandler();
