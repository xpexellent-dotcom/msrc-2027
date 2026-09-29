import localFont from "next/font/local";

// DSN-02 / CFG-12: working fonts, self-hosted from exact OFL packages.
export const headingFont = localFont({
  src: "../../node_modules/@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans", weight: "100 900", display: "swap",
});
export const bodyFont = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter", weight: "100 900", display: "swap",
});
export const arabicFont = localFont({
  src: "../../node_modules/@fontsource-variable/noto-sans-arabic/files/noto-sans-arabic-arabic-wght-normal.woff2",
  variable: "--font-noto-arabic", weight: "100 900", display: "swap", preload: false,
});
