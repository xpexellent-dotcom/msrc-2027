import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { shareCardSize } from "@/content/share-card";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const alt = "MSRC 2027";
export const size = shareCardSize;
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const image = await readFile(join(process.cwd(), "public/brand/share", locale + ".png"));
  return new Response(new Uint8Array(image), { headers: { "Content-Type": contentType } });
}
