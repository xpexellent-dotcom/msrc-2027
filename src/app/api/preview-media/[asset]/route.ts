import { readFile } from "node:fs/promises";
import { getLocalPreviewAsset, previewByteRange } from "@/lib/preview-media.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ asset: string }> };
const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" };

async function respond(request: Request, context: Context, head = false) {
  const { asset } = await context.params;
  const media = await getLocalPreviewAsset(asset);
  if (!media) return new Response(null, { status: 404, headers: privateHeaders });
  const range = previewByteRange(request.headers.get("range"), media.size);
  if (!range) return new Response(null, { status: 416, headers: { ...privateHeaders, "Content-Range": `bytes */${media.size}` } });
  const headers: Record<string, string> = {
    ...privateHeaders, "Content-Type": media.contentType, "Accept-Ranges": "bytes",
    "Content-Length": String(range.end - range.start + 1), "X-Content-Type-Options": "nosniff",
  };
  if (range.partial) headers["Content-Range"] = `bytes ${range.start}-${range.end}/${media.size}`;
  try {
    const body = head ? null : new Uint8Array((await readFile(media.file)).subarray(range.start, range.end + 1));
    return new Response(body, { status: range.partial ? 206 : 200, headers });
  } catch {
    return new Response(null, { status: 404, headers: privateHeaders });
  }
}

export async function GET(request: Request, context: Context) { return respond(request, context); }
export async function HEAD(request: Request, context: Context) { return respond(request, context, true); }
