export function GET() {
  // Process health only: this does not certify database or production readiness.
  return Response.json(
    { status: "ok", scope: "static-foundation", workflows: "closed" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
