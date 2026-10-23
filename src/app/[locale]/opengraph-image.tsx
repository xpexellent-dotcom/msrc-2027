import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { locales } from "@/lib/i18n";
import { conferenceConfig } from "@/config/conference";
import { formatConferenceDateRange } from "@/lib/conference-dates";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
// Only the two prerendered cards exist; /fr/opengraph-image and the like are 404s.
export const dynamicParams = false;

export const alt = "MSRC 2027: The 5th Medical Students Research Conference, King Abdulaziz University, Jeddah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card in the working palette. The image renderer cannot shape Arabic, so the
// Arabic card is a browser-rendered PNG of the same design: scripts/render-arabic-share-card.mjs.
export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  if ((await params).locale === "ar") {
    const card = await readFile(join(process.cwd(), "public/og/msrc-2027-ar.png"));
    return new Response(card, { headers: { "Content-Type": contentType } });
  }
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "72px 84px", color: "#F8F6F0",
        background: "linear-gradient(135deg, #1F1930 0%, #2A1850 55%, #3B1E6D 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 3, color: "#DCCFF0" }}>
          <span>KING ABDULAZIZ UNIVERSITY · JEDDAH</span>
          <span style={{ color: "#C9A24A", letterSpacing: 1 }}>msrc2027.com</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: 210, fontWeight: 700, letterSpacing: -12, lineHeight: 0.9 }}>MSRC</span>
            <span style={{ fontSize: 76, fontWeight: 500, color: "#C9A24A", marginLeft: 28, marginBottom: 12 }}>2027</span>
          </div>
          <span style={{ fontSize: 42, marginTop: 36 }}>The 5th Medical Students Research Conference</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", width: 100, height: 6, borderRadius: 3, background: "#C9A24A" }} />
          {conferenceConfig.dates && <span style={{ fontSize: 32, color: "#DCCFF0" }}>{formatConferenceDateRange(conferenceConfig.dates, "en")}</span>}
        </div>
      </div>
    ),
    size,
  );
}
