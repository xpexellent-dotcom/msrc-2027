import sharp from "sharp";

// Reuse the approved public homepage still, preserving its previous-edition scene and crop.
await sharp("public/media/msrc2026/poster-desktop-v1.jpg").resize({ width: 600 }).png().toFile("public/brand/email-banner.png");
