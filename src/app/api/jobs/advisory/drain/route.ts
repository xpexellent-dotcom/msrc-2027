import { createAdvisoryDrainHandler } from "@/lib/jobs/advisory-route.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
const run = (request: Request) => createAdvisoryDrainHandler({ env: process.env })(request);
export const GET = run;
export const POST = run;
export function HEAD(): Response { return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } }); }
