import localFont from "next/font/local";

// ORG-004: a self-hosted display face for public editorial titles.
export const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope", weight: "200 800", display: "swap",
});

// DSN-02 / CFG-12: working fonts, self-hosted from exact OFL packages.
export const headingFont = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans", weight: "100 900", display: "swap",
});
export const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter", weight: "100 900", display: "swap",
});
// The Arabic subset has no "0" glyph. While it covered the space it became the first available
// font once loaded, and 1ch fell from the fallback's 0.556em to 0.5em: every ch-based measure
// narrowed after first paint (CLS 0.2 on /ar/media) and two-line headings broke into three or
// four. Its own range (fontsource's Arabic subset) leaves the space to the fallback, so 1ch
// never changes; the file draws no other Latin character.
export const arabicFont = localFont({
  src: "../../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-noto-arabic", weight: "100 900", display: "swap", preload: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC" }],
});
