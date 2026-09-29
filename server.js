const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const TaskScheduler = require("./app");

const scheduler = new TaskScheduler();
const publicDir = path.join(__dirname, "public");
const recentRuns = [];
const MAX_BODY_BYTES = 10 * 1024;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        if (!tooLarge) reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
        tooLarge = true;
        return;
      }
      if (!tooLarge) body += chunk;
    });
    request.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(response, pathname, headOnly = false) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(publicDir, `.${requestedPath}`);
  if (!filePath.startsWith(`${publicDir}${path.sep}`)) {
    response.writeHead(404).end("Not found");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": path.extname(filePath) === ".html" ? "no-cache" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    response.end(headOnly ? undefined : content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    try {
      if (url.pathname === "/api/tasks" && request.method === "GET") {
        return sendJson(response, 200, { tasks: scheduler.getTasks(), recentRuns: recentRuns.slice(0, 8) });
      }
      if (url.pathname === "/api/tasks" && request.method === "POST") {
        const body = await readJson(request);
        const name = typeof body.name === "string" ? body.name.trim() : "";
        const cronExpression = typeof body.cronExpression === "string" ? body.cronExpression.trim() : "";
        if (!name || name.length > 80) {
          return sendJson(response, 400, { error: "Give your task a name (up to 80 characters)." });
        }
        if (!cronExpression || cronExpression.length > 100) {
          return sendJson(response, 400, { error: "Enter a valid cron expression." });
        }
        const task = { id: require("node:crypto").randomUUID(), name, cronExpression };
        scheduler.scheduleTask(cronExpression, () => {
          const run = { id: `${task.id}-${Date.now()}`, taskId: task.id, name: task.name, ranAt: new Date().toISOString() };
          recentRuns.unshift(run);
          recentRuns.length = Math.min(recentRuns.length, 50);
        }, task);
        return sendJson(response, 201, { task: scheduler.getTasks().find((item) => item.id === task.id) });
      }
      if (url.pathname === "/api/tasks" && request.method === "DELETE") {
        scheduler.deleteAllTasks();
        return sendJson(response, 200, { ok: true });
      }
      const match = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (match && request.method === "DELETE") {
        const id = decodeURIComponent(match[1]);
        if (!scheduler.deleteTask(id)) return sendJson(response, 404, { error: "Task not found." });
        return sendJson(response, 200, { ok: true });
      }
      return sendJson(response, 404, { error: "Endpoint not found." });
    } catch (error) {
      return sendJson(response, error.status || 400, { error: error.message || "Unable to process request." });
    }
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Bad request");
    return;
  }
  serveStatic(response, pathname, request.method === "HEAD");
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, "0.0.0.0", () => {
  console.log(`TaskWarp is ready at http://0.0.0.0:${port}`);
});

function shutdown() {
  scheduler.deleteAllTasks();
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
