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

// The Arabic face is self-hosted separately: see arabic-font.ts and styles/fonts.css.
