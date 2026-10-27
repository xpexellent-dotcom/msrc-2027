import { handleParticipantProfileRequest } from "@/features/participant-accounts/profile-handler.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleParticipantProfileRequest;
export const POST = handleParticipantProfileRequest;
export const HEAD = handleParticipantProfileRequest;
