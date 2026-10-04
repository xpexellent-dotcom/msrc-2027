import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isManagedStaffLabBoundary } from "@/features/auth/managed-staff-lab.server";

export const STAFF_COOKIE_EDITION = "synthetic-staff-cookie-2027";

function query(sql: string): Promise<void> {
  if (!isManagedStaffLabBoundary({ environment: process.env, platform: process.platform,
    configuration: readFileSync("supabase/config.toml", "utf8"), linked: existsSync("supabase/.temp/project-ref") })) {
    throw new Error("Disposable managed fixture DDL refuses this runner configuration.");
  }
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "postgres", "-d", "postgres"],
    { stdio: ["pipe", "ignore", "pipe"] });
    let sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Disposable fixture DDL timed out.")); }, 10_000);
    // Preserve the original private SQL diagnostics boundary, including teardown.
    child.stderr.on("data", (chunk: Buffer) => {
      const state = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Disposable fixture DDL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(`Disposable fixture DDL failed (SQLSTATE ${sqlState}); sensitive diagnostics withheld.`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(sql);
  });
}

export default async function setup() {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  // The pinned Supabase image's policy grant checks lock allowlisted auth tables.
  // Commit all fixture DDL before parallel workers seed users and identities;
  // otherwise these unrelated locks can invert their ordinary insertion order.
  await query(`begin;
    create schema msrc_ci_auth;
    revoke all on schema msrc_ci_auth from public,anon,authenticated,service_role;
    grant usage on schema msrc_ci_auth to supabase_auth_admin;
    create function msrc_ci_auth.reject_email(event jsonb) returns jsonb
    language sql security invoker set search_path='' as $$
      select '{"error":{"http_code":403,"message":"Disposable tests disallow email delivery."}}'::jsonb;
    $$;
    revoke all on all functions in schema msrc_ci_auth from public,anon,authenticated,service_role;
    grant execute on all functions in schema msrc_ci_auth to supabase_auth_admin;
    create table public.msrc_ci_staff_cookie_resource(actor_id uuid primary key,label text not null);
    alter table public.msrc_ci_staff_cookie_resource enable row level security;
    alter table public.msrc_ci_staff_cookie_resource force row level security;
    revoke all on public.msrc_ci_staff_cookie_resource from public,anon,authenticated;
    grant select on public.msrc_ci_staff_cookie_resource to authenticated;
    create policy cookie_owner on public.msrc_ci_staff_cookie_resource for select to authenticated
      using(actor_id=(select auth.uid()) and exists(select 1 from jsonb_array_elements(
        (select public.msrc_read_access_context('${STAFF_COOKIE_EDITION}'))->'grants') g where g->>'role'='contentMediaEditor'));
    create policy cookie_second_step on public.msrc_ci_staff_cookie_resource as restrictive for select to authenticated
      using((select public.msrc_second_step_satisfied()));
    notify pgrst,'reload schema';
    commit;`);
  // Teardown also waits for every worker; dropping fixtures must not overlap
  // native Auth activity in another suite.
  return async () => {
    await query(`begin;
      drop table if exists public.msrc_ci_staff_cookie_resource;
      drop schema if exists msrc_ci_auth cascade;
      commit;`);
  };
}
