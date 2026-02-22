#!/usr/bin/env node
/**
 * Albany Assessment Roll TXT → JSON Converter
 * --------------------------------------------
 * Usage:  node convert-roll.js <input.txt> [output.json]
 *
 * Converts the raw Albany Final Assessment Roll .txt file into a compact
 * JSON file that loads ~50-100x faster in the dashboard.
 *
 * Example:
 *   node convert-roll.js "Albany 2025 Final Roll.txt" albany-roll.json
 *
 * Then drag albany-roll.json into the dashboard instead of the .txt file.
 */

const fs   = require("fs");
const path = require("path");

const [,, inFile, outFile] = process.argv;
if (!inFile) {
  console.error("Usage: node convert-roll.js <input.txt> [output.json]");
  process.exit(1);
}

const out = outFile || path.basename(inFile, path.extname(inFile)) + ".json";

console.log(`Reading ${inFile} ...`);
const text = fs.readFileSync(inFile, "utf8");
console.log(`  ${(text.length / 1024 / 1024).toFixed(1)} MB read`);

/* ─── PARSER (mirrors parseTextRoll in the dashboard) ─── */

function parseTextRoll(text) {
  const delimPat = /\*{5,}[\s*]+(\d+\.\d+-\d+-\d+)[\s*]+\*{5,}/g;
  const parts = [];
  let m, lastIdx = 0, lastPid = null;
  while ((m = delimPat.exec(text)) !== null) {
    if (lastPid !== null) parts.push({ pid: lastPid, blk: text.slice(lastIdx, m.index) });
    lastPid = m[1]; lastIdx = m.index + m[0].length;
  }
  if (lastPid) parts.push({ pid: lastPid, blk: text.slice(lastIdx) });

  const num = s => parseFloat((s || "").replace(/[,$]/g, "")) || 0;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return parts.map(({ pid, blk }) => {
    const pidE = esc(pid);

    // Property class
    const clsM = blk.match(new RegExp(pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)")) ||
                 blk.match(new RegExp("\\d+\\s+" + pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)"));
    const propClass    = clsM ? clsM[1] : "000";
    const propClassDesc = clsM ? clsM[2].trim() : "Unknown";

    // Address
    const parcelType = blk.includes("HOMESTEAD PARCEL") ? "HOMESTEAD" : "NON-HOMESTEAD";
    const firstLine  = blk.trim().split("\n")[0];
    const addrM      = firstLine.match(/^(.+?)\s+(?:HOMESTEAD|NON-HOMESTEAD)/);
    const address    = (addrM ? addrM[1] : firstLine).replace(/\s+/g, " ").trim();

    // ZIP — full Albany 122xx range
    const zipM = blk.match(/Albany,?\s+NY\s+(122\d{2})/) || blk.match(/\b(122\d{2})\b/);
    const zip  = zipM ? (zipM[1] || zipM[0]) : "12207";

    // Owner1 — primary tab-anchored pattern, then space-anchored fallback for page-break records
    let ownM = blk.match(/(?:\t|\n)([A-Z][^\t\n]+?)\t(?:Albany|ALBANY)\s*\t?010100/) ||
               blk.match(/(?:\t|\n)([A-Z][^\t\n]+?)\s{3,}(?:Albany|ALBANY)\s*\t?010100/);
    if (!ownM) ownM = blk.match(/([A-Z][^0-9\t\n]{2,45}?)\s+(?:Albany|ALBANY)\s*\t?010100/);
    let owner1 = ownM
      ? ownM[1].trim().replace(/\s*(?:BAS STAR|ENH STAR|AGED|VET|WHOLLY).*$/i, "").trim()
      : null;

    // Owner2 — co-owner line before FRNT
    const own2M = blk.match(/\n([A-Z][^0-9\t\n]+?)\tFRNT/) ||
                  blk.match(/[\d,]+ ([A-Z][^0-9\t\n]+?)\tFRNT/);
    let owner2 = own2M ? own2M[1].trim() : null;
    if (owner2 === owner1 || owner2 === address) owner2 = null;

    // Land / assessed / FMV
    const landM         = blk.match(/010100\s+([\d,]+)\s+(?:COUNTY|CITY)\s+TAXABLE/);
    const landValue     = landM ? num(landM[1]) : 0;
    const fmvM          = blk.match(/FULL MARKET VALUE\s+([\d,]+)/);
    const fullMarketValue = fmvM ? num(fmvM[1]) : 0;
    const frntM         = blk.match(/FRNT\s+([\d.]+)\s+DPTH\s+([\d.]+)\s+([\d,]+)/);
    const frontage      = frntM ? parseFloat(frntM[1]) : 0;
    const depth         = frntM ? parseFloat(frntM[2]) : 0;
    const assessedValue = frntM
      ? num(frntM[3])
      : fullMarketValue > 0 ? Math.round(fullMarketValue * 0.96) : 0;

    // Taxable values — handle single or double spaces
    const ctyM  = blk.match(/COUNTY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const cityM = blk.match(/CITY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const schM  = blk.match(/SCHOOL\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const countyTaxable = ctyM  ? num(ctyM[1])  : assessedValue;
    const cityTaxable   = cityM ? num(cityM[1]) : assessedValue;
    const schoolTaxable = schM  ? num(schM[1])  : assessedValue;

    // Coordinates and deed year
    const coordM   = blk.match(/EAST-0?(\d+)\s+NRTH-0?(\d+)/);
    const eastCoord = coordM ? parseInt(coordM[1]) : 0;
    const nrthCoord = coordM ? parseInt(coordM[2]) : 0;
    const deedM    = blk.match(/DEED BOOK\s+(\d{4})\s+PG/);
    const dy       = deedM ? parseInt(deedM[1]) : null;
    const deedYear = dy && dy >= 1900 && dy <= 2025 ? dy : null;

    // Exemptions — allow mixed case names
    const exemptions = [];
    const exPat = /([A-Z][A-Za-z\s\-]{1,20}?)\s{2,}(\d{5})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/g;
    const skipEx = new Set(["COUNTY TAXABLE","CITY TAXABLE","SCHOOL TAXABLE","FULL MARKET","DEED BOOK"]);
    let exM;
    while ((exM = exPat.exec(blk)) !== null) {
      const nm = exM[1].trim();
      if (skipEx.has(nm) || nm.length < 3) continue;
      exemptions.push({
        name: nm, code: exM[2],
        countyAmt: num(exM[3]), cityAmt: num(exM[4]), schoolAmt: num(exM[5])
      });
    }

    // Mailing address
    const mailM      = blk.match(/(\d+[^\n]+?),?\s+([A-Z]{2})\s+(1\d{4})(?=[\s\n])/);
    const mailAddress = mailM ? `${mailM[1].trim()}, ${mailM[2]} ${mailM[3]}` : address;

    return {
      parcelId: pid, address, zip, neighborhood: "Albany",
      owner1: owner1 || "Unknown", owner2,
      propClass, propClassDesc, parcelType,
      landValue, assessedValue, fullMarketValue,
      countyTaxable, cityTaxable, schoolTaxable,
      frontage, depth, deedYear, eastCoord, nrthCoord, exemptions,
      mailAddress,
      yearBuilt: null, municipality: null, schoolDistrict: "Albany",
      acres: null, waterType: null, sewerType: null, parcelArea: null, saleDate: null
    };
  }).filter(p => p.parcelId && p.assessedValue >= 0);
}

/* ─── RUN ─── */

const t0 = Date.now();
const parcels = parseTextRoll(text);
const elapsed = Date.now() - t0;

console.log(`  Parsed ${parcels.length.toLocaleString()} parcels in ${elapsed}ms`);

// Wrap in the same envelope the dashboard expects from JSON uploads
const payload = { version: 1, source: path.basename(inFile), parsedAt: new Date().toISOString(), parcels };
const json = JSON.stringify(payload);
fs.writeFileSync(out, json);

const inSz  = (text.length   / 1024).toFixed(0);
const outSz = (json.length   / 1024).toFixed(0);
console.log(`  Input:  ${inSz} KB`);
console.log(`  Output: ${outSz} KB  (${(100 - json.length / text.length * 100).toFixed(0)}% smaller)`);
console.log(`\n✅  Written to: ${out}`);
console.log(`   Drag this .json file into the dashboard for instant load.`);
