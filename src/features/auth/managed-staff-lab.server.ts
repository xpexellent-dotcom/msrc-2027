import "server-only";

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveLocalSupabaseConfig } from "@/lib/supabase/config";
import { readVerifiedSessionContext, type PersistedSessionContext } from "@/lib/supabase/session.server";
import { createStaffEmailCheck, type StaffEmailDelivery, type StaffEmailStore } from "./staff-email.server";

export const MANAGED_STAFF_LAB_PATH = "/api/managed-staff-lab";
export const MANAGED_STAFF_LAB_COOKIE = "msrc-managed-staff-lab";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const opaque = /^[0-9a-f]{64}$/;
const maxSessions = 64; // Disposable lab capacity, not an approved production policy.
const safeHeaders = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache",
  Expires: "0", "X-Robots-Tag": "noindex, nofollow, noarchive", "Content-Type": "application/json; charset=utf-8" };

type SessionRecord = { accessToken: string; refreshToken: string; actorId: string; sessionId: string;
  origin: number; absoluteEnd: number; challengeId: string | null; queue: Promise<void> };
type Boundary = Readonly<{ environment: Readonly<Record<string, string | undefined>>; platform: string;
  configuration: string; linked: boolean }>;
type Result = Readonly<{ state: "pending" | "issued" | "verified" | "logged_out" | "denied" | "unavailable";
  code?: "NOT_AUTHORIZED" | "RETRY_LIMITED"; expiresAt?: string; startedAtMs?: number;
  absoluteExpiresAtMs?: number; lastActivityAtMs?: number; idleExpiresAtMs?: number | null;
  operationalAccessReady?: false; privilegedAccessReady?: false; resource?: "Synthetic staff lab resource" }>;

/** Pure guard for boundary regression checks. The factory always supplies real host state. */
export function isManagedStaffLabBoundary(input: Boundary): boolean {
  const env = input.environment;
  try {
    return env.GITHUB_ACTIONS === "true" && input.platform === "linux"
      && env.RUNNER_ENVIRONMENT === "github-hosted" && env.GITHUB_REPOSITORY === "xpexellent-dotcom/msrc-2027"
      && !["VERCEL", "VERCEL_ENV", "VERCEL_TARGET_ENV", "VERCEL_URL", "NEXT_PUBLIC_VERCEL_ENV"].some((name) => env[name] !== undefined)
      && !env.SUPABASE_PROJECT_REF && !env.SUPABASE_PROJECT_ID && !input.linked
      && (!env.NEXT_PUBLIC_SUPABASE_TARGET || env.NEXT_PUBLIC_SUPABASE_TARGET === "local")
      && env.NEXT_PUBLIC_SUPABASE_URL === "http://127.0.0.1:54321"
      && Boolean(resolveLocalSupabaseConfig({ url: env.NEXT_PUBLIC_SUPABASE_URL,
        publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }))
      && /^project_id = "msrc2027-local"$/m.test(input.configuration)
      && /^enable_signup = false$/m.test(input.configuration.split("[auth]")[1]?.split("[auth.email]")[0] ?? "")
      && input.configuration.includes('uri = "pg-functions://postgres/msrc_ci_auth/reject_email"')
      && /\[auth\.hook\.send_email\]\r?\nenabled = true/.test(input.configuration)
      && /\[storage\]\r?\nenabled = false/.test(input.configuration)
      && !/\[auth\.(sms|mfa\.phone|hook\.send_sms)(?:\.|\])/.test(input.configuration)
      && !Object.keys(env).some((name) => /^(SUPABASE_AUTH_(SMS_|MFA_|HOOK_|EMAIL_SMTP_|ENABLE_SIGNUP$)|GOTRUE_(SMS_|MFA_|HOOK_|SMTP_|EXTERNAL_|DISABLE_SIGNUP$))/.test(name) && env[name]);
  } catch { return false; }
}

function boundary(): boolean {
  try { return isManagedStaffLabBoundary({ environment: process.env, platform: process.platform,
    configuration: readFileSync("supabase/config.toml", "utf8"), linked: existsSync("supabase/.temp/project-ref") }); }
  catch { return false; }
}

function sessionCookie(header: string | undefined): string | null {
  if (!header || header.length > 4096) return null;
  const matches = header.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${MANAGED_STAFF_LAB_COOKIE}=`));
  if (matches.length !== 1) return null;
  const value = matches[0].slice(MANAGED_STAFF_LAB_COOKIE.length + 1);
  return value.length === 64 && opaque.test(value) ? value : null;
}

function cookie(value: string, absoluteEnd: number): string {
  // Secure is deliberately absent only on this CI-only loopback HTTP listener.
  // Max-Age is remaining lifetime: refreshing cannot restart the native clock.
  return `${MANAGED_STAFF_LAB_COOKIE}=${value}; Path=${MANAGED_STAFF_LAB_PATH}; HttpOnly; SameSite=Strict; Max-Age=${Math.max(0, Math.floor((absoluteEnd - Date.now()) / 1000))}; Expires=${new Date(absoluteEnd).toUTCString()}`;
}
const clearCookie = () => `${MANAGED_STAFF_LAB_COOKIE}=; Path=${MANAGED_STAFF_LAB_PATH}; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

function write(response: ServerResponse, result: Result, status = result.state === "denied" ? 403 : result.state === "unavailable" ? 503 : 200,
  changedCookie?: string) {
  if (response.headersSent || response.destroyed) return;
  response.writeHead(status, { ...safeHeaders, ...(changedCookie ? { "Set-Cookie": changedCookie } : {}) });
  response.end(JSON.stringify(result));
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json"
    || (request.headers["content-length"] && (!/^\d+$/.test(request.headers["content-length"])
      || Number(request.headers["content-length"]) > 2048))) return null;
  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    const finish = (value: Record<string, unknown> | null) => {
      clearTimeout(timeout);
      request.removeListener("data", data); request.removeListener("end", end);
      request.removeListener("error", failed); request.removeListener("aborted", failed);
      resolve(value);
    };
    const failed = () => finish(null);
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2048) { request.pause(); finish(null); } else chunks.push(chunk);
    };
    const end = () => {
      try {
        const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
        finish(value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null);
      } catch { finish(null); }
    };
    const timeout = setTimeout(() => { request.pause(); finish(null); }, 4000);
    request.on("data", data); request.on("end", end); request.on("error", failed); request.on("aborted", failed);
  });
}

function staffContext(context: PersistedSessionContext, record?: SessionRecord): boolean {
  return context.authenticationTier === "staff" && context.passwordValid && context.emailVerified
    && (context.sessionPolicySatisfied || context.reason === "staff_email_check_required")
    && context.operationalAccessReady === false && context.privilegedAccessReady === false
    && context.timing.absoluteExpiresAtMs > Date.now() && context.timing.idleExpiresAtMs !== null
    && context.timing.idleExpiresAtMs > Date.now()
    && (!record || (context.principal.userId === record.actorId && context.principal.sessionId === record.sessionId
      && context.timing.startedAtMs === record.origin && context.timing.absoluteExpiresAtMs === record.absoluteEnd));
}
const view = (context: PersistedSessionContext): Result => ({ state: context.staffEmailValid && context.sessionPolicySatisfied ? "verified" : "pending",
  startedAtMs: context.timing.startedAtMs, absoluteExpiresAtMs: context.timing.absoluteExpiresAtMs,
  lastActivityAtMs: context.timing.lastActivityAtMs, idleExpiresAtMs: context.timing.idleExpiresAtMs,
  operationalAccessReady: false, privilegedAccessReady: false });

/**
 * Actual HTTP/cookie composition for disposable CI only. Native tokens stay in
 * bounded process memory; no production route, SMTP, service key or grant exists.
 * Injected delivery is an in-memory test inbox. Listener shutdown clears all memory.
 */
export function createManagedStaffLab(options: Readonly<{ origin: string; editionKey: string; allowedEmails: readonly string[];
  client: () => Pick<SupabaseClient, "auth" | "rpc">; store: StaffEmailStore; deliver: StaffEmailDelivery; secret: string;
  context?: typeof readVerifiedSessionContext }>) {
  if (!boundary()) throw new Error("Managed staff lab requires the unlinked disposable GitHub runner.");
  const origin = new URL(options.origin);
  if (origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || !origin.port
    || options.origin !== origin.origin || !/^synthetic-[a-z0-9-]{1,100}$/.test(options.editionKey)
    || !options.allowedEmails.length || options.allowedEmails.length > 32
    || new Set(options.allowedEmails).size !== options.allowedEmails.length
    || !options.allowedEmails.every((email) => /^[a-z0-9.-]{1,80}@example\.invalid$/.test(email) && !/\s/.test(email)))
    throw new Error("Managed staff lab accepts only a fixed loopback synthetic fixture.");
  const sessions = new Map<string, SessionRecord>();
  const readContext = options.context ?? readVerifiedSessionContext;
  let logins = 0;
  let stopped = false;
  const deny = () => ({ state: "denied", code: "NOT_AUTHORIZED" }) as const;
  const unavailable = () => ({ state: "unavailable" }) as const;
  const forget = (key: string, record: SessionRecord) => {
    record.accessToken = ""; record.refreshToken = ""; record.challengeId = null;
    if (sessions.get(key) === record) sessions.delete(key);
  };
  const current = async (record: SessionRecord) => {
    const result = await readContext(record.accessToken, options.editionKey);
    if (result.state === "unavailable") throw new Error("Current managed staff assurance is unavailable.");
    return result.state === "verified" && staffContext(result.context, record) ? result.context : null;
  };
  const serialize = async <T>(record: SessionRecord, task: () => Promise<T>): Promise<T> => {
    const previous = record.queue;
    let release!: () => void;
    record.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await task(); } finally { release(); }
  };

  return Object.freeze({
    async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
      try {
        if (stopped || !boundary()) { write(response, deny(), 404); return; }
        if (request.socket.remoteAddress !== "127.0.0.1" || request.headers.host !== origin.host
          || request.headers["x-forwarded-for"] || request.headers["x-forwarded-host"]
          || request.headers["x-forwarded-proto"] || request.headers.forwarded || request.headers.authorization) {
          write(response, deny()); return;
        }
        const path = request.url;
        const mutation = request.method === "POST" && path === MANAGED_STAFF_LAB_PATH;
        const observation = request.method === "GET" && ["/status", "/protected"].some((suffix) => path === `${MANAGED_STAFF_LAB_PATH}${suffix}`);
        if (!mutation && !observation) { write(response, deny(), 404); return; }
        if (mutation && (request.headers.origin !== origin.origin
          || ![undefined, "same-origin", "none"].includes(request.headers["sec-fetch-site"] as string | undefined))) {
          write(response, deny()); return;
        }
        const input = mutation ? await readBody(request) : null;
        if (mutation && !input) { write(response, deny(), 400); return; }
        const keys = input ? Object.keys(input).sort().join(",") : "";
        const action = observation ? (path?.endsWith("/protected") ? "protected" : "status") : input?.action;
        if (action === "login") {
          if (keys !== "action,email,password" || typeof input?.email !== "string" || typeof input.password !== "string"
            || input.password.length < 1 || input.password.length > 256 || !options.allowedEmails.includes(input.email)) {
            write(response, deny()); return;
          }
          for (const [key, record] of sessions) if (record.absoluteEnd <= Date.now()) forget(key, record);
          if (logins + sessions.size >= maxSessions) { write(response, unavailable()); return; }
          logins++;
          try {
            const sdk = options.client();
            const login = await sdk.auth.signInWithPassword({ email: input.email, password: input.password });
            const native = login.data.session;
            if (login.error || !native || !login.data.user || !uuid.test(login.data.user.id)) { write(response, deny()); return; }
            const observed = await readContext(native.access_token, options.editionKey);
            if (stopped || observed.state !== "verified" || !staffContext(observed.context)
              || observed.context.principal.userId !== login.data.user.id || observed.context.staffEmailValid) {
              // A denied participant/Super Admin login may never leave a lab session.
              await sdk.auth.signOut({ scope: "local" });
              write(response, deny()); return;
            }
            const context = observed.context;
            const key = randomBytes(32).toString("hex");
            sessions.set(key, { accessToken: native.access_token, refreshToken: native.refresh_token,
              actorId: context.principal.userId, sessionId: context.principal.sessionId,
              origin: context.timing.startedAtMs, absoluteEnd: context.timing.absoluteExpiresAtMs,
              challengeId: null, queue: Promise.resolve() });
            write(response, view(context), 200, cookie(key, context.timing.absoluteExpiresAtMs));
          } finally { logins--; }
          return;
        }
        if (mutation && !((action === "verify" && keys === "action,code" && typeof input?.code === "string" && input.code.length === 6 && /^\d{6}$/.test(input.code))
          || (keys === "action" && ["issue", "refresh", "logout"].includes(action as string)))) {
          write(response, deny(), 400); return;
        }
        const key = sessionCookie(request.headers.cookie);
        const record = key ? sessions.get(key) : undefined;
        if (!key || !record) { write(response, deny(), 403, clearCookie()); return; }
        await serialize(record, async () => {
          if (stopped || sessions.get(key) !== record) { write(response, deny(), 403, clearCookie()); return; }
          if (action === "logout") {
            try {
              const sdk = options.client();
              const restored = await sdk.auth.setSession({ access_token: record.accessToken, refresh_token: record.refreshToken });
              const database = restored.error ? null : await sdk.rpc("msrc_session_logout", { edition_key: options.editionKey });
              const revoked = restored.error ? null : await sdk.auth.signOut({ scope: "local" });
              const complete = database && !database.error && database.data === true && revoked && !revoked.error;
              write(response, complete ? { state: "logged_out" } : unavailable(), complete ? 200 : 503, clearCookie());
            } catch { write(response, unavailable(), 503, clearCookie());
            } finally { forget(key, record); }
            return;
          }
          const before = await current(record);
          if (!before) { write(response, deny()); return; }
          if (action === "status") { write(response, view(before)); return; }
          if (action === "protected") {
            write(response, before.sessionPolicySatisfied && before.staffEmailValid
              ? { ...view(before), resource: "Synthetic staff lab resource" } : deny()); return;
          }
          if (action === "refresh") {
            const sdk = options.client();
            const refreshed = await sdk.auth.refreshSession({ refresh_token: record.refreshToken });
            if (refreshed.error || !refreshed.data.session) { write(response, unavailable()); return; }
            const native = refreshed.data.session;
            const after = await readContext(native.access_token, options.editionKey);
            if (after.state !== "verified" || !staffContext(after.context, record)
              || after.context.staffEmailValid !== before.staffEmailValid
              || after.context.timing.lastActivityAtMs !== before.timing.lastActivityAtMs
              || after.context.timing.idleExpiresAtMs !== before.timing.idleExpiresAtMs) {
              forget(key, record); write(response, deny(), 403, clearCookie()); return;
            }
            record.accessToken = native.access_token; record.refreshToken = native.refresh_token;
            write(response, view(after.context), 200, cookie(key, record.absoluteEnd)); return;
          }
          const check = createStaffEmailCheck({ auth: options.client().auth, store: options.store,
            deliver: options.deliver, secret: options.secret });
          if (action === "issue") {
            const issued = await check.issue(record.accessToken, request.socket.remoteAddress!);
            if (issued.state === "issued") {
              record.challengeId = issued.challengeId;
              write(response, { state: "issued", expiresAt: issued.expiresAt });
            } else write(response, issued.state === "unavailable" ? unavailable()
              : { state: "denied", code: issued.state === "denied" && issued.code === "retry_limited" ? "RETRY_LIMITED" : "NOT_AUTHORIZED" });
            return;
          }
          const verified = record.challengeId ? await check.verify(record.accessToken, record.challengeId, input!.code as string) : deny();
          if (verified.state !== "verified") { write(response, verified.state === "unavailable" ? unavailable() : deny()); return; }
          const after = await current(record);
          // A storage success is not an authorization. Recheck current database assurance.
          write(response, after?.sessionPolicySatisfied && after.staffEmailValid ? view(after) : unavailable());
        });
      } catch { write(response, unavailable()); }
    },
    close() {
      stopped = true;
      for (const [key, record] of sessions) forget(key, record);
    },
  });
}
