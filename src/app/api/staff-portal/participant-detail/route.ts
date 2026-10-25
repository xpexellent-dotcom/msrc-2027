import { handleParticipantDetailRequest } from "@/features/staff-portal/participant-detail-handler.server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handleParticipantDetailRequest;
export const POST = handleParticipantDetailRequest;
export const OPTIONS = handleParticipantDetailRequest;
