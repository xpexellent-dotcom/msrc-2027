import { conferenceCalendar } from "@/lib/calendar";
import { isLocale, locales } from "@/lib/i18n";

// Built once per language at deploy time; nothing here reads the request.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const calendar = isLocale(locale) ? conferenceCalendar(locale) : null;
  if (!calendar) return new Response("Not found", { status: 404 });
  return new Response(calendar, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="msrc-2027.ics"',
      "X-Robots-Tag": "noindex",
    },
  });
}
