"use client";

import type { MouseEvent } from "react";
import { Link } from "@/components/ui/link";
import { conferenceConfig } from "@/config/conference";
import { datesVenueCopy } from "@/content/dates-venue";
import { formatConferenceDate } from "@/lib/conference-dates";
import type { Locale } from "@/lib/i18n";
import { VenueIcon } from "@/components/venue-icon";

function selectDay(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const destination = new URL(event.currentTarget.href);
  if (destination.pathname !== location.pathname || destination.search === location.search || !document.getElementById("programme")) return;
  // Commit the filter first, so Link's shared anchor handling can move focus and
  // scroll on this page. Cross-page links retain normal router navigation.
  history.pushState(null, "", destination.href);
}

/** Confirmed calendar dates remain configuration-driven; links select the matching day. */
export function ConferenceDayLinks({ locale }: { locale: Locale }) {
  const dates = conferenceConfig.dates;
  const copy = datesVenueCopy[locale];
  if (!dates) return <p>{copy.datesPending}</p>;
  return <ol className="dates-day-list">
    {(["day1", "day2"] as const).map((day) => <li key={day}>
      <Link className="conference-day-link" href={`/${locale}/program?day=${day}#programme`} onClick={selectDay}>
        <span className="conference-day-label">{copy[day]}<VenueIcon name="arrow" /></span>
        <time dateTime={dates[day]}>{formatConferenceDate(dates[day], locale)}</time>
      </Link>
    </li>)}
  </ol>;
}
