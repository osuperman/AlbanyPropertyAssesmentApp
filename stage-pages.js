const fs = require("fs");
const path = require("path");

const root = __dirname;
const siteDir = path.join(root, "site");

const requiredFiles = [
  "index.html",
  "bundle.js",
  "albany-roll.json",
];

const optionalFiles = [
  "albany-dashboard.html",
  "albany-parcel-geometry.json",
  "albany_street_centerlines.geojson",
  "logo_transparent.png",
  "CNAME",
];

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileIntoSite(name, required) {
  const source = path.join(root, name);
  const target = path.join(siteDir, name);
  if (!fs.existsSync(source)) {
    if (required) {
      throw new Error(`Missing required publish file: ${name}`);
    }
    console.warn(`Skipping optional publish file: ${name}`);
    return null;
  }
  fs.copyFileSync(source, target);
  const sizeBytes = fs.statSync(source).size;
  return {
    name,
    sizeBytes,
    sizeMB: Number((sizeBytes / (1024 * 1024)).toFixed(2)),
  };
}

function writeTextFile(name, contents) {
  fs.writeFileSync(path.join(siteDir, name), contents, "utf8");
}

ensureCleanDir(siteDir);

const copied = [];
for (const name of requiredFiles) copied.push(copyFileIntoSite(name, true));
for (const name of optionalFiles) {
  const result = copyFileIntoSite(name, false);
  if (result) copied.push(result);
}

writeTextFile(".nojekyll", "");
if (fs.existsSync(path.join(siteDir, "index.html"))) {
  fs.copyFileSync(path.join(siteDir, "index.html"), path.join(siteDir, "404.html"));
}
writeTextFile(
  "site-manifest.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: copied,
      totalSizeMB: Number((copied.reduce((sum, item) => sum + item.sizeBytes, 0) / (1024 * 1024)).toFixed(2)),
    },
    null,
    2
  )
);

console.log("Staged GitHub Pages site in " + siteDir);
for (const item of copied) {
  console.log(`- ${item.name} (${item.sizeMB} MB)`);
}
