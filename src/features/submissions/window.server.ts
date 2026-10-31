import "server-only";
import { getParticipantConfig } from "../participant-accounts/config.server";
import { participantReady } from "../registration/handler.server";
import { AbstractRpcMissingError, createAbstractBackend, readAbstractStatus } from "./backend.server";
import { getWindowReader } from "./window-config.server";
import { abstractRecord } from "./validation";
import { decodeSubmissionWindow, publicWindowState, type PublicSubmissionWindow } from "./submission-window";

/** Public projection only; no cookies, identities, configuration or gate details escape. */
export async function readPublicSubmissionWindow(): Promise<PublicSubmissionWindow> {
  const closed: PublicSubmissionWindow = { state: "closed", opensAt: null, closesAt: null };
  const reader = getWindowReader();
  if (!reader) return closed;
  try {
    const data = abstractRecord(await readAbstractStatus(reader)), readiness = getParticipantConfig();
    const deploymentReady = process.env.ABSTRACT_SUBMISSIONS_ENABLED === "true" && readiness.state === "ready" && readiness.config.editionKey === reader.editionKey;
    const window = decodeSubmissionWindow({ ...abstractRecord(data?.window), deploymentReady });
    if (data?.documentVersion !== 2 || !window) return { ...closed, state: "area-not-ready" };
    if (deploymentReady && readiness.state === "ready" && !await participantReady(readiness.config, createAbstractBackend(readiness.config))) window.deploymentReady = false;
    return publicWindowState(window);
  } catch (error) { return { ...closed, state: error instanceof AbstractRpcMissingError ? "area-not-ready" : "closed" }; }
}
