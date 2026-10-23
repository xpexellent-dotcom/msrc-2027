import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { StaffConfig } from "./config.server";
import { boundedMediaBytes } from "./media-processing.server";

export const MEDIA_PRIVATE_BUCKET = "msrc-media-drafts";
export const MEDIA_PUBLIC_BUCKET = "msrc-published-media";
export interface MediaStorage {
  signUpload(path: string): Promise<string>;
  read(path: string): Promise<Buffer>;
  write(bucket: string, path: string, bytes: Uint8Array): Promise<void>;
  remove(bucket: string, paths: string[]): Promise<void>;
}
export function createMediaStorage(config: StaffConfig): MediaStorage {
  const safeFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    if (headers.get("authorization") === "Bearer " + config.secretKey) headers.delete("authorization");
    return fetch(input, { ...init, headers, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000) });
  };
  const client = createClient(config.supabaseUrl, config.secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch } });
  return {
    async signUpload(path) {
      const { data, error } = await client.storage.from(MEDIA_PRIVATE_BUCKET).createSignedUploadUrl(path, { upsert: false });
      if (error || !data) throw new Error("Media upload signing unavailable");
      const url = new URL(data.signedUrl);
      if (url.origin !== new URL(config.supabaseUrl).origin || url.username || url.password
        || url.pathname !== `/storage/v1/object/upload/sign/${MEDIA_PRIVATE_BUCKET}/${path}`
        || !url.searchParams.get("token") || url.searchParams.getAll("token").length !== 1) throw new Error("Invalid storage upload URL");
      return url.href;
    },
    async read(path) {
      const url = `${config.supabaseUrl}/storage/v1/object/authenticated/${MEDIA_PRIVATE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
      return boundedMediaBytes(await safeFetch(url, { headers: { apikey: config.secretKey } }));
    },
    async write(bucket, path, bytes) {
      const { error } = await client.storage.from(bucket).upload(path, bytes, { contentType: "image/webp", cacheControl: "0", upsert: false });
      if (error) throw new Error("Media storage write unavailable");
    },
    async remove(bucket, paths) {
      const { error } = await client.storage.from(bucket).remove(paths);
      if (error) throw new Error("Media storage removal unavailable");
    },
  };
}
