/** BL-AUTH-01 UI readiness stub only; browser API responses are intercepted by Playwright.
 * This is deliberately not a mock proof of database, Auth or email enforcement. */
import http from "node:http";

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:3220");
  if (request.socket.remoteAddress !== "127.0.0.1" && request.socket.remoteAddress !== "::ffff:127.0.0.1") {
    response.writeHead(403).end(); return;
  }
  if (url.pathname === "/health") { response.writeHead(200, { "Content-Type": "application/json" }).end('{"synthetic":true}'); return; }
  if (request.method !== "POST" || url.pathname !== "/rest/v1/rpc/msrc_staff_status"
    || request.headers.apikey !== "sb_secret_staff_mock_only") { response.writeHead(404).end(); return; }
  for await (const chunk of request) { if (chunk.length > 8192) { response.writeHead(413).end(); return; } }
  response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }).end('{"enabled":true,"emailDailyLimit":40}');
});
server.listen(3220, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.close());
