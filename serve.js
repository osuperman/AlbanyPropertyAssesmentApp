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
    res.setHeader("Content-Type", mime[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
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
