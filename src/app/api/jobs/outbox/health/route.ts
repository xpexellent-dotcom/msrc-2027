import { createOutboxHealthHandler } from "@/lib/monitoring/health.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return createOutboxHealthHandler({ env: process.env })(request);
}
