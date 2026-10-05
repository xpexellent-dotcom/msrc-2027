import type { ConferenceVenue } from "@/config/conference";

export type VenueMapProvider = "google" | "apple" | "waze";
export type VenueMapLink = Readonly<{ provider: VenueMapProvider; href: string }>;

/** Address links use approved venue configuration; no coordinates or route estimates. */
export function venueMapLinks(venue: ConferenceVenue): readonly VenueMapLink[] {
  const destination = encodeURIComponent(`${venue.name.en}, ${venue.address.streetAddress.en}, ${venue.address.addressLocality} ${venue.address.postalCode}`);
  return [
    { provider: "google", href: `https://www.google.com/maps/dir/?api=1&destination=${destination}` },
    { provider: "apple", href: `https://maps.apple.com/directions?destination=${destination}` },
    // Waze documents address search; navigation would need an approved coordinate pair.
    { provider: "waze", href: `https://waze.com/ul?q=${destination}` },
  ];
}
