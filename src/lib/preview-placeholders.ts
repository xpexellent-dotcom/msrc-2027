export type PlaceholderEnv = Readonly<Partial<Record<"VERCEL_ENV" | "MSRC_PREVIEW_PLACEHOLDERS", string>>>;

/** ORG-072: illustrative social/sponsor placeholders never reach Vercel production. Never enable for a publicly served build. Pure; unit-tested. */
export function previewPlaceholdersAllowed(env: PlaceholderEnv): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.VERCEL_ENV === "preview" || env.MSRC_PREVIEW_PLACEHOLDERS === "true";
}

/** next.config.ts freezes this literal at build time; ISR cannot switch the decision. */
export const homePlaceholdersEnabled = () => process.env.MSRC_HOME_PLACEHOLDERS === "true";
