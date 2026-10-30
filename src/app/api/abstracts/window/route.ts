import { readPublicSubmissionWindow } from "@/features/submissions/window.server";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await readPublicSubmissionWindow(), { headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", "X-Content-Type-Options": "nosniff" } });
}
