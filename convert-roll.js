#!/usr/bin/env node
/**
 * Albany Assessment Roll TXT to JSON converter.
 *
 * Usage:
 *   node convert-roll.js <input.txt> [output.json]
 */

const fs = require("fs");
const path = require("path");
const { enrichRollPayload } = require("./prepare-albany-data.js");

const [,, inFile, outFile] = process.argv;
if (!inFile) {
  console.error("Usage: node convert-roll.js <input.txt> [output.json]");
  process.exit(1);
}

const out = outFile || path.basename(inFile, path.extname(inFile)) + ".json";

console.log(`Reading ${inFile} ...`);
const text = fs.readFileSync(inFile, "utf8");
console.log(`  ${(text.length / 1024 / 1024).toFixed(1)} MB read`);

function normalizeParcelId(raw) {
  return (raw || "").toString().trim().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, "").replace(/^(?:sbl|pin|printkey)[:\s-]*/i, "");
}

function normalizeSwisCode(raw) {
  const digits = (raw || "").toString().replace(/\D/g, "");
  if (!digits) return "";
  return digits.padStart(6, "0").slice(-6);
}

function parseRollDate(raw) {
  const MONTHS = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const match = (raw || "").toString().trim().match(/^([A-Za-z]{3})\s+(\d{2}),\s*(\d{4})$/);
  if (!match) return null;
  const mm = MONTHS[match[1].toLowerCase()];
  return mm ? `${match[3]}-${mm}-${match[2]}` : null;
}

function extractRollMetadata(raw, sourceName) {
  const lines = raw.split(/\r?\n/);
  const tidyName = value => value ? value.toString().trim().replace(/\s+/g, " ").replace(/\b[a-z]/g, ch => ch.toUpperCase()) : null;
  const headerLine = lines.find(line => /COUNTY/i.test(line) && /SWIS/i.test(line)) || "";
  const rollLine = lines.find(line => line.replace(/\s+/g, "").toUpperCase().includes("ASSESSMENTROLL")) || "";
  const compactRollLine = rollLine.replace(/\s+/g, "").toUpperCase();
  const county = tidyName(headerLine.match(/COUNTY\s*-\s*([A-Za-z .']+?)(?=\s+(?:CITY|TOWN|VILLAGE)\s*-|$)/i)?.[1]) || "Albany";
  const municipality = tidyName(headerLine.match(/(?:CITY|TOWN|VILLAGE)\s*-\s*([A-Za-z .']+?)(?=\s+SWIS\s*-|$)/i)?.[1]) || "Albany";
  const swisCode = normalizeSwisCode(headerLine.match(/SWIS\s*-\s*(\d{6})/i)?.[1] || "010100");
  const yearMatch = compactRollLine.match(/(20\d{2})(FINAL|TENTATIVE)ASSESSMENTROLL/i);
  const assessmentYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
  const rollType = yearMatch ? (yearMatch[2] || "").toLowerCase() : "";
  const valuationDate = parseRollDate(raw.match(/VALUATION DATE-([A-Z]{3}\s+\d{2},\s+\d{4})/i)?.[1] || "");
  const taxableStatusDate = parseRollDate(raw.match(/TAXABLE STATUS DATE-([A-Z]{3}\s+\d{2},\s+\d{4})/i)?.[1] || "");
  const uniformPercentMatch = raw.match(/UNIFORM PERCENT OF VALUE IS\s+([0-9.]+)/i)?.[1] || null;
  return {
    dataset: "albany_assessment_roll",
    municipality,
    county,
    state: "NY",
    assessmentYear,
    rollType,
    swisCode,
    valuationDate,
    taxableStatusDate,
    uniformPercentOfValue: uniformPercentMatch ? parseFloat(uniformPercentMatch) : null,
    source: sourceName,
  };
}

function parseTextRoll(raw, rollMeta) {
  const delimPat = /\*{5,}[\s*]+(\d+\.\d+-\d+-\d+)[\s*]+\*{5,}/g;
  const parts = [];
  let m, lastIdx = 0, lastPid = null;
  while ((m = delimPat.exec(raw)) !== null) {
    if (lastPid !== null) parts.push({ pid: lastPid, blk: raw.slice(lastIdx, m.index) });
    lastPid = m[1];
    lastIdx = m.index + m[0].length;
  }
  if (lastPid) parts.push({ pid: lastPid, blk: raw.slice(lastIdx) });

  const num = s => parseFloat((s || "").replace(/[,$]/g, "")) || 0;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const swisPattern = rollMeta.swisCode || "010100";

  return parts.map(({ pid, blk }) => {
    const pidE = esc(pid);
    const clsM = blk.match(new RegExp(pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)")) ||
      blk.match(new RegExp("\\d+\\s+" + pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)"));
    const propClass = clsM ? clsM[1] : "000";
    const propClassDesc = clsM ? clsM[2].trim() : "Unknown";
    const parcelType = blk.includes("HOMESTEAD PARCEL") ? "HOMESTEAD" : "NON-HOMESTEAD";
    const firstLine = blk.trim().split("\n")[0];
    const addrM = firstLine.match(/^(.+?)\s+(?:HOMESTEAD|NON-HOMESTEAD)/);
    const address = (addrM ? addrM[1] : firstLine).replace(/\s+/g, " ").trim();
    const zipM = blk.match(/Albany,?\s+NY\s+(122\d{2})/) || blk.match(/\b(122\d{2})\b/);
    const zip = zipM ? (zipM[1] || zipM[0]) : "12207";
    let ownM = blk.match(new RegExp("(?:\\t|\\n)([A-Z][^\\t\\n]+?)\\t(?:Albany|ALBANY)\\s*\\t?" + swisPattern)) ||
      blk.match(new RegExp("(?:\\t|\\n)([A-Z][^\\t\\n]+?)\\s{3,}(?:Albany|ALBANY)\\s*\\t?" + swisPattern));
    if (!ownM) ownM = blk.match(new RegExp("([A-Z][^0-9\\t\\n]{2,45}?)\\s+(?:Albany|ALBANY)\\s*\\t?" + swisPattern));
    let owner1 = ownM ? ownM[1].trim().replace(/\s*(?:BAS STAR|ENH STAR|AGED|VET|WHOLLY).*$/i, "").trim() : null;
    const own2M = blk.match(/\n([A-Z][^0-9\t\n]+?)\tFRNT/) || blk.match(/[\d,]+ ([A-Z][^0-9\t\n]+?)\tFRNT/);
    let owner2 = own2M ? own2M[1].trim() : null;
    if (owner2 === owner1 || owner2 === address) owner2 = null;
    const landM = blk.match(new RegExp(swisPattern + "\\s+([\\d,]+)\\s+(?:COUNTY|CITY)\\s+TAXABLE"));
    const landValue = landM ? num(landM[1]) : 0;
    const fmvM = blk.match(/FULL MARKET VALUE\s+([\d,]+)/);
    const fullMarketValue = fmvM ? num(fmvM[1]) : 0;
    const frntM = blk.match(/FRNT\s+([\d.]+)\s+DPTH\s+([\d.]+)\s+([\d,]+)/);
    const frontage = frntM ? parseFloat(frntM[1]) : 0;
    const depth = frntM ? parseFloat(frntM[2]) : 0;
    const assessedValue = frntM ? num(frntM[3]) : (fullMarketValue > 0 ? Math.round(fullMarketValue * 0.96) : 0);
    const ctyM = blk.match(/COUNTY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const cityM = blk.match(/CITY\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const schM = blk.match(/SCHOOL\s+TAXABLE\s+VALUE\s+([\d,]+)/);
    const countyTaxable = ctyM ? num(ctyM[1]) : assessedValue;
    const cityTaxable = cityM ? num(cityM[1]) : assessedValue;
    const schoolTaxable = schM ? num(schM[1]) : assessedValue;
    const coordM = blk.match(/EAST-0?(\d+)\s+NRTH-0?(\d+)/);
    const eastCoord = coordM ? parseInt(coordM[1], 10) : 0;
    const nrthCoord = coordM ? parseInt(coordM[2], 10) : 0;
    const deedM = blk.match(/DEED BOOK\s+(\d{4})\s+PG/);
    const dy = deedM ? parseInt(deedM[1], 10) : null;
    const deedYear = dy && dy >= 1900 && dy <= 2025 ? dy : null;
    const exemptions = [];
    const exPat = /([A-Z][A-Za-z\s\-]{1,20}?)\s{2,}(\d{5})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/g;
    const skipEx = new Set(["COUNTY TAXABLE", "CITY TAXABLE", "SCHOOL TAXABLE", "FULL MARKET", "DEED BOOK"]);
    let exM;
    while ((exM = exPat.exec(blk)) !== null) {
      const nm = exM[1].trim();
      if (skipEx.has(nm) || nm.length < 3) continue;
      exemptions.push({
        name: nm,
        code: exM[2],
        countyAmt: num(exM[3]),
        cityAmt: num(exM[4]),
        schoolAmt: num(exM[5]),
      });
    }
    const mailM = blk.match(/(\d+[^\n]+?),?\s+([A-Z]{2})\s+(1\d{4})(?=[\s\n])/);
    const mailAddress = mailM ? `${mailM[1].trim()}, ${mailM[2]} ${mailM[3]}` : address;
    const parcelIdNorm = normalizeParcelId(pid);
    const recordKey = [rollMeta.assessmentYear || "unknown", rollMeta.rollType || "unknown", rollMeta.swisCode || "unknown", parcelIdNorm || "unknown"].join(":");
    return {
      recordKey,
      assessmentYear: rollMeta.assessmentYear || null,
      rollType: rollMeta.rollType || null,
      swisCode: rollMeta.swisCode || swisPattern,
      parcelId: pid,
      parcelIdNorm,
      printKey: pid,
      pinSbl: null,
      address,
      zip,
      neighborhood: rollMeta.municipality || "Albany",
      owner1: owner1 || "Unknown",
      owner2,
      propClass,
      propClassDesc,
      parcelType,
      landValue,
      assessedValue,
      fullMarketValue,
      countyTaxable,
      cityTaxable,
      schoolTaxable,
      frontage,
      depth,
      deedYear,
      eastCoord,
      nrthCoord,
      exemptions,
      mailAddress,
      schoolDistrict: "Albany",
      municipality: rollMeta.municipality || "Albany",
      county: rollMeta.county || "Albany",
      state: rollMeta.state || "NY",
      yearBuilt: null,
      acres: null,
      waterType: null,
      sewerType: null,
      parcelArea: null,
      saleDate: null,
    };
  }).filter(p => p.parcelId && p.assessedValue >= 0);
}

const t0 = Date.now();
const rollMeta = extractRollMetadata(text, path.basename(inFile));
const parcels = parseTextRoll(text, rollMeta);
const elapsed = Date.now() - t0;

console.log(`  Parsed ${parcels.length.toLocaleString()} parcels in ${elapsed}ms`);
console.log("  Computing metadata...");

const zipSet = new Set();
const clsMap = {};
const exSet = new Set();
const deedMap = {};
const fmvBkts = {"<100k":0,"100-200k":0,"200-300k":0,"300-400k":0,"400-500k":0,"500-750k":0,"750k+":0};
for (const p of parcels) {
  zipSet.add(p.zip);
  clsMap[p.propClass] = p.propClassDesc;
  for (const e of p.exemptions) exSet.add(e.name);
  if (p.deedYear) deedMap[p.deedYear] = (deedMap[p.deedYear] || 0) + 1;
  const v = p.fullMarketValue;
  if (v < 100000) fmvBkts["<100k"]++;
  else if (v < 200000) fmvBkts["100-200k"]++;
  else if (v < 300000) fmvBkts["200-300k"]++;
  else if (v < 400000) fmvBkts["300-400k"]++;
  else if (v < 500000) fmvBkts["400-500k"]++;
  else if (v < 750000) fmvBkts["500-750k"]++;
  else fmvBkts["750k+"]++;
}

const meta = {
  ...rollMeta,
  zips: [...zipSet].sort(),
  classes: Object.entries(clsMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([code,desc])=>({code,desc})),
  exemptionNames: [...exSet].sort(),
  deedYears: Object.entries(deedMap).sort((a,b)=>a[0]-b[0]).map(([year,count])=>({year:+year,count})),
  fmvBuckets: Object.entries(fmvBkts).map(([range,count])=>({range,count})),
};

let payload = {
  version: 3,
  dataset: "albany_assessment_roll",
  municipality: rollMeta.municipality,
  county: rollMeta.county,
  state: rollMeta.state,
  assessmentYear: rollMeta.assessmentYear,
  rollType: rollMeta.rollType,
  swisCode: rollMeta.swisCode,
  valuationDate: rollMeta.valuationDate,
  taxableStatusDate: rollMeta.taxableStatusDate,
  uniformPercentOfValue: rollMeta.uniformPercentOfValue,
  source: path.basename(inFile),
  sourceFiles: [path.basename(inFile)],
  parsedAt: new Date().toISOString(),
  meta,
  parcels,
};

payload = enrichRollPayload(payload, {
  countyCsvPath: path.resolve(process.cwd(), "Albany_County_Parcels_2024_-1728787929616575091.csv"),
  geometryJsonPath: path.resolve(process.cwd(), "albany-parcel-geometry.json"),
});
const json = JSON.stringify(payload);
fs.writeFileSync(out, json);

const inSz = (text.length / 1024).toFixed(0);
const outSz = (json.length / 1024).toFixed(0);
console.log(`  Input:  ${inSz} KB`);
console.log(`  Output: ${outSz} KB  (${(100 - json.length / text.length * 100).toFixed(0)}% smaller)`);
console.log(`\nWritten to: ${out}`);
console.log("  Drag this .json file into the dashboard for instant load.");
