import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default async function Page({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (value) value.forEach((item) => query.append(key, item));
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  redirect(`/${locale}/program${suffix}`);
}
