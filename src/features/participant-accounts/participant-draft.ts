"use client";

import { useSyncExternalStore } from "react";
import type { ParticipantResponse, ParticipantState } from "./contracts";
import { participantScreens } from "./participant-copy";

export type ParticipantDraft = Readonly<{
  name: string;
  email: string;
  password: string;
  code: string;
  requestId: string | null;
  purpose: "verification" | "recovery";
  outcome: ParticipantState | null;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  pending: boolean;
  outcomeSequence: number;
  fieldErrors: ParticipantResponse["fieldErrors"];
}>;
const emptyDraft: ParticipantDraft = { name: "", email: "", password: "", code: "", requestId: null, purpose: "verification", outcome: null, expiresAt: null, resendAvailableAt: null, pending: false, outcomeSequence: 0, fieldErrors: {} };
let draft: ParticipantDraft = emptyDraft;
let generation = 0;
const listeners = new Set<() => void>();
let watchingPageExit = false;

// LOC-01: retain unsaved input only within this document's memory. A locale
// navigation reuses the module; a page exit clears credentials, including BFCache.
export function updateParticipantDraft(next: Partial<ParticipantDraft>) {
  draft = { ...draft, ...next };
  for (const listener of listeners) listener();
}
export function clearParticipantDraft() { generation += 1; updateParticipantDraft(emptyDraft); }
export function clearParticipantCredentials() { updateParticipantDraft({ password: "", code: "" }); }
export function beginParticipantAction() {
  if (draft.pending) return null;
  generation += 1;
  updateParticipantDraft({ pending: true, outcome: null, fieldErrors: {} });
  return generation;
}
export function finishParticipantAction(requestGeneration: number, next: Partial<ParticipantDraft>) {
  // A completed request cannot restore credentials after the document has exited.
  if (requestGeneration !== generation || !draft.pending) return false;
  updateParticipantDraft({ ...next, pending: false, outcomeSequence: draft.outcomeSequence + 1 });
  return true;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!watchingPageExit) {
    window.addEventListener("pagehide", clearParticipantDraft);
    watchingPageExit = true;
  }
  return () => {
    listeners.delete(listener);
    // Also clear a soft navigation into the public site. Account and locale
    // transitions remain in this flow, so they keep the transient draft.
    queueMicrotask(() => {
      const screen = window.location.pathname.split("/")[2];
      if (listeners.size === 0 && !participantScreens.some((accountScreen) => accountScreen === screen)) clearParticipantDraft();
    });
  };
}
const snapshot = () => draft;
const serverSnapshot = () => emptyDraft;
export function useParticipantDraft() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

export function normalizeParticipantCode(value: string) {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}
