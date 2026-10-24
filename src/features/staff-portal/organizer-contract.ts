/** ENG-079 / ADM-01..04: server-authorized organizer projections only. */
export const ORGANIZER_MODULES = ["registrations", "accounts", "orders", "submissions", "reviews", "accepted", "workshops", "attendance", "certificates", "announcements", "hackathon", "three_minute_thesis", "email_failures"] as const;
/** Only modules backed by an existing immutable audit source are selectable. */
export const ORGANIZER_AUDIT_MODULES = ["security", "authorization", "sessions", "staff_email", "participant", "participant_retention", "registrations", "registration_settings", "attendance", "media", "content", "site_import", "submissions", "announcements", "announcement_retention", "announcement_delivery", "identity_retention", "workshops", "certificates", "hackathon", "three_minute_thesis", "competitions", "reporting"] as const;
export type OrganizerCell = { module: string; dimension: string; value: string; count: number | null };
export type OrganizerDashboardData = { cells: OrganizerCell[]; modules: string[]; suppressionThreshold: 5 };
export type OrganizerMatch = { actorId: string; name: string; email: string; records: { module: string; reference: string; status: string }[] };
export type OrganizerAuditEvent = { id: string; module: string; actorId: string | null; targetId: string | null; action: string; result: string; at: string; details: Record<string, unknown> };
export type OrganizerExportKind = "aggregate" | "operational" | "personal";
export type OrganizerPayload = { action: "dashboard" | "find" | "export" | "audit"; formToken?: string; query?: string; module?: string; kind?: OrganizerExportKind; status?: string; actor?: string; event?: string; from?: string; to?: string; offset?: number };
export type OrganizerResponse = { state: string; formToken?: string; dashboard?: OrganizerDashboardData; matches?: OrganizerMatch[]; events?: OrganizerAuditEvent[]; hasMore?: boolean };
