/** CMS-01..04 / PRG-01: editable public collections, never private contact data. */
export const CONTENT_COLLECTIONS = ["speakers", "sessions", "partners", "team"] as const;
export type ContentCollection = typeof CONTENT_COLLECTIONS[number];
export type TeamLayout = { slug: string; committee: "scientific" | "organization"; kind: "head" | "lead" | "co-lead"; parentSlug: string | null; noMembers: boolean; members: { nameEn: string; nameAr: string }[] };
export type ContentFields = {
  nameEn: string; nameAr: string; titleEn: string; titleAr: string;
  affiliationEn: string; affiliationAr: string; bioEn: string; bioAr: string;
  descriptionEn: string; descriptionAr: string; groupEn: string; groupAr: string;
  roomEn: string; roomAr: string; day: string; startTime: string; endTime: string;
  type: string; tier: string; url: string; links: string[]; assetId: string | null;
  speakerIds: string[]; sortOrder: number; permissionToDisplay: boolean;
  teamLayout?: TeamLayout;
};
export type ContentItem = { id: string; collection: ContentCollection; version: number; publishedVersion: number | null; draft: ContentFields; updatedAt: string };
export type ContentRevision = { version: number; action: string; fields: ContentFields; createdAt: string };
export type ContentState = "ready" | "updated" | "closed" | "conflict" | "referenced" | "invalid" | "translation-required" | "permission-required" | "media-required" | "denied" | "area-not-ready" | "unavailable" | "limited";
export type ContentResponse = { state: ContentState; items?: ContentItem[]; item?: ContentItem; history?: ContentRevision[]; formToken?: string };
export type ContentPayload = (
  | { action: "save"; collection: ContentCollection; itemId: string | null; version: number; fields: ContentFields }
  | { action: "publish" | "unpublish"; itemId: string; version: number; confirmed: true }
  | { action: "restore"; itemId: string; version: number; restoreVersion: number }
  | { action: "reorder"; collection: ContentCollection; items: { id: string; version: number }[] }
) & { formToken?: string };
export function emptyContentFields(): ContentFields {
  return { nameEn: "", nameAr: "", titleEn: "", titleAr: "", affiliationEn: "", affiliationAr: "", bioEn: "", bioAr: "", descriptionEn: "", descriptionAr: "", groupEn: "", groupAr: "", roomEn: "", roomAr: "", day: "", startTime: "", endTime: "", type: "", tier: "", url: "", links: [], assetId: null, speakerIds: [], sortOrder: 0, permissionToDisplay: false };
}
export const contentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isContentCollection = (value: unknown): value is ContentCollection => CONTENT_COLLECTIONS.includes(value as ContentCollection);
export const contentRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
export const contentVersion = (value: unknown, min = 1): value is number => Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= 2_147_483_647;
export function safeContentUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && !!url.hostname && !url.username && !url.password; } catch { return false; }
}
export function decodeContentFields(value: unknown): ContentFields | null {
  const data = contentRecord(value), base = emptyContentFields();
  if (!data || Object.keys(data).some((key) => key !== "teamLayout" && !Object.hasOwn(base, key)) || Object.keys(base).some((key) => !Object.hasOwn(data, key))) return null;
  const teamLayout = data.teamLayout == null ? undefined : decodeTeamLayout(data.teamLayout);
  if (teamLayout === null) return null;
  const strings = Object.keys(base).filter((key) => typeof base[key as keyof ContentFields] === "string");
  if (!strings.every((key) => typeof data[key] === "string" && data[key].length <= (key.startsWith("bio") || key.startsWith("description") ? 6000 : key === "url" ? 2000 : 500) && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data[key]))) return null;
  if (typeof data.permissionToDisplay !== "boolean" || !contentVersion(data.sortOrder, 0) || Number(data.sortOrder) > 1_000_000
    || data.assetId !== null && (typeof data.assetId !== "string" || !contentUuid.test(data.assetId))
    || !Array.isArray(data.links) || data.links.length > 10 || !data.links.every((url) => typeof url === "string" && url.length <= 2000 && safeContentUrl(url))
    || !Array.isArray(data.speakerIds) || data.speakerIds.length > 50 || !data.speakerIds.every((id) => typeof id === "string" && contentUuid.test(id)) || new Set(data.speakerIds.map((id) => (id as string).toLowerCase())).size !== data.speakerIds.length
    || data.url !== "" && !safeContentUrl(data.url as string)) return null;
  const day = data.day as string;
  if (day && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day + "T00:00:00Z")) || new Date(day + "T00:00:00Z").toISOString().slice(0, 10) !== day)) return null;
  if ([data.startTime, data.endTime].some((time) => time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time as string))) return null;
  if (data.type !== "" && !["talk", "panel", "workshop", "break", "other"].includes(data.type as string)
    || data.tier !== "" && !["platinum", "gold", "silver", "partner"].includes(data.tier as string)) return null;
  // Construct a new allowlisted record rather than forwarding provider properties.
  return { ...Object.fromEntries(Object.keys(base).map((key) => [key, data[key]])),
    ...(teamLayout ? { teamLayout } : {}),
    assetId: typeof data.assetId === "string" ? data.assetId.toLowerCase() : null,
    speakerIds: data.speakerIds.map((id) => (id as string).toLowerCase()) } as ContentFields;
}
export function decodeTeamLayout(value: unknown): TeamLayout | null {
  const row = contentRecord(value), slug = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,127}$/.test(v);
  if (!row || Object.keys(row).sort().join(",") !== "committee,kind,members,noMembers,parentSlug,slug"
    || !slug(row.slug) || !["scientific", "organization"].includes(String(row.committee)) || !["head", "lead", "co-lead"].includes(String(row.kind))
    || row.parentSlug !== null && !slug(row.parentSlug) || (row.kind === "co-lead") !== (row.parentSlug !== null)
    || typeof row.noMembers !== "boolean" || !Array.isArray(row.members) || row.members.length > 100) return null;
  const members: TeamLayout["members"] = [];
  for (const value of row.members) {
    const member = contentRecord(value);
    if (!member || Object.keys(member).sort().join(",") !== "nameAr,nameEn" || ![member.nameEn, member.nameAr].every((v) => typeof v === "string" && v.trim() && v.length <= 500 && !/[\x00-\x1f\x7f]/.test(v))) return null;
    members.push({ nameEn: member.nameEn as string, nameAr: member.nameAr as string });
  }
  return { slug: row.slug, committee: row.committee as TeamLayout["committee"], kind: row.kind as TeamLayout["kind"], parentSlug: row.parentSlug as string | null, noMembers: row.noMembers, members };
}
export function contentPublishIssue(collection: ContentCollection, fields: ContentFields): ContentState | null {
  const required = collection === "sessions" ? ["title"] : collection === "partners" ? ["name"] : collection === "team" ? ["name", "title", "group"] : ["name", "title"];
  for (const prefix of ["name", "title", "affiliation", "bio", "description", "group", "room"] as const) {
    const en = fields[`${prefix}En`].trim(), ar = fields[`${prefix}Ar`].trim();
    if (required.includes(prefix) && (!en || !ar) || Boolean(en) !== Boolean(ar)) return "translation-required";
  }
  if (collection === "partners" && !fields.permissionToDisplay) return "permission-required";
  if (collection === "partners" && !fields.tier || collection === "sessions" && (!fields.day || !fields.startTime || !fields.endTime || fields.endTime <= fields.startTime || !fields.type)) return "invalid";
  return null;
}
export function decodeContentItem(value: unknown): ContentItem | null {
  const row = contentRecord(value), draft = decodeContentFields(row?.draft);
  if (!row || !draft || typeof row.id !== "string" || !contentUuid.test(row.id) || !isContentCollection(row.collection) || !contentVersion(row.version)
    || row.publishedVersion !== null && (!contentVersion(row.publishedVersion) || row.publishedVersion > row.version)
    || typeof row.updatedAt !== "string" || !Number.isFinite(Date.parse(row.updatedAt))) return null;
  return { id: row.id, collection: row.collection, version: row.version, publishedVersion: row.publishedVersion, draft, updatedAt: row.updatedAt };
}
