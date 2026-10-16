/** Loopback HTTPS browser harness. WebKit upgrades private-page subresources
 * under the unchanged production CSP, so the browser must actually use TLS. */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { Agent, request as httpRequest } from "node:http";
import { createServer } from "node:https";
import { resolve } from "node:path";

if (process.env.VERCEL || process.env.VERCEL_URL) throw new Error("Local QA harness refuses deployed environments");

const certificateDirectory = resolve(".tools/real-user-tls");
mkdirSync(certificateDirectory, { recursive: true });
const keyPath = resolve(certificateDirectory, "loopback.key");
const certificatePath = resolve(certificateDirectory, "loopback.crt");
const gitOpenSSL = "C:/Program Files/Git/usr/bin/openssl.exe";
const openssl = process.platform === "win32" && existsSync(gitOpenSSL) ? gitOpenSSL : "openssl";
// Generate a fresh, short-lived test certificate. Both files live under ignored
// .tools; the private key is never logged, committed, or used outside loopback.
const certificate = spawnSync(openssl, ["req", "-x509", "-newkey", "rsa:2048", "-nodes",
  "-keyout", keyPath, "-out", certificatePath, "-days", "2", "-subj", "/CN=127.0.0.1",
  "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost"], { stdio: "ignore", windowsHide: true });
if (certificate.error || certificate.status !== 0) throw new Error("Local QA TLS certificate generation requires OpenSSL");

const next = process.env.REAL_USER_REUSE_SERVER === "1" ? undefined : spawn(process.execPath,
  ["./node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3210"],
  { env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", DESIGN_PREVIEW_ENABLED: "true",
    LOCAL_MEDIA_PREVIEW_ENABLED: "true", VERCEL_ENV: "preview" }, stdio: "inherit", windowsHide: true });

// A browser matrix creates many short-lived contexts and canceled prefetches.
// Bound/reuse backend connections instead of exhausting Windows socket buffers.
const upstreamAgent = new Agent({ keepAlive: true, maxSockets: 32, maxFreeSockets: 16, scheduling: "lifo" });
const proxy = createServer({ key: readFileSync(keyPath), cert: readFileSync(certificatePath) }, (request, response) => {
  const upstream = httpRequest({ agent: upstreamAgent, hostname: "127.0.0.1", port: 3210, path: request.url, method: request.method,
    // Keep the browser-facing Host, Origin, cookies and request body intact.
    headers: { ...request.headers, "x-forwarded-proto": "https", "x-forwarded-host": request.headers.host,
      "x-forwarded-for": request.socket.remoteAddress ?? "127.0.0.1" } }, (result) => {
    // rawHeaders preserve duplicate Set-Cookie fields and the original CSP verbatim.
    response.writeHead(result.statusCode ?? 502, result.rawHeaders);
    result.pipe(response);
  });
  upstream.on("error", (error: NodeJS.ErrnoException) => {
    if (!response.destroyed) console.error("Local QA upstream transport failed", {
      method: request.method, path: request.url?.split("?")[0],
      code: error.code, reusedSocket: upstream.reusedSocket,
    });
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    response.end("Local QA application is unavailable.");
  });
  request.on("aborted", () => upstream.destroy());
  response.on("close", () => { if (!response.writableEnded) upstream.destroy(); });
  request.pipe(upstream);
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  next?.kill("SIGTERM");
  upstreamAgent.destroy();
  proxy.closeAllConnections();
  proxy.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
next?.on("error", () => { process.exitCode = 1; stop(); });
next?.on("exit", (code) => { if (!stopping) { process.exitCode = code || 1; stop(); } });
proxy.on("error", () => { process.exitCode = 1; stop(); });
proxy.listen(3220, "127.0.0.1", () => { console.log("Local QA HTTPS proxy ready on loopback port 3220."); });
