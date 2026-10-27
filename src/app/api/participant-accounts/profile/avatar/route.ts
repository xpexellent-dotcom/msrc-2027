import { handleParticipantProfileRequest } from "@/features/participant-accounts/profile-handler.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleParticipantProfileRequest;
export function HEAD() { return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } }); }
