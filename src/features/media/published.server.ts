import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { PublicMedia } from "@/content/conference-experiences";
import { resolvePublicContentConfig } from "@/features/content/published.server";
import { decodePublishedMedia } from "./published";

export const mediaArchiveTag = "msrc-media:archive";
type ReadConfig = NonNullable<ReturnType<typeof resolvePublicContentConfig>>;

/** No staff session or participant cookie enters the published archive transport. */
export async function fetchPublishedMedia(config: ReadConfig, request: typeof fetch = fetch): Promise<PublicMedia[] | null> {
  try {
    const response = await request(`${config.origin}/rest/v1/rpc/msrc_media_published`, {
      method: "POST", headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: config.edition }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3_000),
    });
    return response.ok ? decodePublishedMedia(await response.json(), config.origin) : null;
  } catch { return null; }
}

export const getPublishedMedia = cache(async (): Promise<readonly PublicMedia[]> => {
  const config = resolvePublicContentConfig(process.env);
  if (!config) return [];
  try {
    return await unstable_cache(async () => await fetchPublishedMedia(config) ?? [],
      ["msrc-media-archive-v1", config.origin, config.edition], { revalidate: 60, tags: [mediaArchiveTag] })();
  } catch { return []; }
});
