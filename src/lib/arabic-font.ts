// The Arabic face is the file @fontsource-variable/noto-sans-arabic ships, copied to
// public/fonts and declared in styles/fonts.css, so Arabic pages can preload it: next/font
// exposes no URL, and preloading it everywhere would cost English readers 166 KB. A package
// bump needs a new copy under the new version's name (tests/unit/arabic-font.test.ts).
export const arabicFontFile = "/fonts/noto-sans-arabic-arabic-wght-5.3.0.woff2";
