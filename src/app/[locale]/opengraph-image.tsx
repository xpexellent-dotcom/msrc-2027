import { ImageResponse } from "next/og";
import { locales } from "@/lib/i18n";
import { conferenceConfig } from "@/config/conference";
import { formatConferenceDateRange } from "@/lib/conference-dates";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const alt = "MSRC 2027: The 5th Medical Students Research Conference, King Abdulaziz University, Jeddah";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link-preview card in the working palette. Latin-only on purpose: the bundled image font has
// no Arabic glyphs and the self-hosted fonts are WOFF2, which the renderer cannot read.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "72px 84px", color: "#F8F6F0",
        background: "linear-gradient(135deg, #1F1930 0%, #2A1850 55%, #3B1E6D 100%)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 3, color: "#DCCFF0" }}>
          <span>KING ABDULAZIZ UNIVERSITY · JEDDAH</span>
          <span style={{ color: "#C9A24A" }}>WEBSITE PREVIEW</span>
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
