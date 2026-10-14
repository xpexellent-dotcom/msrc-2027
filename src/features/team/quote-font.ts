import localFont from "next/font/local";

// Load the real italic face only where the team’s supplied personal quotes appear.
export const teamQuoteFont = localFont({
  src: "../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2",
  variable: "--font-team-quote",
  weight: "100 900",
  style: "italic",
  display: "swap",
  preload: false,
});
