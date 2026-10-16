import "server-only";
import { WORKFLOWS, type Workflow } from "@/config/workflows";

/** Default deployment posture. Registration additionally needs private DB evidence. */
export const workflowFlags = Object.freeze(
  Object.fromEntries(WORKFLOWS.map((workflow) => [workflow, false])),
) as Readonly<Record<Workflow, false>>;

export function isWorkflow(value: string): value is Workflow {
  return WORKFLOWS.some((workflow) => workflow === value);
}

export class WorkflowClosedError extends Error {
  readonly code = "WORKFLOW_CLOSED";
  readonly status = 503;

  constructor(readonly workflow: Workflow) {
    super("This workflow is not open.");
    this.name = "WorkflowClosedError";
  }
}

export interface RegistrationGateEvidence {
  participantAccountsReady: boolean;
  enabled: boolean;
  settingsComplete: boolean;
  windowOpen: boolean;
  eligible: boolean;
}

/** Only the server's private database response may supply this evidence. */
export function assertWorkflowOpen(workflow: Workflow, registration?: RegistrationGateEvidence): void {
  if (workflow === "registration" && process.env.REGISTRATION_ENABLED === "true"
    && registration?.participantAccountsReady === true && registration.enabled === true
    && registration.settingsComplete === true && registration.windowOpen === true && registration.eligible === true) return;
  throw new WorkflowClosedError(workflow);
}
