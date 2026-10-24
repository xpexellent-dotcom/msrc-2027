import "server-only";
import { resolvePublicContentConfig } from "@/features/content/published.server";
import { publicWorkshopProjection } from "./public-contract";

/** Anonymous, uncached safe projection; public browsing never opens booking. */
export async function handlePublicWorkshops(): Promise<Response> {
  const headers = { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" };
  const config = resolvePublicContentConfig(process.env);
  if (!config) return Response.json({ state: "ready", workshops: [] }, { headers });
  try {
    const response = await fetch(config.origin + "/rest/v1/rpc/msrc_workshop_public_read", { method: "POST", headers: { apikey: config.secret, "Content-Type": "application/json" },
      body: JSON.stringify({ edition_key: config.edition }), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3_000) });
    if (!response.ok) { await response.body?.cancel(); return Response.json({ state: "area-not-ready" }, { status: 503, headers }); }
    const raw: unknown = await response.json();
    // Validate the complete public allowlist before forwarding even a safe snapshot.
    if (!publicWorkshopProjection(raw)) return Response.json({ state: "unavailable" }, { status: 503, headers });
    return Response.json(raw, { headers });
  } catch { return Response.json({ state: "unavailable" }, { status: 503, headers }); }
}
