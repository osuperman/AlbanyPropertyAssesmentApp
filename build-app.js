const fs = require("fs");
const path = require("path");
const esbuild = require("./__build_perf/node_modules/esbuild");

const root = __dirname;
const buildDir = path.join(root, "__build_perf");
const sourceFile = path.join(root, "albany-full-dashboard.jsx");
const leafletSourceFile = path.join(root, "leaflet-map.jsx");
const autocompleteSourceFile = path.join(root, "address-autocomplete.jsx");
const buildLeafletFile = path.join(buildDir, "leaflet-map.jsx");
const buildAutocompleteFile = path.join(buildDir, "address-autocomplete.jsx");
const buildSourceFile = path.join(buildDir, "albany-full-dashboard.jsx");
const entryFile = path.join(buildDir, "entry.jsx");
const outfile = path.join(root, "bundle.js");

fs.copyFileSync(leafletSourceFile, buildLeafletFile);
fs.copyFileSync(autocompleteSourceFile, buildAutocompleteFile);
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

console.log("Built " + path.relative(root, outfile) + " from " + path.relative(root, sourceFile));
