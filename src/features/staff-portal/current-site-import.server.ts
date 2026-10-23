import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { StaffBackend } from "./backend.server";
import type { StaffConfig } from "./config.server";
import { currentSiteImportManifest, type SiteMediaImport } from "./current-site-import";
import { processMedia, mediaVariantPaths } from "./media-processing.server";
import { MEDIA_PRIVATE_BUCKET, MEDIA_PUBLIC_BUCKET, type MediaStorage } from "./media-storage.server";
import { staffUuid } from "./security.server";

export type ImportSummary = { mediaCreated: number; mediaExisting: number; contentCreated: number; contentExisting: number };
export type ImportResult = { state: "ready"; summary: ImportSummary } | { state: "denied" | "invalid" | "busy" | "conflict" | "unavailable" };
export type ImportContext = { config: StaffConfig; backend: StaffBackend; storage: MediaStorage; claims: Record<string, unknown>; accessToken: string };
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function failed(data: Record<string, unknown> | null): ImportResult {
  return { state: ["denied", "invalid", "busy", "conflict"].includes(String(data?.state)) ? data!.state as "denied" | "invalid" | "busy" | "conflict" : "unavailable" };
}
function safePath(path: unknown, edition: string): path is string {
  return typeof path === "string" && path.startsWith(`${edition}/`) && /^[a-z0-9/_-]+\/image\.webp$/.test(path) && path.length < 320;
}
function duplicateMatches(data: Record<string, unknown>, item: SiteMediaImport): boolean {
  // Completed, exposed sources retain subsequent staff edits and withdrawal.
  // A first collision with an ordinary upload must not silently omit archive
  // metadata or replace an incumbent image's approved fields.
  if (data.sourceExisting === true) return true;
  const asset = record(data.asset);
  return !!asset && asset.state === "published" && asset.busy !== true
    && Object.entries(item.fields).filter(([key]) => !["rightsEvidence", "rightsConfirmed"].includes(key)).every(([key, value]) => asset[key] === value)
    && asset.rightsConfirmed === true && typeof asset.rightsEvidence === "string" && !!asset.rightsEvidence.trim();
}
/** Paths originate only in the checked-in manifest, never in request JSON. */
async function readSiteImage(item: SiteMediaImport): Promise<Buffer> {
  if (!/^\/media\/(editions\/(2023|2024|2025|2026)\/[a-z0-9-]+\.webp|team\/[a-z0-9-]+-v4\.jpg)$/.test(item.path)) throw new Error("Invalid import source");
  return readFile(join(process.cwd(), "public", item.path));
}
export function createCurrentSiteImporter(dependencies: {
  manifest?: typeof currentSiteImportManifest; read?: (item: SiteMediaImport) => Promise<Buffer>; process?: typeof processMedia;
} = {}) {
  return async ({ config, backend, storage, claims, accessToken }: ImportContext): Promise<ImportResult> => {
    // The HTTP boundary already checks native identity/SA. Database repeats current
    // SA authority on every reserve, completion and atomic content batch.
    const manifest = (dependencies.manifest ?? currentSiteImportManifest)();
    const summary: ImportSummary = { mediaCreated: 0, mediaExisting: 0, contentCreated: 0, contentExisting: 0 };
    const assets = new Map<string, string>();
    for (const item of manifest.media) {
      const processed = await (dependencies.process ?? processMedia)(await (dependencies.read ?? readSiteImage)(item));
      const { sha256, size, width, height } = processed;
      const reserved = record(await backend.rpc("msrc_staff_media_import_reserve", { edition_key: config.editionKey, session_claims: claims,
        source_key: item.sourceKey, media: { sha256, size, width, height, fileName: item.path.split("/").at(-1), mime: "image/webp" } }));
      if (reserved?.state === "duplicate") {
        if (typeof reserved.assetId !== "string" || !staffUuid.test(reserved.assetId)) return { state: "unavailable" };
        if (!duplicateMatches(reserved, item)) return { state: "conflict" };
        assets.set(item.sourceKey, reserved.assetId); summary.mediaExisting++; continue;
      }
      if (reserved?.state !== "reserved") return failed(reserved);
      if (typeof reserved.importId !== "string" || !staffUuid.test(reserved.importId)
        || !safePath(reserved.storagePath, config.editionKey) || !safePath(reserved.publicPath, config.editionKey)
        || reserved.storagePath === reserved.publicPath) return { state: "unavailable" };
      // Durable reservation owns immutable paths. Keep it pending on ambiguous
      // Storage/DB failures; a rerun cannot publish a second in-flight executor.
      for (const variant of processed.variants) {
        const privatePath = reserved.storagePath.replace(/\.webp$/, () => `${variant.suffix}.webp`);
        const publicPath = reserved.publicPath.replace(/\.webp$/, () => `${variant.suffix}.webp`);
        await storage.write(MEDIA_PRIVATE_BUCKET, privatePath, variant.bytes);
        await storage.write(MEDIA_PUBLIC_BUCKET, publicPath, variant.bytes);
      }
      const finished = record(await backend.rpc("msrc_staff_media_import_finish", { edition_key: config.editionKey, session_claims: claims,
        import_id: reserved.importId, fields: item.fields }));
      if (!["created", "duplicate"].includes(String(finished?.state)) || typeof finished?.assetId !== "string" || !staffUuid.test(finished.assetId)) return failed(finished);
      if (finished.unusedUpload === true) {
        await storage.remove(MEDIA_PRIVATE_BUCKET, mediaVariantPaths(reserved.storagePath));
        await storage.remove(MEDIA_PUBLIC_BUCKET, mediaVariantPaths(reserved.publicPath));
      }
      if (finished.state === "duplicate" && !duplicateMatches(finished, item)) return { state: "conflict" };
      assets.set(item.sourceKey, finished.assetId);
      if (finished.state === "duplicate") summary.mediaExisting++; else summary.mediaCreated++;
    }
    // One database transaction publishes the whole roster. A failed validation
    // cannot replace the static team with a partially imported collection.
    const result = record(await backend.rpc("msrc_staff_content_import", { edition_key: config.editionKey,
      media_sources: manifest.media.map((item) => item.sourceKey),
      items: manifest.content.map(({ sourceKey, collection, photoSourceKey, fields }) => ({ sourceKey, collection,
        fields: { ...fields, assetId: photoSourceKey ? assets.get(photoSourceKey) : null } })) }, accessToken));
    if (result?.state !== "ready" || !count(result.created) || !count(result.existing)
      || result.created + result.existing !== manifest.content.length) return failed(result);
    summary.contentCreated = result.created; summary.contentExisting = result.existing;
    return { state: "ready", summary };
  };
}
export const importCurrentSite = createCurrentSiteImporter();
