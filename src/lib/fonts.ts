import localFont from "next/font/local";

// ENG-094 / ORG-072: public display face (EN); LCP text, so preloaded.
export const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2",
  variable: "--font-fraunces", weight: "100 900", display: "swap", adjustFontFallback: "Times New Roman",
});

// Public text/UI face (EN); also the staff heading face (ENG-007, unchanged).
export const textFont = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans", weight: "100 900", display: "swap",
});
// Staff body face only (ENG-007). Public pages must not request it.
export const staffFont = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter", weight: "100 900", display: "swap", preload: false,
});
// Staff display face only. Retain ENG-007 roles without a public preload.
export const staffDisplayFont = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope", weight: "200 800", display: "swap", preload: false,
});
// The Arabic subset has no "0" glyph. While it covered the space it became the first available
// font once loaded, and 1ch fell from the fallback's 0.556em to 0.5em: every ch-based measure
// narrowed after first paint (CLS 0.2 on /ar/media) and two-line headings broke into three or
// four. Its own range (fontsource's Arabic subset) leaves the space to the fallback, so 1ch
// never changes; the file draws no other Latin character.
// next/font's automatic fallback is Arial, whose Arabic is about 25% narrower than Noto Sans
// Arabic, so lines rewrapped when the font arrived (CLS 0.096 on /ar/participate). tokens.css
// supplies a closer, Arabic-only fallback instead.
export const arabicFont = localFont({
  src: "../../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-noto-arabic", weight: "100 900", display: "swap", preload: false, adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC" }],
});

// Public Arabic display face; the Arabic-only range never requests it on English pages.
export const arabicDisplayFont = localFont({
  src: "../../node_modules/@fontsource-variable/el-messiri/files/el-messiri-arabic-wght-normal.woff2",
  variable: "--font-el-messiri", weight: "400 700", display: "swap", preload: false, adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC" }],
});
