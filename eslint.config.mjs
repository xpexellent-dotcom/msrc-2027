import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "node_modules/**", ".tools/**", "playwright-report/**", "test-results/**", "playwright-home-preview-report/**", "playwright-content-report/**", "playwright-auth-report/**", "playwright-contact-report/**", "playwright-staff-report/**", "test-auth-results/**", "test-contact-results/**", "next-env.d.ts"]),
]);
