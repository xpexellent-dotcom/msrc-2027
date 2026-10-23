/** MED-01..04: staff-only metadata; publication is a separate audited transition. */
export type MediaState = "draft" | "published" | "archived";
export type MediaFilter = MediaState | "all";
export type MediaAsset = {
  id: string; filename: string; mime: string; size: number; width: number; height: number;
  altEn: string; altAr: string; captionEn: string; captionAr: string; creditEn: string; creditAr: string;
  focalX: number; focalY: number; rightsConfirmed: boolean; rightsEvidence: string;
  state: MediaState; version: number; previewUrl: string; publicUrl: string | null; busy?: boolean;
  createdAt: string; updatedAt: string;
};
export type MediaFields = Pick<MediaAsset, "altEn" | "altAr" | "captionEn" | "captionAr" | "creditEn" | "creditAr" | "focalX" | "focalY" | "rightsConfirmed" | "rightsEvidence">;
export type MediaTransition = "publish" | "unpublish" | "archive";
export type MediaPayload = (
  | { action: "upload-url"; filename: string; size: number }
  | { action: "complete-upload"; uploadId: string }
  | ({ action: "save"; assetId: string; version: number } & MediaFields)
  | { action: MediaTransition; assetId: string; version: number; operationId: string }
) & { formToken?: string };
export type MediaResponseState = "ready" | "updated" | "area-not-ready" | "denied" | "unavailable" | "conflict" | "invalid" | "alt-required" | "rights-required" | "upload-invalid" | "upload-too-large" | "upload-expired" | "limited" | "busy";
export type MediaResponse = {
  state: MediaResponseState; assets?: MediaAsset[]; total?: number; asset?: MediaAsset; duplicate?: boolean;
  formToken?: string; uploadId?: string; signedUrl?: string; path?: string;
};
