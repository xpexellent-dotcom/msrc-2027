import { handleParticipantDetailRequest } from "@/features/staff-portal/participant-detail-handler.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleParticipantDetailRequest;
export function HEAD() { return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } }); }
