"use client";

import { useSyncExternalStore } from "react";

export type CommitteeView = "both" | "scientific" | "organization";
const changeEvent = "msrc-team-committee-change";

function readView(): CommitteeView {
  const value = new URLSearchParams(window.location.search).get("committee");
  return value === "scientific" || value === "organization" ? value : "both";
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

function setView(view: CommitteeView) {
  const url = new URL(window.location.href);
  if (view === "both") url.searchParams.delete("committee");
  else url.searchParams.set("committee", view);
  // Next's native history integration preserves the filter in language links.
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(changeEvent));
}

const serverView = (): CommitteeView => "both";

export function useCommitteeView() {
  const view = useSyncExternalStore(subscribe, readView, serverView);
  return [view, setView] as const;
}
