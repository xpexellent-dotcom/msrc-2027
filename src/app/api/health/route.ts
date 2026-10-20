import { createHealthHandler } from "@/lib/monitoring/health.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> { return createHealthHandler({ env: process.env })(); }
