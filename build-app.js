const crypto = require("crypto");
const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const esbuild = require("./__build_perf/node_modules/esbuild");

const root = __dirname;
const buildDir = path.join(root, "__build_perf");
const sourceFile = path.join(root, "albany-full-dashboard.jsx");
const leafletSourceFile = path.join(root, "leaflet-map.jsx");
const autocompleteSourceFile = path.join(root, "address-autocomplete.jsx");
const propertyClassCodesSourceFile = path.join(root, "property-type-classification-codes.json");
const grievanceSettingsSourceFile = path.join(root, "grievance-settings.json");
const buildLeafletFile = path.join(buildDir, "leaflet-map.jsx");
const buildAutocompleteFile = path.join(buildDir, "address-autocomplete.jsx");
const buildPropertyClassCodesFile = path.join(buildDir, "property-type-classification-codes.json");
const buildGrievanceSettingsFile = path.join(buildDir, "grievance-settings.json");
const buildSourceFile = path.join(buildDir, "albany-full-dashboard.jsx");
const entryFile = path.join(buildDir, "entry.jsx");
const outfile = path.join(root, "bundle.js");
const htmlFiles = [path.join(root, "index.html"), path.join(root, "albany-dashboard.html")];

function rewriteHtmlBundleReference(filePath, bundleVersion) {
  if (!fs.existsSync(filePath)) return;
  const html = fs.readFileSync(filePath, "utf8");
  const cacheMeta = [
    '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate"/>',
    '<meta http-equiv="Pragma" content="no-cache"/>',
    '<meta http-equiv="Expires" content="0"/>',
  ].join("\n");
  const withMeta = html.includes('http-equiv="Cache-Control"')
    ? html
    : html.replace("<title>Albany Property Tax Explorer</title>", `<title>Albany Property Tax Explorer</title>\n${cacheMeta}`);
  const rewritten = withMeta.replace(/\.\/bundle\.js(?:\?v=[^"']+)?/g, `./bundle.js?v=${bundleVersion}`);
  fs.writeFileSync(filePath, rewritten, "utf8");
}

fs.copyFileSync(leafletSourceFile, buildLeafletFile);
fs.copyFileSync(autocompleteSourceFile, buildAutocompleteFile);
fs.copyFileSync(propertyClassCodesSourceFile, buildPropertyClassCodesFile);
fs.copyFileSync(grievanceSettingsSourceFile, buildGrievanceSettingsFile);
fs.copyFileSync(sourceFile, buildSourceFile);

esbuild.buildSync({
  entryPoints: [entryFile],
  bundle: true,
  outfile,
  format: "iife",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  absWorkingDir: buildDir,
  logLevel: "info"
});

const bundleVersion = crypto.createHash("sha256").update(fs.readFileSync(outfile)).digest("hex").slice(0, 12);
for (const htmlFile of htmlFiles) rewriteHtmlBundleReference(htmlFile, bundleVersion);
childProcess.execFileSync(process.execPath, [path.join(root, "stage-pages.js")], { stdio: "inherit" });

console.log("Built " + path.relative(root, outfile) + " from " + path.relative(root, sourceFile));
console.log("Updated HTML bundle version to " + bundleVersion);

