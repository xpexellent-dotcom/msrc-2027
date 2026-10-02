/** AUTH-05, organizer decision 2 October 2026. Nulls remain unresolved release gates. */
export type SessionPolicy = Readonly<{
  participantAbsoluteSeconds: number;
  privilegedIdleSeconds: number;
  privilegedAbsoluteSeconds: number;
  recentAuthMaxAgeSeconds: number | null;
  warningLeadSeconds: number | null;
}>;

export const SESSION_POLICY: SessionPolicy = Object.freeze({
  participantAbsoluteSeconds: 72 * 60 * 60,
  privilegedIdleSeconds: 30 * 60,
  privilegedAbsoluteSeconds: 8 * 60 * 60,
  recentAuthMaxAgeSeconds: null,
  warningLeadSeconds: null,
});
