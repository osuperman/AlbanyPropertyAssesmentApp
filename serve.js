const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const host = process.env.HOST || "127.0.0.1";
const port = parseInt(process.env.PORT || "4173", 10);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".geojson": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".pdf": "application/pdf",
  ".zip": "application/zip"
};

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function mergeDeep(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return base;
  const result = Array.isArray(base) ? base.slice() : { ...(base || {}) };
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === "object" && !Array.isArray(value) && base && typeof base[key] === "object" && !Array.isArray(base[key])) {
      result[key] = mergeDeep(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadRuntimeSettings() {
  const localSettings = readJsonIfExists(path.join(root, "grievance-settings.local.json")) || {};
  const envSettings = {
    streetView: {
      embedApiKey: process.env.ALBANY_GOOGLE_MAPS_EMBED_KEY || process.env.ALBANY_GOOGLE_MAPS_KEY || "",
      staticApiKey: process.env.ALBANY_GOOGLE_MAPS_STATIC_KEY || process.env.ALBANY_GOOGLE_MAPS_KEY || "",
    },
  };
  return mergeDeep(localSettings, envSettings);
}

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\//, "");
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url);
  if (!filePath) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = err.code === "ENOENT" ? 404 : 500;
      res.end(err.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    if (ext === ".html") {
      const runtimeSettings = loadRuntimeSettings();
      if (runtimeSettings && Object.keys(runtimeSettings).length > 0) {
        const injection = `<script>window.__ALBANY_RUNTIME_SETTINGS__ = ${JSON.stringify(runtimeSettings)};</script>`;
        const html = data.toString("utf8");
        const bundleScriptRe = /<script src="\.\/bundle\.js(?:\?v=[^"]+)?"><\/script>/;
        const rewritten = bundleScriptRe.test(html) ? html.replace(bundleScriptRe, `${injection}\n$&`) : html;
        res.end(rewritten);
        return;
      }
    }
    res.end(data);
  });
});

let currentPort = port;

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    const nextPort = currentPort + 1;
    console.warn("Port " + currentPort + " is already in use. Retrying on " + nextPort + "...");
    currentPort = nextPort;
    setTimeout(() => server.listen(currentPort, host), 50);
    return;
  }
  throw err;
});

server.listen(currentPort, host, () => {
  console.log("Open http://" + host + ":" + currentPort);
});
