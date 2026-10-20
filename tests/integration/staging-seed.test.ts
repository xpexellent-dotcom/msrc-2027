import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isManagedStaffLabBoundary } from "@/features/auth/managed-staff-lab.server";
import { buildSeedPlan, seedSql } from "../../scripts/staging/seed";

// Separate cold disposable GitHub runner only, after pnpm db:reset and db:env.
// supabase/seed.sql creates foundation_samples only; it does not populate the
// Auth/edition tables whose emptiness the exact seed SQL verifies below.
// Prepare the existing no-delivery managed Auth hook first. Supply the local
// SECRET_KEY from captured `pnpm exec supabase status --output json` privately as
// STAGING_SEED_CI_SECRET. Never print the CLI output or use a hosted key.
// STAGING_SEED_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/staging-seed.test.ts
const enabled = process.env.GITHUB_ACTIONS === "true" && process.env.STAGING_SEED_DB_TESTS === "true";
function boundary() {
  if (!enabled || !isManagedStaffLabBoundary({ environment: process.env, platform: process.platform,
    configuration: readFileSync("supabase/config.toml", "utf8"), linked: existsSync("supabase/.temp/project-ref") })) {
    throw new Error("Staging seed proofs require the isolated no-delivery loopback GitHub runner.");
  }
}
function query(sql: string): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q", "-At",
      "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"], { stdio: ["pipe", "pipe", "ignore"] });
    let output = "";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Seed fixture query timed out.")); }, 15_000);
    child.stdout.on("data", (data: Buffer) => { output += data.toString(); });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Seed fixture SQL unavailable.")); });
    child.on("close", (code) => { clearTimeout(timeout); if (code === 0) resolve(output.trim()); else reject(new Error("Seed fixture SQL refused.")); });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

describe.skipIf(!enabled)("ENG-056 staging seed native/Auth compatibility in disposable CI", () => {
  it("serializes fresh seeds, refuses unfinished credentials, preserves private proofs and keeps every policy closed", async () => {
    boundary();
    const key = process.env.STAGING_SEED_CI_SECRET;
    if (!key || !/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) throw new Error("Captured local CI secret required; no diagnostics emitted.");
    const plan = buildSeedPlan({ participants: 3, earlyAccess: 2, approvers: 1, runId: "ci-seed" }, {
      termsVersion: "v1.0", privacyVersion: "v1.0", earlyOpeningAt: "2026-10-20T12:00:00+03:00",
      generalOpeningAt: "2026-10-20T13:00:00+03:00", closingAt: "2026-10-21T13:00:00+03:00",
      capacity: 2000, placesRemainingThreshold: 50, confirmSeatLeadDays: 1, confirmSeatResponseHours: 24,
    }, { appOrigin: "https://ci-staging.example.invalid", supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co" });
    const competing = await Promise.allSettled([query(seedSql(plan, "native")), query(seedSql(plan, "native"))]);
    expect(competing.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    expect(competing.filter((value) => value.status === "rejected")).toHaveLength(1);
    await expect(query(seedSql(plan, "profiles"))).rejects.toThrow("SQL refused");
    const client = createClient("http://127.0.0.1:54321", key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(url, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(5000) });
      } },
    });
    const passwords = new Map<string, string>();
    for (const person of [...plan.participants, ...plan.staff]) {
      const password = randomBytes(24).toString("hex");
      passwords.set(person.actorId, password);
      const response = await client.auth.admin.updateUserById(person.actorId, { password });
      if (response.error || response.data.user?.id !== person.actorId) throw new Error("Managed fixture password creation failed; diagnostics withheld.");
    }
    const browser = createClient("http://127.0.0.1:54321", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, init) => fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(5000) }) },
    });
    // Isolate the no-active-session guard before any edition/profile exists;
    // a later duplicate-profile refusal would not prove this boundary.
    const occupied = await browser.auth.signInWithPassword({ email: plan.participants[0].email,
      password: passwords.get(plan.participants[0].actorId)! });
    if (occupied.error || occupied.data.user?.id !== plan.participants[0].actorId || !occupied.data.session) {
      throw new Error("Synthetic occupied-session fixture failed; diagnostics withheld.");
    }
    expect(await query("select count(*) from auth.sessions;")).toBe("1");
    await expect(query(seedSql(plan, "profiles"))).rejects.toThrow("SQL refused");
    expect(await query("select count(*) from msrc_authorization.edition_config;")).toBe("0");
    expect(await query("select count(*) from msrc_participant.profiles;")).toBe("0");
    if ((await browser.auth.signOut()).error) throw new Error("Synthetic native sign-out failed; diagnostics withheld.");
    expect(await query("select count(*) from auth.sessions;")).toBe("0");
    expect(await query(seedSql(plan, "profiles"))).toContain("staging-profiles-complete");
    const result = JSON.parse(await query(`select jsonb_build_object(
      'participants',(select count(*) from msrc_participant.profiles),
      'adultProofs',(select count(*) from msrc_participant.profiles p where msrc_participant.age_proven(p.actor_id)),
      'staff',(select count(*) from msrc_staff.profiles),'early',(select count(*) from msrc_registration.early_access_entries),
      'outbox',(select count(*) from msrc_outbox.messages),'requests',(select count(*) from msrc_registration.requests),
      'complete',msrc_registration.settings_complete('staging-ci-seed'),
      'closed',not exists(select 1 from msrc_registration.settings where enabled)
        and not exists(select 1 from msrc_participant.policy where enabled)
        and not exists(select 1 from msrc_staff.policy where enabled)
        and not exists(select 1 from msrc_outbox.settings where delivery_enabled or daily_cap<>0))::text;`));
    expect(result).toEqual({ participants: 3, adultProofs: 3, staff: 3, early: 2, outbox: 0, requests: 0, complete: true, closed: true });
    // Password sign-in proves the seed's actual native credential compatibility.
    // App authority remains closed; this never fabricates an email/TOTP receipt.
    for (const person of [plan.participants[0], plan.staff[2]]) {
      const response = await browser.auth.signInWithPassword({ email: person.email, password: passwords.get(person.actorId)! });
      if (response.error || response.data.user?.id !== person.actorId || !response.data.session) {
        throw new Error("Synthetic native password sign-in failed; diagnostics withheld.");
      }
      const profileRpc = person.actorId === plan.participants[0].actorId ? "msrc_participant_profile" : "msrc_staff_profile";
      const authority = await browser.rpc(profileRpc, { edition_key: plan.editionKey });
      // Valid native credentials must not open application access while the
      // independent policies remain off, nor fabricate session/email receipts.
      expect(authority.error === null).toBe(true);
      expect(authority.data === null).toBe(true);
      if ((await browser.auth.signOut()).error) throw new Error("Synthetic native sign-out failed; diagnostics withheld.");
    }
    passwords.clear();
    await expect(query("begin; set local role authenticated; select * from msrc_registration.early_access_entries; rollback;")).rejects.toThrow("SQL refused");
    await expect(query("begin; set local role anon; select * from msrc_participant.profiles; rollback;")).rejects.toThrow("SQL refused");
    await expect(query(seedSql(plan, "native"))).rejects.toThrow("SQL refused");
    await expect(query(seedSql(plan, "profiles"))).rejects.toThrow("SQL refused");
    expect(await query("select count(*) from auth.users;")).toBe("6");
  }, 60_000);
});
