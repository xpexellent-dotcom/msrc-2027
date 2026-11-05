/** ORG-072: owner-supplied official identity, 4 November 2026. */
export const brandLogo = { onPurple: "/brand/identity/msrc27-logo-on-purple.webp", width: 1200, height: 380 } as const;
/** Header and footer share one intrinsic size and both load eagerly, so the page
 *  requests one optimised logo once and never needs it again later (no lazy re-fetch,
 *  including when the connection drops mid-visit). CSS sets the displayed height. */
export const brandLogoRendition = { width: 177, height: 56 } as const;
