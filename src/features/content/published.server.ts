import "server-only";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { cache } from "react";
import type { ContentCollection } from "@/features/staff-portal/content-contract";
import { decodePublishedContent, type PublishedContent } from "./published";

export const contentTag = (collection: ContentCollection) => `msrc-content:${collection}`;
type ReadConfig = { origin: string; secret: string; edition: string };
/** Reading approved public snapshots does not open, or depend on, the staff console. */
export function resolvePublicContentConfig(env: Readonly<Record<string, string | undefined>>): ReadConfig | null {
  const origin = env.STAFF_SUPABASE_URL; const secret = env.STAFF_SUPABASE_SECRET_KEY; const edition = env.STAFF_EDITION_KEY;
  if (!origin || !secret || !edition || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(edition)) return null;
  if (env.PUBLIC_CONTENT_TEST_MODE === "true") {
    if (env.VERCEL || env.VERCEL_ENV || env.VERCEL_URL || env.VERCEL_TARGET_ENV || origin !== "http://127.0.0.1:3230"
      || secret !== "sb_secret_public_content_mock_only" || !/^synthetic-content-(published|empty|down)$/.test(edition)) return null;
  } else if (origin !== "https://ecemjggwlzqpjcwmchrl.supabase.co" || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secret) || secret.includes("mock_only")) return null;
  return { origin, secret, edition };
}

/** Independent bounded transport. No cookies, auth sessions, or user-specific responses. */
export async function fetchPublishedCollection(collection: ContentCollection, config: ReadConfig, request: typeof fetch = fetch): Promise<PublishedContent[] | null> {
  try {
    const response = await request(`${config.origin}/rest/v1/rpc/msrc_content_published`, {
      method: "POST", headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: config.edition, collection_key: collection }),
      redirect: "error", cache: "no-store", signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return null;
    return decodePublishedContent(await response.json(), collection, config.origin);
  } catch { return null; }
}

export const getPublishedContent = cache(async (collection: ContentCollection): Promise<readonly PublishedContent[]> => {
  // Runtime configuration must be observed even when the build ran before the migration/config existed.
  // This request boundary deliberately stays outside the persistent public-data cache.
  await connection();
  const config = resolvePublicContentConfig(process.env);
  if (!config) return [];
  try {
    return await unstable_cache(async () => await fetchPublishedCollection(collection, config) ?? [],
      ["msrc-content-v1", config.origin, config.edition, collection], { revalidate: 60, tags: [contentTag(collection)] })();
  } catch { return []; }
});
