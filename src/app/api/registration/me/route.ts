import { handleMyRegistration } from "@/features/registration/my-registration-handler.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handleMyRegistration;
export const POST = handleMyRegistration;
