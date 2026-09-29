import { assertWorkflowOpen, isWorkflow, WorkflowClosedError } from "@/lib/workflows.server";

type Context = { params: Promise<{ workflow: string }> };

async function deny(_request: Request, context: Context) {
  const { workflow } = await context.params;
  const headers = { "Cache-Control": "no-store" };
  if (!isWorkflow(workflow)) {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404, headers });
  }

  try {
    assertWorkflowOpen(workflow);
  } catch (error) {
    if (!(error instanceof WorkflowClosedError)) throw error;
    return Response.json(
      { error: { code: error.code, workflow: error.workflow } },
      { status: error.status, headers },
    );
  }
}

// A closed boundary, not an implementation of any operational workflow.
// Never parse/store bodies, make integrations calls, or create participant data.
export { deny as GET, deny as POST, deny as PUT, deny as PATCH, deny as DELETE, deny as OPTIONS, deny as HEAD };
