import { readFile } from "node:fs/promises";
import sharp from "sharp";

// ORG-062 PLACEHOLDER until the official banner replaces this single-file asset.
const tokens = await readFile("src/styles/tokens.css", "utf8");
const colour = (name) => {
  const value = tokens.match(new RegExp(`--color-${name}:\\s*(#[a-f0-9]{6})`, "i"))?.[1];
  if (!value) throw new Error(`Missing brand colour: ${name}`);
  return value;
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="338" viewBox="0 0 600 338">
<rect width="600" height="338" fill="${colour("purple")}"/>
<rect x="48" y="90" width="48" height="3" fill="${colour("gold")}"/>
<text x="48" y="167" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="${colour("gold")}">MSRC 2027</text>
<text x="48" y="211" font-family="Arial, sans-serif" font-size="23" fill="${colour("ivory")}">Medical Students Research Conference</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile("public/brand/email-banner.png");
