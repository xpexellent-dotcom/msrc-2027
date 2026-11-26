export type PlaceholderEnv = Readonly<Partial<Record<"VERCEL_ENV" | "MSRC_PREVIEW_PLACEHOLDERS", string>>>;

/** ORG-072/086: the illustrative sponsor belt is excluded from Vercel production. */
export function previewPlaceholdersAllowed(env: PlaceholderEnv): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return env.VERCEL_ENV === "preview" || env.MSRC_PREVIEW_PLACEHOLDERS === "true";
}

/** next.config.ts freezes this literal at build time; ISR cannot switch the decision. */
export const homePlaceholdersEnabled = () => process.env.MSRC_HOME_PLACEHOLDERS === "true";
