/* =========================================================
   浩德堂網站伺服器（純 Node.js，零套件依賴）
   ---------------------------------------------------------
   用途：
     1. 本機開發測試用（模擬 Vercel 的 /api 環境）
     2. 之後搬到自己的主機，直接 `node server/server.js` 就能跑

   啟動方式：
     node server/server.js             # 預設 port 3000
     PORT=8080 node server/server.js

   靜態檔案與 /api 都由這一支程式服務，不需要另外架 Nginx。
   正式上線請用 HTTPS（綠界要求 ReturnURL 必須是 https）。
   ========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

/* ---------- 讀取 .env（簡易版，不需要 dotenv 套件） ---------- */
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) return;
      const key = m[1].trim();
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined) process.env[key] = val;
    });
}
loadEnv();

const ROOT = path.join(__dirname, "..");
const PORT = process.env.PORT || 3000;

/* ---------- Vercel 相容轉接層 ----------
   讓 api/*.js 的 handler（Vercel 格式）能在原生 Node server 上跑 */
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => resolve(raw));
  });
}

function parseBody(raw, contentType) {
  if (!raw) return {};
  if ((contentType || "").includes("application/json")) {
    try { return JSON.parse(raw); } catch (_) { return raw; }
  }
  if ((contentType || "").includes("x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  return raw;
}

function wrap(handler) {
  return async (req, res) => {
    const raw = await readBody(req);
    req.body = parseBody(raw, req.headers["content-type"]);

    res.status = function (code) { res.statusCode = code; return res; };
    res.json = function (obj) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(obj));
      return res;
    };
    try {
      await handler(req, res);
    } catch (err) {
      console.error("[api error]", err);
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, message: "伺服器發生錯誤：" + err.message }));
      }
    }
  };
}

/* ---------- 靜態檔案 ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".md": "text/markdown; charset=utf-8"
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";

  const filePath = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[\/\\])+/, ""));
  if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end("Forbidden"); }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA：找不到就回 index.html
      return fs.readFile(path.join(ROOT, "index.html"), (e2, data) => {
        if (e2) { res.statusCode = 404; return res.end("Not Found"); }
        res.setHeader("Content-Type", MIME[".html"]);
        res.end(data);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  });
}

/* ---------- 路由 ---------- */
const createOrder = wrap(require("../api/create-order.js"));
const ecpayNotify = wrap(require("../api/ecpay-notify.js"));

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (pathname === "/api/create-order") return createOrder(req, res);
  if (pathname === "/api/ecpay-notify") return ecpayNotify(req, res);

  // 其餘交給靜態檔案
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  const mode = process.env.ECPAY_MODE || "production";
  const mid = process.env.ECPAY_MERCHANT_ID || "(未設定)";
  console.log("");
  console.log("  浩德堂網站伺服器已啟動");
  console.log(`  網址：http://localhost:${PORT}`);
  console.log(`  綠界環境：${mode === "stage" ? "測試環境" : "正式環境"}　商店代號：${mid}`);
  console.log("");
});
