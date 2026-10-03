/**
 * BL-PUB-06: no provider is approved. Reject before reading any visitor body.
 * The form, server validator and routing draft cannot enable collection/delivery.
 */
export const dynamic = "force-dynamic";

function contactClosed() {
  return Response.json(
    { state: "closed", code: "CONTACT_CLOSED" },
    { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}

export const GET = contactClosed;
export const POST = contactClosed;
export const PUT = contactClosed;
export const PATCH = contactClosed;
export const DELETE = contactClosed;
export const OPTIONS = contactClosed;

export function HEAD() {
  return new Response(null, {
    status: 503,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
