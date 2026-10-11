import type { ReactNode } from "react";

export type VenueIconName = "city" | "host" | "venue" | "address" | "calendar" | "arrow" | "taxi" | "train" | "rental" | "entryGate" | "ticket" | "parking" | "accessibility" | "onSite" | "wifi" | "globe";

const paths: Record<VenueIconName, ReactNode> = {
  city: <><path d="M3 21V8h7v13M10 21V3h11v18M1 21h22M6 11v2m0 3v2m8-11h3m-3 4h3m-3 4h3" /></>,
  host: <><path d="m2 9 10-6 10 6H2Zm2 3v6m5-6v6m6-6v6m5-6v6M2 21h20" /></>,
  venue: <><path d="M3 21V7l9-4 9 4v14M8 21v-6h8v6M7 9h2m6 0h2M7 12h2m6 0h2" /></>,
  address: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18M7 15h2m6 0h2M7 18h2" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  taxi: <><path d="m4 11 2-6h12l2 6M3 11h18v8H3v-8Zm2 8v2m14-2v2M6 15h2m8 0h2M10 5V3h4v2" /></>,
  train: <><rect x="5" y="3" width="14" height="16" rx="3" /><path d="M5 11h14M12 3v8M8 16h1m6 0h1M8 19l-2 3m10-3 2 3" /></>,
  rental: <><path d="m4 10 2-5h12l2 5M3 10h18v9H3v-9Zm2 9v2m14-2v2M6 14h2m8 0h2" /></>,
  entryGate: <><path d="M3 21V4h7v17M14 21V4h7v17M1 21h22M7 8v2m10-2v2M10 5h4M12 10v7m-3-3 3 3 3-3" /></>,
  ticket: <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm12 0v3m0 3v1m0 3v2" />,
  parking: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M9 17V7h4a3 3 0 0 1 0 6H9" /></>,
  accessibility: <><circle cx="13" cy="4" r="2" /><path d="m12 7-1 7h7l3 5M12 10h5M8 10a6 6 0 1 0 7 9" /></>,
  onSite: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3c-4 3-5 7-5 11h5V3Zm0 11v7" /></>,
  wifi: <><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0" /><circle cx="12" cy="20" r=".7" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z" /></>,
};

export function VenueIcon({ name }: { name: VenueIconName }) {
  return <svg className={name === "arrow" ? "venue-icon directional-arrow" : "venue-icon"} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
