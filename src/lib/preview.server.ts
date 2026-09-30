import "server-only";

/** DSN-02 / INF-04: a component workshop, never an operational administration UI. */
export function isDesignPreviewAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV === "development" || process.env.DESIGN_PREVIEW_ENABLED === "true";
}

/** Unpublished montage copies are available only on an explicitly enabled dev server. */
export function isLocalMediaPreviewAllowed(): boolean {
  return process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV === "development" &&
    process.env.LOCAL_MEDIA_PREVIEW_ENABLED === "true";
}
