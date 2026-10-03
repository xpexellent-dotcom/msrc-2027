import type { MetadataRoute } from "next";
import { conferenceDescription } from "@/lib/metadata";

// Name, colours and icon for "Add to Home screen". A plain bookmark-style shortcut: no offline
// mode, install prompt or notifications. "/" opens Arabic or English by browser language.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MSRC 2027 | Medical Students Research Conference",
    short_name: "MSRC 2027",
    description: conferenceDescription("en", "The 5th Medical Students Research Conference."),
    start_url: "/",
    display: "browser",
    background_color: "#F8F6F0",
    theme_color: "#F8F6F0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
