export const COMPETITION_KINDS = ["hackathon", "three_minute_thesis"] as const;
export type CompetitionKind = typeof COMPETITION_KINDS[number];
export const HACKATHON_TRACKS = {
  translating_research: "Translating research into practice",
  advancing_research: "Advancing medical student research",
} as const;
export type HackathonDocument = {
  title: string; pitch: string; participationMode: "solo" | "team"; track: keyof typeof HACKATHON_TRACKS;
  declarations: { newIdea: boolean; notPreviouslyEntered: boolean; notPrizeWinning: boolean; notFunded: boolean; notCommerciallyLaunched: boolean; authorityConfirmed: boolean };
};
export type ThesisDocument = {
  title: string; narrative: string; presenter: string; affiliation: string;
  declarations: { postgraduate: boolean; authorityConfirmed: boolean };
};
export type CompetitionDocument = HackathonDocument | ThesisDocument;
export type CompetitionStage = "entry" | "selection" | "judging" | "final_material" | "membership";
export type CompetitionSettings = {
  stageStates: Record<CompetitionStage, "open" | "closed" | "not_ready">;
  pitchPrompt: string | null; finalistCapPerTrack: number | null; filesReady: boolean;
};
export type CompetitionEntry = {
  id: string; kind: CompetitionKind; status: string; version: number; document: CompetitionDocument;
  roster: { id: string; email: string; isLead: boolean; confirmed: boolean }[];
  files: { id: string; name: string; stage: "supporting" | "final" }[];
  outcome: string | null;
};
export type CompetitionResponse = {
  state: "ready"; settings: Record<CompetitionKind, CompetitionSettings>; entries: CompetitionEntry[]; formToken: string;
  outcome?: string; entryId?: string; fileTransfer?: { fileId: string; url: string; operation: "upload" | "download" };
} | { state: "closed" | "denied" | "area-not-ready" | "unavailable" | "invalid_input" | "limited" };
export const emptyHackathonDocument = (): HackathonDocument => ({ title: "", pitch: "", participationMode: "solo", track: "translating_research",
  declarations: { newIdea: false, notPreviouslyEntered: false, notPrizeWinning: false, notFunded: false, notCommerciallyLaunched: false, authorityConfirmed: false } });
export const emptyThesisDocument = (): ThesisDocument => ({ title: "", narrative: "", presenter: "", affiliation: "", declarations: { postgraduate: false, authorityConfirmed: false } });
