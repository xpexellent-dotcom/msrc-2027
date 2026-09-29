import "server-only";
import { WORKFLOWS, type Workflow } from "@/config/workflows";

/** S1 REL-01..06: no request, role claim or environment value can open M1. */
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

export function assertWorkflowOpen(workflow: Workflow): never {
  // Intentionally closed even if a later edit accidentally changes a flag.
  // Opening any real workflow requires its own reviewed authorization and gate.
  throw new WorkflowClosedError(workflow);
}
