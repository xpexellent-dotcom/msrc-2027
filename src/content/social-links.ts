export type SocialNetwork = "x" | "linkedin" | "instagram" | "tiktok";
export type SocialLink = { network: SocialNetwork; url: string | null };

/** ORG-086: configure only organizer-approved social account URLs. */
export const socialLinks: readonly SocialLink[] = [
  { network: "x", url: "https://x.com/Research__PC" },
  { network: "linkedin", url: null },
  { network: "instagram", url: null },
  { network: "tiktok", url: null },
];
export const socialLinkCopy = {
  en: { label: "Social media", soon: "Soon" },
  ar: { label: "وسائل التواصل الاجتماعي", soon: "قريبًا" },
} as const;

export const socialNetworkName: Record<SocialNetwork, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram", tiktok: "TikTok" };
export const socialHosts: Record<SocialNetwork, readonly string[]> = {
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
};
