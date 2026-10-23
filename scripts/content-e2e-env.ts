// Shared by scripts/build-content-e2e.ts and playwright.content.config.ts.
// Public content pages are prerendered (ISR), so every synthetic provider state
// needs its own build, made with the same environment its server later runs with.
export type ContentE2eState = "published" | "empty" | "down";

export const contentE2eStates: readonly { state: ContentE2eState; port: number }[] = [
  { state: "published", port: 3231 },
  { state: "empty", port: 3232 },
  { state: "down", port: 3233 },
];

export function contentE2eEnv(state: ContentE2eState): Record<string, string> {
  return {
    VERCEL: "", VERCEL_ENV: "", VERCEL_URL: "", VERCEL_TARGET_ENV: "", PUBLIC_CONTENT_TEST_MODE: "true", STAFF_PORTAL_ENABLED: "false",
    STAFF_SUPABASE_URL: "http://127.0.0.1:3230", STAFF_SUPABASE_SECRET_KEY: "sb_secret_public_content_mock_only",
    STAFF_EDITION_KEY: `synthetic-content-${state}`, MSRC_CONTENT_E2E_DIST_DIR: `.next/content-${state}`,
  };
}
