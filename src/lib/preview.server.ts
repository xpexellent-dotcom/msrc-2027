import "server-only";

/** DSN-02 / INF-04: a component workshop, never an operational administration UI. */
export function isDesignPreviewAllowed(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV === "development" || process.env.DESIGN_PREVIEW_ENABLED === "true";
}
