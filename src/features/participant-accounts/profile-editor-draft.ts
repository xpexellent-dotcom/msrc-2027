"use client";

import type { OptionalParticipantProfile } from "./profile-contract";

/** LOC-01: browser memory only. Contact, identity and birth data never enter this draft. */
export type ProfileEditorDraft = {
  owner: string; version: number; institutionId: string | null; institutionOther: string; status: OptionalParticipantProfile["status"];
  interests: string[]; avatar: File | null; removeAvatar: boolean;
};
let draft: ProfileEditorDraft | null = null;
export function readProfileEditorDraft(owner: string) { return typeof window !== "undefined" && draft?.owner === owner ? draft : null; }
export function saveProfileEditorDraft(value: ProfileEditorDraft) { if (typeof window !== "undefined") draft = { owner: value.owner, version: value.version,
  institutionId: value.institutionId, institutionOther: value.institutionOther, status: value.status,
  interests: [...value.interests], avatar: value.avatar, removeAvatar: value.removeAvatar }; }
export function clearProfileEditorDraft(owner?: string) { if (!owner || draft?.owner === owner) draft = null; }
