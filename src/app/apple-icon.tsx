import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon matching src/app/icon.svg. Square on purpose: iOS applies its own corner mask.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#3B1E6D" }}>
        <svg width="180" height="180" viewBox="0 0 32 32">
          <path d="M8.5 20.5V8.5l7.5 8.5 7.5-8.5v12" fill="none" stroke="#F8F6F0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="8.5" y="24" width="15" height="2.2" rx="1.1" fill="#C9A24A" />
        </svg>
      </div>
    ),
    size,
  );
}
