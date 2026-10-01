#!/usr/bin/env node
/**
 * Writes the compact albany-roll.json the app loads, from a full prepared roll payload and (optionally) the
 * prior year's full payload for year-over-year comparisons.
 *
 * Usage:
 *   node build-compact-roll.js <current.full.json> [--prior <prior.full.json>] [--out albany-roll.json]
 */

const fs = require("fs");
const path = require("path");
const { encodeCompactRollPayload, decodeCompactRollPayload } = require("./roll-compact-format.js");

const args = process.argv.slice(2);
const currentPath = args.find(arg => !arg.startsWith("--") && args[args.indexOf(arg) - 1] !== "--prior" && args[args.indexOf(arg) - 1] !== "--out");
const priorPath = args.includes("--prior") ? args[args.indexOf("--prior") + 1] : null;
const outPath = args.includes("--out") ? args[args.indexOf("--out") + 1] : "albany-roll.json";
if (!currentPath) {
  console.error("Usage: node build-compact-roll.js <current.full.json> [--prior <prior.full.json>] [--out albany-roll.json]");
  process.exit(1);
}

const current = JSON.parse(fs.readFileSync(currentPath, "utf8"));
const prior = priorPath ? JSON.parse(fs.readFileSync(priorPath, "utf8")) : null;
const compact = encodeCompactRollPayload(current, prior);
const json = JSON.stringify(compact);
fs.writeFileSync(outPath, json);

// Round-trip check: every parcel decodes back to the same core values.
const decoded = decodeCompactRollPayload(JSON.parse(json));
const core = ["parcelId", "address", "zip", "owner1", "owner2", "propClass", "propClassDesc", "parcelType", "landValue", "assessedValue", "fullMarketValue", "countyTaxable", "cityTaxable", "schoolTaxable", "neighborhood", "mailAddress", "deedYear", "eastCoord", "nrthCoord"];
let mismatches = 0;
decoded.forEach((p, i) => {
  const src = current.parcels[i];
  for (const field of core) {
    if (String(p[field] ?? "") !== String(src[field] ?? "")) { mismatches += 1; if (mismatches <= 5) console.warn(`  mismatch ${src.parcelId} ${field}: ${src[field]} vs ${p[field]}`); }
  }
  if (JSON.stringify(p.exemptions.map(e => [e.code, e.countyAmt, e.cityAmt, e.schoolAmt])) !== JSON.stringify((src.exemptions || []).map(e => [String(e.code), e.countyAmt, e.cityAmt, e.schoolAmt]))) mismatches += 1;
});

const mb = bytes => (bytes / 1024 / 1024).toFixed(1) + " MB";
console.log(`Wrote ${path.basename(outPath)}: ${decoded.length.toLocaleString()} parcels, ${mb(json.length)} (full payload was ${mb(JSON.stringify(current).length)})`);
if (compact.priorRoll) console.log(`  Prior ${compact.priorRoll.assessmentYear} values matched for ${compact.priorRoll.matchedParcels.toLocaleString()} parcels.`);
console.log(`  Round-trip check: ${mismatches ? mismatches + " mismatches" : "all core values match"}.`);
if (mismatches) process.exitCode = 1;
