"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { prepareObservabilityEvent } from "@/lib/vercel-observability";

const beforeSend = <Event extends { url: string }>(event: Event) => prepareObservabilityEvent(event, navigator.webdriver);

/** ORG-008: cookieless visitor counts and real-user Core Web Vitals, from Vercel's own origin paths. */
export function VercelObservability() {
  return (
    <>
      <Analytics beforeSend={beforeSend} />
      <SpeedInsights beforeSend={beforeSend} />
    </>
  );
}
