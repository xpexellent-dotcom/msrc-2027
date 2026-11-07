import { describe, expect, it } from "vitest";
import { previewPlaceholdersAllowed } from "@/lib/preview-placeholders";

describe("build-time homepage placeholders (ORG-072 / REL-01)", () => {
  it.each([
    [{}, false], [{ VERCEL_ENV: "production" }, false],
    [{ VERCEL_ENV: "production", MSRC_PREVIEW_PLACEHOLDERS: "true" }, false],
    [{ VERCEL_ENV: "preview" }, true], [{ MSRC_PREVIEW_PLACEHOLDERS: "true" }, true],
    [{ MSRC_PREVIEW_PLACEHOLDERS: "1" }, false], [{ VERCEL_ENV: "development" }, false],
  ] as const)("maps %j to %s", (env, expected) => expect(previewPlaceholdersAllowed(env)).toBe(expected));
});
