import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const schema = "msrc_ci_storage";
const container = "supabase_db_msrc2027-local";
const dockerPrefix = ["--host", "unix:///var/run/docker.sock"];
const psqlCommand = ["exec", "-i", container, "env", "-i", "PATH=/usr/bin:/bin:/usr/lib/postgresql/17/bin", "LANG=C.UTF-8",
  "psql", "-X", "-q", "-At", "-h", "/var/run/postgresql", "-p", "5432",
  "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=sqlstate", "-U", "supabase_admin", "-d", "postgres"];
// Installed CLI 2.118.0's three default registry candidates, without overrides.
const images = ["public.ecr.aws/supabase/postgres:17.6.1.171", "ghcr.io/supabase/postgres:17.6.1.171", "supabase/postgres:17.6.1.171"];
type Environment = Readonly<Record<string, string | undefined>>;

export function validateCiStorageBoundary(configuration: string, environment: Environment, platform: string, linked: boolean): void {
  const auth = configuration.split("[auth]")[1]?.split("[auth.email]")[0] ?? "";
  const emailHook = configuration.split("[auth.hook.send_email]")[1]?.split(/\r?\n\[/)[0] ?? "";
  if (platform !== "linux" || linked || environment.CI !== "true" || environment.GITHUB_ACTIONS !== "true"
    || environment.RUNNER_ENVIRONMENT !== "github-hosted" || environment.GITHUB_REPOSITORY !== "xpexellent-dotcom/msrc-2027"
    || environment.SUPABASE_PROJECT_ID || environment.SUPABASE_PROJECT_REF || environment.SUPABASE_ACCESS_TOKEN
    || (environment.NEXT_PUBLIC_SUPABASE_TARGET && environment.NEXT_PUBLIC_SUPABASE_TARGET !== "local")
    || (environment.NEXT_PUBLIC_SUPABASE_URL && environment.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
    || ["STAFF_PORTAL_ENABLED", "STAFF_PASSWORD_CHANGE_ENABLED", "PARTICIPANT_ACCOUNTS_ENABLED"].some((key) => environment[key] === "true")
    || !/^project_id = "msrc2027-local"$/m.test(configuration) || !/^enable_signup = false$/m.test(auth)
    || !/\[db\]\r?\nport = 54322(?:\r?\n|$)/.test(configuration)
    || !/^major_version = 17$/m.test(configuration)
    || !/^enabled = true$/m.test(emailHook) || !/^uri = "pg-functions:\/\/postgres\/msrc_ci_auth\/reject_email"$/m.test(emailHook)) {
    throw new Error("Storage fixtures require the unlinked no-delivery disposable GitHub stack.");
  }
}

export function ciStorageChildEnvironment(environment: Environment): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ["PATH", "LANG", "LC_ALL"]) if (environment[key]) result[key] = environment[key];
  return result;
}

export function ciStorageContainerChecks(value: unknown): Record<string, boolean> {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const ports = v.ports as Record<string, unknown> | undefined;
  const bindings = ports?.["5432/tcp"];
  return {
    exactName: v.name === `/${container}`,
    running: v.running === true,
    exactNetwork: v.network === "msrc2027-local",
    approvedPinnedImage: typeof v.image === "string" && images.includes(v.image),
    loopbackDatabasePort: Array.isArray(bindings) && bindings.length === 1
      && bindings[0]?.HostIp === "127.0.0.1" && bindings[0]?.HostPort === "54322",
    noExtraPublishedPorts: Object.entries(ports ?? {}).every(([key, entries]) => key === "5432/tcp" || entries === null),
  };
}

export function validCiStorageContainer(value: unknown): boolean {
  return Object.values(ciStorageContainerChecks(value)).every(Boolean);
}

function fixtureBody(token: string): string {
  return `
declare marker ${schema}.marker%rowtype; relation oid; canonical boolean;
begin
 if operation is null or operation not in ('create','drop_owner','drop') then
  raise exception using errcode='22023',message='Unknown synthetic fixture operation.';end if;
 if current_user<>'supabase_admin' or session_user<>'postgres' or current_database()<>'postgres' then
  raise exception using errcode='42501',message='Disposable fixture operator required.';end if;
 select m.* into marker from ${schema}.marker m where m.singleton for update;
 if not found or marker.token<>'${token}'::uuid then raise exception using errcode='55000',message='Fixture lifecycle mismatch.';end if;
 relation:=to_regclass('storage.objects');
 if operation='create' then
  if relation is not null or marker.relation is not null then raise exception using errcode='55000',message='Existing Storage relation is unavailable.';end if;
  create table storage.objects(id uuid primary key,owner uuid,owner_id text);
  comment on table storage.objects is '${schema}:${token}';
  grant select,insert,update on storage.objects to postgres;
  update ${schema}.marker set relation=to_regclass('storage.objects'),owner_dropped=false where singleton;
  return;
 end if;
 if relation is null or marker.relation is distinct from relation or obj_description(relation,'pg_class') is distinct from '${schema}:${token}'
  or not exists(select 1 from pg_class c where c.oid=relation and c.relkind='r' and c.relowner='supabase_admin'::regrole) then
  raise exception using errcode='55000',message='Only the marked synthetic relation is available.';end if;
 select array_agg(a.attname::text||':'||a.atttypid::text order by a.attname)=
  case when marker.owner_dropped then array['id:'||'uuid'::regtype::oid,'owner_id:'||'text'::regtype::oid]
   else array['id:'||'uuid'::regtype::oid,'owner:'||'uuid'::regtype::oid,'owner_id:'||'text'::regtype::oid] end into canonical
  from pg_attribute a where a.attrelid=relation and a.attnum>0 and not a.attisdropped;
 if canonical is not true then raise exception using errcode='55000',message='Fixture shape mismatch.';end if;
 if operation='drop_owner' then
  if marker.owner_dropped then raise exception using errcode='55000',message='Fixture owner already removed.';end if;
  alter table storage.objects drop column owner;
  update ${schema}.marker set owner_dropped=true where singleton;
 else
  drop table storage.objects;
  update ${schema}.marker set relation=null,owner_dropped=false where singleton;
 end if;
end`;
}

function sql(mode: "install" | "cleanup", token: string, body: string): string {
  const digest = createHash("md5").update(body).digest("hex");
  const nativeGuard = `if current_user<>'supabase_admin' or session_user<>'supabase_admin' or current_database()<>'postgres' then
    raise exception using errcode='42501',message='Isolated native administrator required.';end if;`;
  if (mode === "install") return `begin;set local statement_timeout='20s';set local lock_timeout='5s';
do $$begin ${nativeGuard}
 if exists(select 1 from auth.users) then raise exception using errcode='55000',message='Fresh empty native fixtures required.';end if;
 if to_regclass('storage.objects') is not null or to_regnamespace('${schema}') is not null then
  raise exception using errcode='55000',message='Fixture requires absent disposable objects.';end if;
 if not exists(select 1 from pg_namespace where nspname='storage' and nspowner='supabase_admin'::regrole) then
  raise exception using errcode='55000',message='Native Storage namespace mismatch.';end if;
end$$;
create schema ${schema} authorization supabase_admin;
revoke all on schema ${schema} from public,anon,authenticated,service_role,supabase_auth_admin;
grant usage on schema ${schema} to postgres;
create table ${schema}.marker(singleton boolean primary key default true check(singleton),token uuid not null,relation oid,owner_dropped boolean not null default false);
revoke all on ${schema}.marker from public,anon,authenticated,service_role,supabase_auth_admin,postgres;
insert into ${schema}.marker(token) values('${token}');
create function ${schema}.fixture(operation text) returns void language plpgsql security definer set search_path='' as $fixture$${body}$fixture$;
revoke all on function ${schema}.fixture(text) from public,anon,authenticated,service_role,supabase_auth_admin;
grant execute on function ${schema}.fixture(text) to postgres;
commit;`;
  return `begin;set local statement_timeout='20s';set local lock_timeout='5s';
do $$begin ${nativeGuard}
 if to_regnamespace('${schema}') is null then
  if to_regclass('storage.objects') is not null then raise exception using errcode='55000',message='Unexpected Storage relation.';end if;
  return;
 end if;
 if not exists(select 1 from pg_namespace where nspname='${schema}' and nspowner='supabase_admin'::regrole)
  or not exists(select 1 from ${schema}.marker where singleton and token='${token}' and relation is null and not owner_dropped)
  or (select count(*) from ${schema}.marker)<>1 or to_regclass('storage.objects') is not null
  or not exists(select 1 from pg_proc where oid='${schema}.fixture(text)'::regprocedure and proowner='supabase_admin'::regrole
   and prosecdef and md5(prosrc)='${digest}') then raise exception using errcode='55000',message='Owned fixture cleanup mismatch.';end if;
 execute 'drop function ${schema}.fixture(text)';
 execute 'drop table ${schema}.marker';
 execute 'drop schema ${schema}';
end$$;commit;`;
}

async function execute(args: string[], environment: Environment, input?: string): Promise<string> {
  return new Promise((yes, no) => {
    // Next augments ProcessEnv with NODE_ENV; the Docker CLI does not require it.
    const child = spawn("docker", [...dockerPrefix, ...args], { env: ciStorageChildEnvironment(environment) as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";let sqlState = "unknown";let timedOut = false;let excessiveOutput = false;
    const timer = setTimeout(() => { timedOut = true;child.kill(); }, 30_000);
    child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString();if (output.length > 16_384) { excessiveOutput = true;child.kill(); } });
    child.stderr.on("data", (chunk: Buffer) => { sqlState = chunk.toString().match(/(?:ERROR|FATAL):\s+([0-9A-Z]{5})(?:\s|$)/)?.[1] ?? sqlState; });
    child.once("error", () => { clearTimeout(timer);no(new Error("Disposable fixture command could not start.")); });
    child.once("close", (code) => { clearTimeout(timer);if (code === 0 && !timedOut && !excessiveOutput) yes(output.trim());
      else no(new Error(`Disposable fixture command failed (SQLSTATE ${sqlState}); raw diagnostics withheld.`)); });
    child.stdin.on("error", () => {});child.stdin.end(input);
  });
}

async function run(): Promise<void> {
  const option = process.argv.slice(2);
  if (option.length !== 1 || !["--install", "--cleanup"].includes(option[0])) throw new Error("Choose exactly one disposable fixture mode.");
  const mode = option[0] === "--install" ? "install" : "cleanup";
  const work = fileURLToPath(new URL("../", import.meta.url));
  validateCiStorageBoundary(readFileSync(resolve(work, "supabase/config.toml"), "utf8"), process.env, process.platform,
    existsSync(resolve(work, "supabase/.temp/project-ref")));
  if (JSON.parse(readFileSync(resolve(work, "package.json"), "utf8")).devDependencies?.supabase !== "2.118.0") {
    throw new Error("Disposable fixture CLI version requires review.");
  }
  if (!process.env.RUNNER_TEMP || !isAbsolute(process.env.RUNNER_TEMP) || !process.env.GITHUB_WORKSPACE
    || realpathSync(process.env.GITHUB_WORKSPACE) !== realpathSync(work)) throw new Error("Disposable workspace boundary mismatch.");
  const temporary = realpathSync(process.env.RUNNER_TEMP);
  const state = resolve(temporary, "msrc-ci-storage-active.json");
  const format = '{"name":{{json .Name}},"image":{{json .Config.Image}},"running":{{json .State.Running}},"network":{{json .HostConfig.NetworkMode}},"ports":{{json .NetworkSettings.Ports}}}';
  const captured = await execute(["inspect", "--format", format, container], process.env);
  let inspected: unknown;try { inspected = JSON.parse(captured); } catch { throw new Error("Disposable container metadata unavailable."); }
  if (!validCiStorageContainer(inspected)) {
    process.stderr.write(JSON.stringify({ fixtureTargetChecks: ciStorageContainerChecks(inspected) }) + "\n");
    throw new Error("Disposable container target mismatch.");
  }
  let token: string;
  if (mode === "install") {
    token = randomUUID();writeFileSync(state, JSON.stringify({ token }), { flag: "wx", mode: 0o600 });
  } else {
    if (!existsSync(state)) {
      const absent = await execute(psqlCommand, process.env,
      `begin read only;set local statement_timeout='20s';select current_user='supabase_admin' and session_user='supabase_admin'
        and current_database()='postgres' and to_regnamespace('${schema}') is null and to_regclass('storage.objects') is null;commit;`);
      if (absent !== "t") throw new Error("Unowned disposable Storage helper is unavailable.");
      process.stdout.write("Verified disposable Storage helper and synthetic relation are absent.\n");return;
    }
    const previous: unknown = JSON.parse(readFileSync(state, "utf8"));
    if (!previous || typeof previous !== "object" || Object.keys(previous).join() !== "token"
      || typeof (previous as { token?: unknown }).token !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test((previous as { token: string }).token)) {
      throw new Error("Disposable fixture marker unavailable.");
    }
    token = (previous as { token: string }).token;
  }
  await execute(psqlCommand, process.env, sql(mode, token, fixtureBody(token)));
  if (mode === "cleanup") unlinkSync(state);
  process.stdout.write(mode === "install" ? "Installed the private disposable Storage fixture helper; no real objects or settings changed.\n"
    : "Removed the private disposable Storage fixture helper before native/advisor checks.\n");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  run().catch((error: unknown) => {
    const state = error instanceof Error ? error.message.match(/SQLSTATE ([0-9A-Z]{5}|unknown)/)?.[1] : undefined;
    process.stderr.write(`Disposable Storage fixture stopped${state ? ` (SQLSTATE ${state})` : ""}; sensitive diagnostics withheld.\n`);
    process.exitCode = 1;
  });
}
