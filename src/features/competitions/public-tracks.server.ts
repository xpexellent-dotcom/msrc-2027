import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { resolvePublicContentConfig } from "@/features/content/published.server";

export type PublicHackathonTrack = { label: { en: string; ar: string }; description: { en: string; ar: string } };
export type PublicHackathonTracks = Record<"translating_research" | "advancing_research", PublicHackathonTrack>;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const exact = (row: Record<string, unknown>, keys: string[]) => Object.keys(row).sort().join(",") === keys.sort().join(",");
/** Only explicitly public display text crosses into the page's client props. */
export function decodePublicHackathonTracks(value: unknown): PublicHackathonTracks | null {
  const data = record(value);
  if (!data || !exact(data, ["translating_research", "advancing_research"])) return null;
  const result: Partial<PublicHackathonTracks> = {};
  for (const key of ["translating_research", "advancing_research"] as const) {
    const track = record(data[key]); if (!track || !exact(track, ["label", "description"])) return null;
    const label = record(track.label), description = record(track.description);
    if (!label || !description || !exact(label, ["en", "ar"]) || !exact(description, ["en", "ar"])) return null;
    for (const locale of ["en", "ar"] as const) if (typeof label[locale] !== "string" || !String(label[locale]).trim() || String(label[locale]).length > 500 || typeof description[locale] !== "string" || !String(description[locale]).trim() || String(description[locale]).length > 5000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(String(label[locale]) + String(description[locale]))) return null;
    result[key] = { label: { en: String(label.en), ar: String(label.ar) }, description: { en: String(description.en), ar: String(description.ar) } };
  }
  return result as PublicHackathonTracks;
}
type Config = NonNullable<ReturnType<typeof resolvePublicContentConfig>>;
export async function fetchPublicHackathonTracks(config: Config, request: typeof fetch = fetch): Promise<PublicHackathonTracks | null> {
  try {
    const response = await request(`${config.origin}/rest/v1/rpc/msrc_competitions_public_tracks`, { method: "POST", headers: { apikey: config.secret, "Content-Type": "application/json" }, body: JSON.stringify({ edition_key: config.edition }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    return decodePublicHackathonTracks(await response.json());
  } catch { return null; }
}
/** Missing configuration/migration keeps the organizer-approved built-in overview. */
export const getPublicHackathonTracks = cache(async (): Promise<PublicHackathonTracks | null> => {
  const config = resolvePublicContentConfig(process.env); if (!config) return null;
  try { return await unstable_cache(() => fetchPublicHackathonTracks(config), ["msrc-hackathon-tracks-v1", config.origin, config.edition], { revalidate: 60, tags: ["msrc-hackathon-tracks"] })(); } catch { return null; }
});
