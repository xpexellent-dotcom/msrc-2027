import { beforeAll, describe, expect, it } from "vitest";
import { createServerDataClient } from "@/lib/supabase/server";

describe("AUTH-04/05 session Data API boundary on isolated loopback CI", () => {
  beforeAll(() => {
    const configured = createServerDataClient("local");
    if (!configured) throw new Error("Session integration requires the isolated loopback Supabase stack.");
  });

  for (const name of ["msrc_session_context", "msrc_session_activity", "msrc_session_logout"] as const) {
    it(`denies anonymous ${name} without creating session or audit rows`, async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: "POST", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          "Content-Type": "application/json" }, body: JSON.stringify({ edition_key: "synthetic-2027" }),
        signal: AbortSignal.timeout(5_000),
      });
      expect(response.status).toBe(401);
      expect((await response.json()).code).toBe("42501");
    });
  }
  it("never exposes the private session schema through PostgREST", async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/session_state?select=*`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "Accept-Profile": "msrc_sessions" },
      signal: AbortSignal.timeout(5_000),
    });
    expect(response.status).toBe(406);
    expect((await response.json()).code).toBe("PGRST106");
  });
});
