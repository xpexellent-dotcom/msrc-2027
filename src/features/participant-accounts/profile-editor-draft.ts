"use client";

import type { OptionalParticipantProfile } from "./profile-contract";

/** LOC-01: browser memory only; never persistent storage or a server-side draft. */
export type ProfileEditorDraft = {
  owner: string; version: number; institution: string; status: OptionalParticipantProfile["status"];
  year: number | null; interests: string[]; avatar: File | null; removeAvatar: boolean;
};
let draft: ProfileEditorDraft | null = null;
export function readProfileEditorDraft(owner: string) { return typeof window !== "undefined" && draft?.owner === owner ? draft : null; }
export function saveProfileEditorDraft(value: ProfileEditorDraft) { if (typeof window !== "undefined") draft = value; }
export function clearProfileEditorDraft(owner?: string) { if (!owner || draft?.owner === owner) draft = null; }
