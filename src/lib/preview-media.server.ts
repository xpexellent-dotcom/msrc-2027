import "server-only";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { isLocalMediaPreviewAllowed } from "@/lib/preview.server";

export const PREVIEW_ASSETS = {
  "desktop.mp4": "video/mp4",
  "mobile.mp4": "video/mp4",
  "poster-desktop.jpg": "image/jpeg",
  "poster-mobile.jpg": "image/jpeg",
} as const;

/** Never accept a filesystem path, serve an original, or expose ignored media remotely. */
export async function getLocalPreviewAsset(name: string) {
  if (!isLocalMediaPreviewAllowed() || !Object.hasOwn(PREVIEW_ASSETS, name)) return null;
  try {
    const root = await realpath(path.join(process.cwd(), ".tools", "media", "msrc2026-preview"));
    const file = await realpath(path.join(root, name));
    if (path.dirname(file) !== root) return null;
    const info = await stat(file);
    if (!info.isFile() || info.size <= 0 || info.size > 32 * 1024 * 1024) return null;
    return { file, size: info.size, contentType: PREVIEW_ASSETS[name as keyof typeof PREVIEW_ASSETS] };
  } catch {
    return null;
  }
}

/** Single byte ranges support native video seeking, with invalid ranges rejected. */
export function previewByteRange(value: string | null, size: number) {
  if (!Number.isSafeInteger(size) || size <= 0) return null;
  if (value === null) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const a = match[1] ? Number(match[1]) : null;
  const b = match[2] ? Number(match[2]) : null;
  if ((a !== null && !Number.isSafeInteger(a)) || (b !== null && !Number.isSafeInteger(b))) return null;
  if (a === null) {
    if (b === null || b <= 0) return null;
    return { start: Math.max(0, size - b), end: size - 1, partial: true };
  }
  if (a >= size || (b !== null && b < a)) return null;
  return { start: a, end: Math.min(b ?? size - 1, size - 1), partial: true };
}
