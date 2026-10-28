export const COMPETITION_KINDS = ["hackathon", "three_minute_thesis"] as const;
export type CompetitionKind = typeof COMPETITION_KINDS[number];
export const HACKATHON_TRACKS = {
  translating_research: "Evidence to Impact",
  advancing_research: "Research Reimagined",
} as const;
export const HACKATHON_TRACK_LABELS = {
  translating_research: { en: HACKATHON_TRACKS.translating_research, ar: "من الدليل إلى الأثر" },
  advancing_research: { en: HACKATHON_TRACKS.advancing_research, ar: "البحث برؤية جديدة" },
} as const;
export type HackathonDocument = {
  title: string; pitch: string; participationMode: "solo" | "team"; track: keyof typeof HACKATHON_TRACKS;
  references: string; links: string[];
  declarations: { previouslyPresented: boolean; competitionEntered: boolean; prizeReceived: boolean; fundingReceived: boolean; commercialized: boolean; historyDetails: string; aiUsed: boolean; aiTools: string; teamContributions: string; originalityPermissions: boolean; rulesAcknowledged: boolean; ethicsApplicable: boolean; mediaNoticeAcknowledged: boolean; authorityConfirmed: boolean };
};
export type HackathonProfile = { university: string; fieldOfStudy: string; phone: string; enrolledInSaudiUniversity: boolean; proofFileId?: string | null; proofState?: string | null; complete?: boolean };
export type FinalistWorkspace = { orientationDetails: string | null; timetable: string | null; whatsappSupportUrl: string | null; finalDeckLockAt: string | null; participantInstructions: string | null; confirmed: boolean };
export type ThesisDocument = {
  title: string; narrative: string; presenter: string; affiliation: string;
  declarations: { postgraduate: boolean; authorityConfirmed: boolean };
};
export type CompetitionDocument = HackathonDocument | ThesisDocument;
export type CompetitionStage = "entry" | "selection" | "judging" | "final_material" | "membership";
export type CompetitionSettings = {
  stageStates: Record<CompetitionStage, "open" | "closed" | "not_ready">;
  pitchPrompt: string | null; finalistCapPerTrack: number | null; filesReady: boolean;
  trackLabels?: Record<keyof typeof HACKATHON_TRACKS, { en: string; ar: string }> | null;
  trackDescriptions?: Record<keyof typeof HACKATHON_TRACKS, { en: string; ar: string }> | null;
  applicationDeadline?: string | null;
};
export type CompetitionEntry = {
  id: string; kind: CompetitionKind; status: string; version: number; document: CompetitionDocument;
  isLead?: boolean;
  invitationAccepted?: boolean;
  roster: { id: string; email: string; isLead: boolean; confirmed: boolean }[];
  files: { id: string; name: string; stage: "supporting" | "final" }[];
  outcome: string | null;
  finalistWorkspace?: FinalistWorkspace | null;
};
export type CompetitionResponse = {
  state: "ready"; profileComplete?: boolean; settings: Record<CompetitionKind, CompetitionSettings>; entries: CompetitionEntry[]; formToken: string;
  outcome?: string; entryId?: string; fileTransfer?: { fileId: string; url: string; operation: "upload" | "download" };
  hackathonProfile?: HackathonProfile | null;
} | { state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" | "profile_incomplete" };
export const emptyHackathonDocument = (): HackathonDocument => ({ title: "", pitch: "", participationMode: "solo", track: "translating_research",
  references: "", links: [], declarations: { previouslyPresented: false, competitionEntered: false, prizeReceived: false, fundingReceived: false, commercialized: false, historyDetails: "", aiUsed: false, aiTools: "", teamContributions: "", originalityPermissions: false, rulesAcknowledged: false, ethicsApplicable: false, mediaNoticeAcknowledged: false, authorityConfirmed: false } });
export const emptyHackathonProfile = (): HackathonProfile => ({ university: "", fieldOfStudy: "", phone: "", enrolledInSaudiUniversity: false });
export const emptyThesisDocument = (): ThesisDocument => ({ title: "", narrative: "", presenter: "", affiliation: "", declarations: { postgraduate: false, authorityConfirmed: false } });
