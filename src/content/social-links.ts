export type SocialNetwork = "x" | "linkedin" | "instagram" | "tiktok";
export type SocialLink = { network: SocialNetwork; url: string | null };

/** ORG-072: official account URLs remain an owner content gate. Never guess. */
export const socialLinks: readonly SocialLink[] = [
  { network: "x", url: null }, { network: "linkedin", url: null },
  { network: "instagram", url: null }, { network: "tiktok", url: null },
];
export const socialNetworkName: Record<SocialNetwork, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram", tiktok: "TikTok" };
export const socialHosts: Record<SocialNetwork, readonly string[]> = {
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  linkedin: ["linkedin.com", "www.linkedin.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
};
export function socialRowModel(links: readonly SocialLink[], placeholders: boolean) {
  const live = links.filter((link) => link.url);
  const pending = placeholders ? links.filter((link) => !link.url).map((link) => link.network) : [];
  return live.length || pending.length ? { live, pending } : null;
}
