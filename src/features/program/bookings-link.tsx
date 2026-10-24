"use client";
import { useEffect, useState } from "react";
import { Link } from "@/components/ui/link";
import { requestAccount } from "@/features/participant-accounts/participant-client";
import type { Locale } from "@/lib/i18n";

/** Authentication only controls navigation; it never grants booking access. */
export function ProgramBookingsLink({ locale }: { locale: Locale }) {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void requestAccount(undefined, controller.signal).then(({ response }) => {
      if (!controller.signal.aborted) setSignedIn(!!response.profile && response.state === "authenticated");
    });
    return () => controller.abort();
  }, []);
  return signedIn ? <Link href={`/${locale}/my-msrc#my-bookings`}>{locale === "ar" ? "حجوزاتي" : "My Bookings"}</Link> : null;
}
