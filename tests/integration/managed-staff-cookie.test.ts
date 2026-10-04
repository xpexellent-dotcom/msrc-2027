import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer, request as httpRequest, type Server } from "node:http";
import { createClient, type Session } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createManagedStaffLab, isManagedStaffLabBoundary, MANAGED_STAFF_LAB_COOKIE,
  MANAGED_STAFF_LAB_PATH } from "@/features/auth/managed-staff-lab.server";
import type { StaffEmailStore } from "@/features/auth/staff-email.server";
import { readVerifiedSessionContext } from "@/lib/supabase/session.server";
import { readDeadlockBackends, readDeadlockContext, readDeadlockEdges, readDeadlockPhase, readDeadlockRelations, readEventTriggers } from "./deadlock-diagnostics";

// Real loopback HTTP + native Auth/private SQL. No browser/SMTP/provider credential,
// external inbox, hosted project, real account or operational workflow is involved.
const ci = process.env.GITHUB_ACTIONS === "true";
const edition = "synthetic-staff-cookie-2027";
const actors = Array.from({ length: 18 }, (_, index) => `c1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`);
const email = (id: string) => `cookie-staff-${actors.indexOf(id) + 1}@example.invalid`;
const password = randomBytes(32).toString("hex");
const secret = randomBytes(32).toString("hex");
const nativeSessions = new Map<string, Session>();
const inbox = new Map<string, string>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let deliverFails = false;
let contextFails = false;
let logoutFails = false;
let originFixture: { actorId: string; elapsed: "31 minutes" | "9 hours"; reason: string | null } | null = null;
let server: Server;
let origin = "";
let lab: ReturnType<typeof createManagedStaffLab>;
let active = "";
let activeNative: Session;

function check(condition: unknown, description: string): asserts condition {
  if (!condition) throw new Error(`Managed staff cookie assertion failed: ${description}. Sensitive diagnostics withheld.`);
}
function boundary() {
  check(isManagedStaffLabBoundary({ environment: process.env, platform: process.platform,
    configuration: readFileSync("supabase/config.toml", "utf8"), linked: existsSync("supabase/.temp/project-ref") }),
  "unlinked disposable loopback runner");
}
function query(sql: string, diagnoseDeadlock = true): Promise<string> {
  boundary();
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["exec", "-i", "supabase_db_msrc2027-local", "psql", "-X", "-q",
      "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-U", "postgres", "-d", "postgres", "-At"], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let diagnostics = "";
    let sqlState = "unknown";
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Disposable cookie SQL timed out.")); }, 10_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => {
      diagnostics = (diagnostics + chunk.toString()).slice(-65_536);
      const state = diagnostics.match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:[\s:]|$)/)?.[1];
      if (state) sqlState = state;
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Disposable cookie SQL could not start.")); });
    child.on("close", (code) => { clearTimeout(timeout);
      if (code === 0) { resolve(output.trim()); return; }
      const failure = new Error(`Disposable cookie SQL failed (SQLSTATE ${sqlState}); sensitive diagnostics withheld.`);
      if (sqlState !== "40P01" || !diagnoseDeadlock) { reject(failure); return; }
      const edges = readDeadlockEdges(diagnostics);
      const backend = Number(diagnostics.match(/^MSRC_DIAGNOSTIC_BACKEND ([0-9]{1,10})$/m)?.[1]) || undefined;
      const phase = readDeadlockPhase(diagnostics);
      const context = readDeadlockContext(diagnostics);
      // Only numeric graph edges and allowlisted catalog identifiers are printed.
      // Input SQL and raw provider diagnostics remain in test-process memory.
      const relations = edges.filter((edge) => edge.kind === "relation").map((edge) => edge.resource);
      const processes = edges.map((edge) => edge.process);
      const metadata = edges.length ? query(`select c.oid,n.nspname||'.'||c.relname
        from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where c.oid in (${relations.length ? relations.join(",") : "0"});
        select 'backend|'||pid||'|'||usename||'|'||upper(substring(ltrim(query) from '^[a-zA-Z]+'))
          from pg_catalog.pg_stat_activity where pid in (${processes.join(",")})
          and usename in ('postgres','supabase_auth_admin','authenticator','supabase_admin');
        select 'trigger|'||e.evtname||'|'||n.nspname||'.'||p.proname from pg_catalog.pg_event_trigger e
          join pg_catalog.pg_proc p on p.oid=e.evtfoid join pg_catalog.pg_namespace n on n.oid=p.pronamespace;`, false) : Promise.resolve("");
      void metadata.then((value) => {
        process.stderr.write(`Isolated SQL deadlock graph: ${JSON.stringify({ backend, phase, edges, context,
          relations: readDeadlockRelations(value), backends: readDeadlockBackends(value), triggers: readEventTriggers(value) })}\n`);
      }).catch(() => {
        process.stderr.write(`Isolated SQL deadlock graph: ${JSON.stringify({ backend, phase, edges, context })}\n`);
      }).finally(() => reject(failure));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(`select pg_backend_pid() as msrc_diagnostic_backend \\gset\n\\warn MSRC_DIAGNOSTIC_BACKEND :msrc_diagnostic_backend\n${sql}`);
  });
}
function client() {
  boundary();
  const sdk = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
  });
  sdk.auth.onAuthStateChange((_event, native) => {
    if (native && actors.includes(native.user.id)) nativeSessions.set(native.user.id, native);
  });
  if (logoutFails) sdk.auth.signOut = async () => { throw new Error("Synthetic private provider failure."); };
  if (originFixture) {
    const signIn = sdk.auth.signInWithPassword.bind(sdk.auth);
    sdk.auth.signInWithPassword = async (credentials) => {
      const result = await signIn(credentials);
      const clock = originFixture;
      if (clock && !result.error && result.data.session && result.data.user?.id === clock.actorId) {
        // ONLY disposable fixture: age the genuine native origin before the lab's
        // first observation. The immutable application state guard remains intact.
        await query(`update auth.sessions set created_at=clock_timestamp()-interval '${clock.elapsed}'
          where id='${sid(result.data.session)}';`);
      }
      return result;
    };
  }
  return sdk;
}
function native(id: string): Session {
  const session = nativeSessions.get(id);
  check(session, "native session captured only in test memory");
  return session;
}
function sid(session: Session): string {
  const value: unknown = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8"));
  check(value && typeof value === "object" && "session_id" in value && typeof value.session_id === "string"
    && uuid.test(value.session_id), "native session identifier shape");
  return value.session_id;
}
async function request(action: string, credential?: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  const response = await fetch(`${origin}${MANAGED_STAFF_LAB_PATH}`, { method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...(credential ? { Cookie: credential } : {}), ...headers },
    body: JSON.stringify({ action, ...extra }), signal: AbortSignal.timeout(12_000) });
  return observed(response);
}
async function get(path: "status" | "protected", credential?: string, headers: Record<string, string> = {}) {
  return observed(await fetch(`${origin}${MANAGED_STAFF_LAB_PATH}/${path}`, {
    headers: { ...(credential ? { Cookie: credential } : {}), ...headers }, signal: AbortSignal.timeout(12_000) }));
}
async function literalRequest(action: string, credential: string, headers: Record<string, string>) {
  // Fetch normalizes/ignores hostile Host in this Node version. Native HTTP sends
  // the literal wire headers required to exercise the server's trust boundary.
  const endpoint = new URL(origin);
  const text = JSON.stringify({ action });
  const response = await new Promise<Response>((resolve, reject) => {
    const call = httpRequest({ hostname: "127.0.0.1", port: endpoint.port, path: MANAGED_STAFF_LAB_PATH, method: "POST",
      headers: { Host: endpoint.host, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(text),
        Origin: origin, Cookie: credential, ...headers } }, (message) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      message.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 8192) { message.destroy(); reject(new Error("Managed lab response exceeded its test bound.")); }
        else chunks.push(chunk);
      });
      message.on("error", () => reject(new Error("Managed lab HTTP response failed; diagnostics withheld.")));
      message.on("end", () => {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(message.headers)) {
          if (Array.isArray(value)) for (const item of value) responseHeaders.append(name, item);
          else if (value !== undefined) responseHeaders.set(name, value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: message.statusCode, headers: responseHeaders }));
      });
    });
    call.on("error", () => reject(new Error("Managed lab HTTP request failed; diagnostics withheld.")));
    call.setTimeout(12_000, () => call.destroy());
    call.end(text);
  });
  return observed(response);
}
async function observed(response: Response) {
  const body: unknown = await response.json();
  check(body && typeof body === "object" && !Array.isArray(body) && "state" in body,
    "bounded JSON result without raw diagnostics");
  const result = body as Record<string, unknown>;
  check(!["access_token", "refresh_token", "token", "codeValue", "recipient", "email", "userId", "sessionId", "challengeId"].some((key) => key in result),
    "HTTP body discloses no token, code, address or native identifier");
  check(response.headers.get("cache-control") === "private, no-store, max-age=0"
    && response.headers.get("pragma") === "no-cache" && response.headers.get("expires") === "0", "auth response cannot be cached");
  return { status: response.status, body: result, setCookie: response.headers.get("set-cookie") };
}
async function login(id: string) {
  const response = await request("login", undefined, { email: email(id), password });
  check(response.status === 200 && response.body.state === "pending" && response.setCookie, "password-only cookie is pending");
  const header = response.setCookie;
  check(header.includes("HttpOnly") && header.includes("SameSite=Strict") && header.includes(`Path=${MANAGED_STAFF_LAB_PATH}`)
    && /Max-Age=\d+/.test(header) && !header.includes("Domain="), "opaque path-scoped HTTP-only same-site cookie");
  const credential = header.split(";")[0];
  check(new RegExp(`^${MANAGED_STAFF_LAB_COOKIE}=[0-9a-f]{64}$`).test(credential), "random opaque cookie holds no native bearer");
  return credential;
}
async function issue(credential: string, id: string) {
  const response = await request("issue", credential);
  check(response.status === 200 && response.body.state === "issued", "trusted challenge delivered to in-memory inbox");
  const code = inbox.get(email(id));
  check(code && /^\d{6}$/.test(code), "generated code retained only in test memory");
  inbox.delete(email(id));
  return code;
}
async function verified(id: string) {
  const credential = await login(id);
  const code = await issue(credential, id);
  const response = await request("verify", credential, { code });
  check(response.status === 200 && response.body.state === "verified", "password plus exact-cookie email check");
  return credential;
}
async function directResource(session: Session) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/msrc_ci_staff_cookie_resource?select=label`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${session.access_token}` },
    signal: AbortSignal.timeout(5000),
  });
  const rows: unknown = await response.json();
  const errorCode = rows && typeof rows === "object" && "code" in rows && typeof rows.code === "string"
    && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(rows.code) ? rows.code : "unknown";
  check(response.ok, `direct Data API fixture request (HTTP ${response.status}, SQL/PGRST ${errorCode})`);
  check(Array.isArray(rows), "Data API fixture row contract");
  return rows;
}
async function ageChallenge(id: string, interval = "61 seconds") {
  check(actors.includes(id) && ["61 seconds", "2 minutes"].includes(interval), "fixed accelerated resend fixture");
  await query(`update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '${interval}' where actor_id='${id}';`);
}
async function waitForDataApiFixture() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/msrc_ci_staff_cookie_resource?select=label`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, signal: AbortSignal.timeout(1000),
    });
    const result: unknown = await response.json();
    if (response.status === 401 && result && typeof result === "object" && "code" in result && result.code === "42501") return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  check(false, "test-only table schema cache is ready and anonymous access remains denied");
}

describe.skipIf(!ci)("ORG-015 managed staff HTTP cookies in disposable CI", () => {
  beforeAll(async () => {
    boundary();
    await query(`begin;
      insert into msrc_authorization.edition_config(edition_key) values('${edition}');
      ${actors.map((id, index) => `
        insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,
          created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_anonymous,
          confirmation_token,recovery_token,email_change_token_new,email_change)
        values('${id}','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
          '${email(id)}',extensions.crypt('${password}',extensions.gen_salt('bf')),now(),now(),now(),
          '{"provider":"email","providers":["email"]}','{}',false,'','','','');
        insert into auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at)
        values(gen_random_uuid(),'${id}','${id}',jsonb_build_object('sub','${id}','email','${email(id)}',
          'email_verified',true),'email',now(),now());
        insert into msrc_authorization.account_access(actor_id,state,individually_identified)
        values('${id}','active',true);
        ${index === 14 ? "" : `insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
        values('${id}','${edition}','${index === 15 ? "superAdmin" : "contentMediaEditor"}','edition','Disposable cookie fixture');`}`).join("\n")}
      ${process.env.MSRC_CI_LOCK_DIAGNOSTIC === "true" ? `
      -- Pair with the managed Auth fixture's DDL marker. Identity/grant rows are
      -- held exactly as in ordinary setup; the marker keys never conflict.
      select pg_advisory_xact_lock(20272741,2);
      do $$declare until_at timestamptz:=clock_timestamp()+interval '2 seconds'; begin
        while clock_timestamp()<until_at loop
          exit when exists(select 1 from pg_locks where locktype='advisory'
            and classid=20272741 and objid=1 and granted);
          perform pg_sleep(0.01);
        end loop;
      end$$;` : ""}
      \\warn MSRC_DIAGNOSTIC_PHASE create_table
      create table public.msrc_ci_staff_cookie_resource(actor_id uuid primary key,label text not null);
      \\warn MSRC_DIAGNOSTIC_PHASE enable_rls
      alter table public.msrc_ci_staff_cookie_resource enable row level security;
      \\warn MSRC_DIAGNOSTIC_PHASE force_rls
      alter table public.msrc_ci_staff_cookie_resource force row level security;
      \\warn MSRC_DIAGNOSTIC_PHASE revoke
      revoke all on public.msrc_ci_staff_cookie_resource from public,anon,authenticated;
      \\warn MSRC_DIAGNOSTIC_PHASE grant
      grant select on public.msrc_ci_staff_cookie_resource to authenticated;
      \\warn MSRC_DIAGNOSTIC_PHASE owner_policy
      create policy cookie_owner on public.msrc_ci_staff_cookie_resource for select to authenticated
        using(actor_id=(select auth.uid()) and exists(select 1 from jsonb_array_elements(
          (select public.msrc_read_access_context('${edition}'))->'grants') g where g->>'role'='contentMediaEditor'));
      \\warn MSRC_DIAGNOSTIC_PHASE second_policy
      create policy cookie_second_step on public.msrc_ci_staff_cookie_resource as restrictive for select to authenticated
        using((select public.msrc_second_step_satisfied()));
      \\warn MSRC_DIAGNOSTIC_PHASE insert_resource
      insert into public.msrc_ci_staff_cookie_resource values
        ${actors.map((id) => `('${id}','Synthetic private cookie resource')`).join(",\n")};
      \\warn MSRC_DIAGNOSTIC_PHASE notify
      notify pgrst,'reload schema';
      \\warn MSRC_DIAGNOSTIC_PHASE commit
      commit;`);
    await waitForDataApiFixture();
    const bound = (input: { actorId: string; sessionId: string; challengeId: string }) => {
      check(actors.includes(input.actorId) && uuid.test(input.sessionId) && uuid.test(input.challengeId), "fixed service binding");
      return `'${input.actorId}','${input.sessionId}','${input.challengeId}'`;
    };
    const hash = (value: string) => { check(/^[a-f0-9]{64}$/.test(value), "service-only keyed digest shape"); return `'${value}'`; };
    const service = async (name: string, parameters: string): Promise<unknown> => JSON.parse(await query(`begin;
      set local role service_role; select public.${name}(${parameters}); commit;`));
    const store: StaffEmailStore = {
      begin: (input) => service("msrc_staff_email_begin", `${bound(input)},${hash(input.codeHash)},${hash(input.ipHash)}`),
      delivery: (input) => service("msrc_staff_email_delivery", `${bound(input)},${input.delivered === true}`),
      consume: (input) => service("msrc_staff_email_consume", `${bound(input)},${hash(input.codeHash)}`),
    };
    server = createServer((req, res) => { if (!lab) { res.writeHead(503); res.end(); } else void lab.handle(req, res); });
    server.requestTimeout = 5000;
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address();
    check(address && typeof address === "object", "loopback HTTP listener");
    origin = `http://127.0.0.1:${address.port}`;
    lab = createManagedStaffLab({ origin, editionKey: edition, allowedEmails: actors.map(email), client, store, secret,
      context: async (token, scope) => {
        if (contextFails) return { state: "unavailable" };
        const result = await readVerifiedSessionContext(token, scope);
        if (originFixture && result.state === "verified") originFixture.reason = result.context.reason;
        return result;
      },
      deliver: async (message) => {
        check(actors.map(email).includes(message.recipient) && message.language === "en"
          && message.subject === "MSRC 2027 staff sign-in code", "current verified synthetic English-only recipient");
        if (deliverFails) return false;
        const code = message.text.match(/code is (\d{6})\./)?.[1];
        check(code, "one generated in-memory email code");
        inbox.set(message.recipient, code);
        return true;
      },
    });
  }, 30_000);

  afterAll(async () => {
    lab?.close();
    inbox.clear(); nativeSessions.clear();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    if (ci && lab) await query("drop table if exists public.msrc_ci_staff_cookie_resource;");
  });

  it("denies password-only HTTP and direct Data API access, then permits one exact-session single-use email check at AAL1", async () => {
    active = await login(actors[0]);
    activeNative = native(actors[0]);
    check((await get("protected", active)).status === 403, "password-only lab resource denied");
    check((await directResource(activeNative)).length === 0, "owner RLS alone cannot bypass private email check");
    const code = await issue(active, actors[0]);
    const wrong = code === "000000" ? "000001" : "000000";
    check((await request("verify", active, { code: wrong })).status === 403, "incorrect code denied");
    const attempts = await Promise.all([request("verify", active, { code }), request("verify", active, { code })]);
    check(attempts.filter((result) => result.status === 200 && result.body.state === "verified").length === 1
      && attempts.filter((result) => result.status === 403).length === 1, "exactly one concurrent consumption wins");
    check((await request("verify", active, { code })).status === 403, "successful code cannot replay");
    const allowed = await get("protected", active);
    check(allowed.status === 200 && allowed.body.resource === "Synthetic staff lab resource"
      && allowed.body.operationalAccessReady === false && allowed.body.privilegedAccessReady === false, "only lab resource opens");
    check((await directResource(activeNative)).length === 1, "same native AAL1 session receives its own synthetic protected row");
    const own = await readVerifiedSessionContext(activeNative.access_token, edition);
    check(own.state === "verified" && own.context.staffEmailValid && !own.context.mfaValid, "email check never becomes managed MFA");
  });

  it("rejects missing, forged and duplicated cookies and cross-origin/host/proxy requests before sending", async () => {
    check((await get("protected")).status === 403, "missing cookie denied");
    check((await get("protected", `${MANAGED_STAFF_LAB_COOKIE}=${"0".repeat(64)}`)).status === 403, "forged opaque cookie denied");
    check((await get("protected", `${active}; ${active}`)).status === 403, "duplicate cookies denied");
    const rejectedHeaders: Record<string, string>[] = [{ Origin: "https://foreign.invalid" }, { Origin: "" }, { "Sec-Fetch-Site": "cross-site" },
      { Host: "localhost:9999" }, { "X-Forwarded-For": "127.0.0.1" }, { "X-Forwarded-Host": origin.slice(7) },
      { "X-Forwarded-Proto": "http" }, { Forwarded: "for=127.0.0.1" }, { Authorization: "Bearer invalid" }];
    const pending = await login(actors[17]);
    for (const headers of rejectedHeaders) {
      const result = await literalRequest("issue", pending, headers);
      check(result.status === 403, `origin/host/header spoof denied (HTTP ${result.status}, header ${Object.keys(headers)[0]})`);
    }
    check(inbox.size === 0 && (await get("protected", active)).status === 200, "CSRF cannot replace codes or log out owner");
  });

  it("binds delivered proof to the exact cookie/native session across simultaneous password logins", async () => {
    const first = await login(actors[1]);
    const firstNative = native(actors[1]);
    const second = await login(actors[1]);
    check(first !== second && sid(firstNative) !== sid(native(actors[1])), "new password login creates a different cookie/native origin");
    const concurrent = await Promise.all([request("issue", first), request("issue", first)]);
    check(concurrent.filter((value) => value.body.state === "issued").length === 1
      && concurrent.filter((value) => value.body.code === "RETRY_LIMITED").length === 1, "concurrent issue retains cooldown");
    const code = inbox.get(email(actors[1]));
    check(code, "first exact-session code in memory"); inbox.delete(email(actors[1]));
    check((await request("verify", second, { code })).status === 403, "second session cannot consume owner's challenge");
    check((await request("verify", first, { code })).status === 200, "foreign session does not consume owner proof");
    check((await get("protected", first)).status === 200 && (await get("protected", second)).status === 403,
      "verification is neither account-wide nor a cookie UI flag");
    check((await directResource(firstNative)).length === 1 && (await directResource(native(actors[1]))).length === 0,
      "direct reads enforce the same exact native session receipt as opaque cookies");
  });

  it("preserves native origin, idle deadline and receipt through refresh without resetting cookie lifetime", async () => {
    const before = await get("status", active);
    const refreshed = await request("refresh", active);
    check(refreshed.status === 200 && refreshed.body.state === "verified" && refreshed.setCookie
      && refreshed.setCookie.split(";")[0] === active, "refresh retains only the exact opaque session");
    for (const key of ["startedAtMs", "absoluteExpiresAtMs", "lastActivityAtMs", "idleExpiresAtMs"])
      check(refreshed.body[key] === before.body[key], "refresh cannot reset original session clocks");
    const age = Number(refreshed.setCookie.match(/Max-Age=(\d+)/)?.[1]);
    check(age > 0 && age <= 8 * 3600
      && age <= Math.floor(((before.body.absoluteExpiresAtMs as number) - Date.now()) / 1000) + 1, "cookie receives remaining absolute time only");
    const fresh = await login(actors[0]);
    check((await get("protected", fresh)).status === 403 && (await get("protected", active)).status === 200,
      "new password session needs fresh email check; existing receipt stays exact-session");
    check((await directResource(native(actors[0]))).length === 0,
      "new password login cannot reuse old email proof through direct Data API");
    check((await request("issue", fresh)).body.code === "RETRY_LIMITED", "fresh login cannot reset account resend bound");
  });

  it("enforces five failed HTTP code entries and account cooldown across a new login", async () => {
    const credential = await login(actors[2]);
    const code = await issue(credential, actors[2]);
    const wrong = code === "000000" ? "000001" : "000000";
    for (let count = 0; count < 5; count++) check((await request("verify", credential, { code: wrong })).status === 403, "incorrect HTTP entry denied");
    check((await request("verify", credential, { code })).status === 403, "correct entry cannot bypass cooldown");
    const another = await login(actors[2]);
    check((await request("issue", another)).body.code === "RETRY_LIMITED", "new cookie cannot reset account abuse state");
  });

  it("denies an expired emailed code through HTTP without creating a receipt", async () => {
    const credential = await login(actors[3]);
    const code = await issue(credential, actors[3]);
    await query(`update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '20 minutes',
      expires_at=clock_timestamp()-interval '10 minutes' where actor_id='${actors[3]}';`);
    check((await request("verify", credential, { code })).status === 403 && (await get("protected", credential)).status === 403,
      "accelerated fixture expiry cannot authorize");
  });

  it("enforces resend/three-send limits and rejects replaced codes through the same cookie", async () => {
    const credential = await login(actors[4]);
    const first = await issue(credential, actors[4]);
    check((await request("issue", credential)).body.code === "RETRY_LIMITED", "60-second resend spacing");
    await ageChallenge(actors[4], "2 minutes");
    const second = await issue(credential, actors[4]);
    await ageChallenge(actors[4]);
    const third = await issue(credential, actors[4]);
    await ageChallenge(actors[4]);
    check((await request("issue", credential)).body.code === "RETRY_LIMITED", "three issuance reservations per account/window");
    // Chance collisions must not turn a superseded value into a false negative test.
    if (first !== third) check((await request("verify", credential, { code: first })).status === 403, "first replaced code denied");
    if (second !== third) check((await request("verify", credential, { code: second })).status === 403, "second replaced code denied");
    check((await request("verify", credential, { code: third })).status === 200, "newest challenge alone can authorize");
    const rows = await query(`select count(*) from msrc_staff_email.challenges where actor_id='${actors[4]}' and state='superseded';`);
    check(rows === "2", "both earlier challenge identities are invalidated even if decimal codes coincide");
  });

  it("fails closed on delivery failure and recovers with a replacement after the approved cooldown", async () => {
    const credential = await login(actors[5]);
    deliverFails = true;
    try { check((await request("issue", credential)).status === 503, "failed delivery returns safe unavailable"); }
    finally { deliverFails = false; }
    check((await get("protected", credential)).status === 403 && !inbox.has(email(actors[5])), "failure never supplies assurance");
    await ageChallenge(actors[5]);
    const code = await issue(credential, actors[5]);
    check((await request("verify", credential, { code })).status === 200, "fresh delivered replacement recovers");
  });

  it("revokes native logout and clears the cookie; replay cannot refresh or read", async () => {
    const credential = await verified(actors[6]);
    const old = native(actors[6]);
    check((await directResource(old)).length === 1, "current exact-session receipt permits own row before logout");
    const logout = await request("logout", credential);
    check(logout.status === 200 && logout.body.state === "logged_out" && logout.setCookie?.includes("Max-Age=0"), "native logout plus cookie deletion");
    check((await get("protected", credential)).status === 403 && (await request("refresh", credential)).status === 403,
      "replayed cookie does not restore memory or refresh");
    const refresh = await client().auth.refreshSession({ refresh_token: old.refresh_token });
    check(Boolean(refresh.error) && !refresh.data.session, "native refresh token is revoked too");
    check((await directResource(old)).length === 0, "old signed bearer cannot bypass native logout through direct Data API");
  });

  it("clears local proof and reports unavailable if native logout fails after database session revocation", async () => {
    const credential = await verified(actors[16]);
    const old = native(actors[16]);
    check((await directResource(old)).length === 1, "current receipt permits own row before partial logout");
    logoutFails = true;
    try {
      const response = await request("logout", credential);
      check(response.status === 503 && response.body.state === "unavailable" && response.setCookie?.includes("Max-Age=0"),
        "partial provider failure does not claim complete native logout");
    } finally { logoutFails = false; }
    check((await get("protected", credential)).status === 403, "partial logout clears opaque-cookie proof");
    const revoked = await readVerifiedSessionContext(old.access_token, edition);
    check(revoked.state === "verified" && revoked.context.reason === "session_revoked" && !revoked.context.sessionPolicySatisfied,
      "database state independently revokes stale bearer when provider logout fails");
    check((await directResource(old)).length === 0, "database revocation denies direct reads despite native logout failure");
  });

  it("fails closed on an assurance outage and recovers without treating unconfirmed verification as access", async () => {
    contextFails = true;
    try {
      for (const response of [await get("protected", active), await request("issue", active), await request("refresh", active)])
        check(response.status === 503 && response.body.state === "unavailable", "assurance outage returns safe unavailable");
    } finally { contextFails = false; }
    check((await get("protected", active)).status === 200 && inbox.size === 0, "current database proof allows safe recovery after outage");
  });

  it("denies cookie access and refresh after account suspension and refuses restoration of old proof", async () => {
    const credential = await verified(actors[7]);
    const oldNative = native(actors[7]);
    check((await directResource(oldNative)).length === 1, "active verified staff can read own row before suspension");
    await query(`update msrc_authorization.account_access set state='suspended' where actor_id='${actors[7]}';`);
    check((await get("protected", credential)).status === 403 && (await request("refresh", credential)).status === 403, "suspended exact session denied");
    check((await directResource(oldNative)).length === 0, "suspended account cannot read with its signed old bearer");
    await query(`update msrc_authorization.account_access set state='active' where actor_id='${actors[7]}';`);
    check((await get("protected", credential)).status === 403, "reactivation cannot revive pre-suspension session");
    check((await directResource(oldNative)).length === 0, "reactivation cannot restore old proof through direct Data API");
  });

  it("invalidates cookie assurance after verified-email and ordinary role changes", async () => {
    const changedEmail = await verified(actors[8]);
    const emailNative = native(actors[8]);
    check((await directResource(emailNative)).length === 1, "current verified email receipt permits own row before destination change");
    await query(`update auth.users set email='cookie-changed@example.invalid',email_confirmed_at=clock_timestamp() where id='${actors[8]}';`);
    check((await get("protected", changedEmail)).status === 403, "old receipt cannot approve a changed verified destination");
    check((await directResource(emailNative)).length === 0, "changed verified email invalidates old bearer proof in RLS");
    const changedRole = await verified(actors[9]);
    const roleNative = native(actors[9]);
    check((await directResource(roleNative)).length === 1, "current ordinary grant and receipt permit own row before revocation");
    await query(`update msrc_authorization.role_grants set state='revoked',revoked_at=clock_timestamp(),
      revocation_reason='Disposable cookie revocation' where actor_id='${actors[9]}' and edition_key='${edition}';`);
    check((await get("protected", changedRole)).status === 403 && (await request("issue", changedRole)).status === 403,
      "loss of staff role cannot become staff lab access");
    check((await directResource(roleNative)).length === 0, "revoked ordinary grant denies direct read under old bearer");
  });

  it("refuses cookie issuance for idle and absolute expiry after pre-observation native-clock fixtures", async () => {
    for (const [id, interval, reason] of [[actors[10], "31 minutes", "idle_expired"], [actors[11], "9 hours", "absolute_expired"]] as const) {
      originFixture = { actorId: id, elapsed: interval, reason: null };
      try {
        const response = await request("login", undefined, { email: email(id), password });
        check(response.status === 403 && !response.setCookie && originFixture.reason === reason,
          "actual native expiry is evaluated before any opaque cookie is issued");
        const own = native(id);
        const refresh = await client().auth.refreshSession({ refresh_token: own.refresh_token });
        check(Boolean(refresh.error) && !refresh.data.session, "denied aged native login is signed out and cannot refresh");
      } finally { originFixture = null; }
    }
  });

  it("rejects participant and Super Admin entry without altering their distinct requirements", async () => {
    for (const id of [actors[14], actors[15]]) {
      const result = await request("login", undefined, { email: email(id), password });
      check(result.status === 403 && !result.setCookie && !inbox.has(email(id)), "only regular staff can enter this lab");
    }
    check((await get("protected", active)).status === 200, "tier rejection does not change ordinary staff session");
  });

  it("rejects oversized, malformed and extra input fields without performing delivery", async () => {
    check((await request("issue", active, { recipient: "other@example.invalid" })).status === 400, "client recipient cannot select delivery");
    check((await request("verify", active, { code: "12x456" })).status === 400, "malformed code input denied");
    check((await request("verify", active, { code: "123456\n" })).status === 400, "code trailing newline is not six digits");
    check((await request("login", undefined, { email: email(actors[0]), password, padded: "x".repeat(2048) })).status === 400,
      "body byte bound enforced before credentials");
    check((await request("login", undefined, { email: "unknown@example.invalid", password })).status === 403,
      "unknown synthetic account gets same generic denial");
    check((await request("login", undefined, { email: email(actors[0]), password: "incorrect-password" })).status === 403,
      "wrong password gets generic denial with no cookie");
    check(inbox.size === 0, "invalid requests send no codes");
  });

  it("enforces rolling daily issuance and trusted-socket IP limits at the HTTP/database boundary", async () => {
    const dailyId = actors[12];
    const daily = await login(dailyId);
    // Test-only historical reservations accelerate rolling-window boundaries;
    // neither native policy nor the code generator is reconfigured.
    const ipHash = createHmac("sha256", Buffer.from(secret, "hex")).update("ip:127.0.0.1").digest("hex");
    const anotherIpHash = "b".repeat(64);
    const insert = (id: string, ip: string, index: number) => `insert into msrc_staff_email.challenges(id,actor_id,session_id,code_hash,ip_hash,
      binding,created_at,expires_at,state) values('${randomUUID()}','${id}','${sid(native(id))}','${"a".repeat(64)}','${ip}',
      '${"c".repeat(64)}',clock_timestamp()-interval '${index + 20} minutes',clock_timestamp()-interval '${index + 15} minutes','failed');`;
    await query(Array.from({ length: 10 }, (_, index) => insert(dailyId, anotherIpHash, index)).join("\n"));
    check((await request("issue", daily)).body.code === "RETRY_LIMITED", "ten reservations per account/rolling day cannot be bypassed");
    const ipId = actors[13];
    const ip = await login(ipId);
    await login(actors[16]); await login(actors[17]);
    await query([actors[16], actors[17]].flatMap((id) => Array.from({ length: 10 }, (_, index) => insert(id, ipHash, index))).join("\n"));
    check((await request("issue", ip)).body.code === "RETRY_LIMITED", "trusted socket IP issuance cap denied");
    check(!inbox.has(email(dailyId)) && !inbox.has(email(ipId)), "quota denial causes no delivery");
    const storage = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/synthetic-closed/no-object`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, Authorization: `Bearer ${activeNative.access_token}` },
      signal: AbortSignal.timeout(5000),
    });
    check([404, 503].includes(storage.status), "Storage is unavailable; no private-object policy proof claimed");
  });
});
