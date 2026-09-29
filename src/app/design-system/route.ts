import { isDesignPreviewAllowed } from "@/lib/preview.server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
  if (!isDesignPreviewAllowed()) return new Response("Not found", { status: 404, headers });
  return new Response(null, { status: 307, headers: { ...headers, Location: new URL("/en/design-system", request.url).href } });
}
