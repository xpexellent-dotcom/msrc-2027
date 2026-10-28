import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

/** Preserve historical public competition links after ENG-088's route split. */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!isLocale(locale)) notFound();
  permanentRedirect(`/${locale}/abstracts`);
}
