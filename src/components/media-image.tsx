/* Static responsive derivatives avoid a second cache retaining removed public images. */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/i18n";
import type { MediaAsset } from "@/features/staff-portal/media-contract";

export type PublishedMediaImage = Pick<MediaAsset, "state" | "publicUrl" | "width" | "height" | "altEn" | "altAr" | "focalX" | "focalY">;

/** A current published reference is required; callers must resolve it server-side. */
export function MediaImage({ asset, locale, sizes = "100vw", className, style, loading = "lazy" }: { asset: PublishedMediaImage; locale: Locale; sizes?: string; className?: string; style?: CSSProperties; loading?: "lazy" | "eager" }) {
  if (asset.state !== "published" || !asset.publicUrl) return null;
  const variants = [640, 1280, 1920].filter((width) => width < asset.width).map((width) => `${asset.publicUrl!.replace(/\.webp$/, `.${width}.webp`)} ${width}w`);
  const srcSet = [...variants, `${asset.publicUrl} ${asset.width}w`].join(", ");
  return <img src={asset.publicUrl} srcSet={srcSet} sizes={sizes} width={asset.width} height={asset.height} alt={locale === "ar" ? asset.altAr : asset.altEn} className={className} loading={loading} decoding="async" style={{ ...style, objectFit: "cover", objectPosition: `${asset.focalX}% ${asset.focalY}%` }} />;
}
