#!/usr/bin/env node
/**
 * Albany Assessment Roll TXT to JSON converter. Accepts either the pypdf layout text of the published roll PDF
 * (see roll-layout-parser.js) or the older tab-separated conversion.
 *
 * Usage:
 *   node convert-roll.js <input.txt> [output.json]
 */

const fs = require("fs");
const path = require("path");
const { enrichRollPayload } = require("./prepare-albany-data.js");
const { parseLayoutRoll, looksLikeLayoutRoll } = require("./roll-layout-parser.js");

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

// The roll has no property ZIP field; every ZIP in it comes from the owner's mailing address, which is the
// property's ZIP only when the owner lives there. For every other record (landlords, owners elsewhere, no
// 122xx ZIP at all), estimate the property ZIP by a vote of the three nearest owner-occupied homes by roll grid
// coordinates (98% agreement in a holdout test on owner-occupied homes), then from the nearest owner-occupied
// house number on the same street (95%), then from owner-occupied units on the same lot. Only Albany street-delivery ZIPs (12202-12211) are
// trusted as anchors or results: PO box and agency ZIPs (12201, 12220s-12260s) and typos never describe a
// property's location. Records with nothing to go on keep a street ZIP from the mailing address, else 12207.
// Records carry a temporary _ownerOccupiedZip field (set when the property address is also the mailing address).
const ALBANY_STREET_ZIPS = new Set(["12202", "12203", "12204", "12205", "12206", "12207", "12208", "12209", "12210", "12211"]);
function estimatePropertyZips(records) {
  const streetKey = address => (address || "").toLowerCase().replace(/^(?:rears+|pts+)?[d.-]+[a-z]?s+/i, "").replace(/s*(unit [^)]*)s*$/i, "").replace(/s+/g, " ").trim();
  const houseNumber = address => { const m = (address || "").match(/^(?:rears+|pts+)?(d+)/i); return m ? parseInt(m[1], 10) : null; };
  const lotKey = id => ((id || "").match(/^(d+.d*-d+-d+)/) || [])[1] || null;
  const anchorZip = r => (ALBANY_STREET_ZIPS.has(r._ownerOccupiedZip) ? r._ownerOccupiedZip : null);
  const GRID_CELL_FEET = 1500;
  const cellKey = (e, n) => `${Math.floor(e / GRID_CELL_FEET)}:${Math.floor(n / GRID_CELL_FEET)}`;
  const hasCoords = r => Number(r.eastCoord) > 0 && Number(r.nrthCoord) > 0;
  const ownerOccupiedByStreet = new Map();
  const ownerOccupiedZipsByLot = new Map();
  const ownerOccupiedByCell = new Map();
  for (const r of records) {
    const zip = anchorZip(r);
    if (!zip) continue;
    const key = streetKey(r.address);
    const hn = houseNumber(r.address);
    if (key && hn != null) {
      if (!ownerOccupiedByStreet.has(key)) ownerOccupiedByStreet.set(key, []);
      ownerOccupiedByStreet.get(key).push({ hn, zip });
    }
    const lot = lotKey(r.parcelId);
    if (lot) {
      const counts = ownerOccupiedZipsByLot.get(lot) || {};
      counts[zip] = (counts[zip] || 0) + 1;
      ownerOccupiedZipsByLot.set(lot, counts);
    }
    if (hasCoords(r)) {
      const cell = cellKey(r.eastCoord, r.nrthCoord);
      if (!ownerOccupiedByCell.has(cell)) ownerOccupiedByCell.set(cell, []);
      ownerOccupiedByCell.get(cell).push({ e: r.eastCoord, n: r.nrthCoord, zip });
    }
  }
  // Vote of the three nearest owner-occupied homes within two grid cells; ties go to the closest home.
  const nearestByCoords = r => {
    if (!hasCoords(r)) return null;
    const ce = Math.floor(r.eastCoord / GRID_CELL_FEET), cn = Math.floor(r.nrthCoord / GRID_CELL_FEET);
    const nearby = [];
    for (let de = -2; de <= 2; de++) for (let dn = -2; dn <= 2; dn++) {
      for (const a of ownerOccupiedByCell.get(`${ce + de}:${cn + dn}`) || []) {
        nearby.push({ d: (a.e - r.eastCoord) ** 2 + (a.n - r.nrthCoord) ** 2, zip: a.zip });
      }
    }
    if (!nearby.length) return null;
    const closest = nearby.sort((a, b) => a.d - b.d).slice(0, 3);
    const votes = new Map();
    closest.forEach((a, i) => votes.set(a.zip, (votes.get(a.zip) || 0) + 1 - i * 0.01));
    return [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  };
  for (const r of records) {
    const own = anchorZip(r);
    if (own) {
      r.zip = own;
    } else {
      const neighbors = ownerOccupiedByStreet.get(streetKey(r.address)) || [];
      const hn = houseNumber(r.address);
      let best = null;
      if (neighbors.length && hn != null) {
        for (const n of neighbors) if (!best || Math.abs(n.hn - hn) < Math.abs(best.hn - hn)) best = n;
      }
      const lotCounts = ownerOccupiedZipsByLot.get(lotKey(r.parcelId));
      const byCoords = nearestByCoords(r);
      if (byCoords) r.zip = byCoords;
      else if (best) r.zip = best.zip;
      else if (lotCounts) r.zip = Object.entries(lotCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      else r.zip = ALBANY_STREET_ZIPS.has(r.zip) ? r.zip : "12207";
    }
    delete r._zipFromRecord;
    delete r._albanyMailZip;
    delete r._ownerOccupiedZip;
  }
  return records;
}

function parseTextRoll(raw, rollMeta) {
  // Record delimiters carry the print key. Besides plain IDs (65.46-3-53) this matches condo units and split
  // lots (76.26-1-53.-101, 54.13-4-6.1) and utility special-franchise records (555.-3-441, 555.3-3640).
  const delimPat = /\*{5,}[\s*]+(\d+\.[\d.\-]*\d)[\s*]+\*{5,}/g;
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

  return estimatePropertyZips(parts.map(({ pid, blk }) => {
    const pidE = esc(pid);
    const clsM = blk.match(new RegExp(pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)")) ||
      blk.match(new RegExp("\\d+\\s+" + pidE + "\\t(\\d{3})\\s+(.+?)(?=\\s{3,}|\\t)"));
    const propClass = clsM ? clsM[1] : "000";
    const propClassDesc = clsM ? clsM[2].trim() : "Unknown";
    // Check NON-HOMESTEAD first: "NON-HOMESTEAD PARCEL" also contains the text "HOMESTEAD PARCEL".
    const parcelType = blk.includes("NON-HOMESTEAD PARCEL") ? "NON-HOMESTEAD" : blk.includes("HOMESTEAD PARCEL") ? "HOMESTEAD" : "NON-HOMESTEAD";
    const firstLine = blk.trim().split("\n")[0];
    const addrM = firstLine.match(/^(.+?)\s+(?:HOMESTEAD|NON-HOMESTEAD)/);
    // Some records (utility franchises, a few vacant or state parcels) have no street address line.
    const noStreetAddress = /^(?:NON-)?HOMESTEAD\b/.test(firstLine.trim());
    const address = noStreetAddress ? "No street address" : (addrM ? addrM[1] : firstLine).replace(/\s+/g, " ").trim();
    const albanyZipM = blk.match(/Albany,?\s+NY\s+(122\d{2})/);
    const zipM = albanyZipM || blk.match(/\b(122\d{2})\b/);
    const zip = zipM ? (zipM[1] || zipM[0]) : "12207";
    // Owner-occupied: the property address appears again later in the record as the mailing address.
    const recordAfterFirstLine = blk.replace(/^\s+/, "").split("\n").slice(1).join("\n");
    const ownerOccupied = !!(albanyZipM && !noStreetAddress && address && new RegExp("(^|\\n|\\t)\\s*" + esc(address) + "\\b").test(recordAfterFirstLine));
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
    const rollLevel = Number(rollMeta?.uniformPercentOfValue) > 0 ? Number(rollMeta.uniformPercentOfValue) / 100 : 0.96;
    const assessedValue = frntM ? num(frntM[3]) : (fullMarketValue > 0 ? Math.round(fullMarketValue * rollLevel) : 0);
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
    // Only scan this parcel's own record. Sub-parcel records (e.g. 12.34-5-6.1) are not split out above,
    // so without this cut their exemptions would be attributed to the preceding parcel.
    const nextRecordIdx = blk.search(/\*{5,}[\s*]+\d+\.[\d.\-]*\d[\s*]+\*{5,}/);
    const ownBlk = nextRecordIdx >= 0 ? blk.slice(0, nextRecordIdx) : blk;
    // Exemption names are single-space-separated words (e.g. "VETWAR CTS", "AGED - ALL"); the code may follow a single space or tab.
    const exPat = /(?:^|[\t\n]| {2,}|(?<=\d) )([A-Z][A-Za-z_/&'-]*(?: (?:-|[A-Za-z_/&'-]+))*)[ \t]+(\d{5})[ \t]+([\d,]+)[ \t]+([\d,]+)[ \t]+([\d,]+)(?=\s|$)/g;
    const skipEx = new Set(["COUNTY TAXABLE", "CITY TAXABLE", "SCHOOL TAXABLE", "FULL MARKET", "DEED BOOK"]);
    let exM;
    while ((exM = exPat.exec(ownBlk)) !== null) {
      const nm = exM[1].trim().replace(/^A (?=[A-Z])/, "");
      if (skipEx.has(nm) || nm.length < 2) continue;
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
      _zipFromRecord: !!zipM,
      _albanyMailZip: albanyZipM ? albanyZipM[1] : null,
      _ownerOccupiedZip: ownerOccupied ? albanyZipM[1] : null,
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
  }).filter(p => p.parcelId && p.assessedValue >= 0));
}

const t0 = Date.now();
const rollMeta = extractRollMetadata(text, path.basename(inFile));
// Text extracted from the published PDF with pypdf uses the printed layout; older conversions used tabs.
const layoutFormat = looksLikeLayoutRoll(text);
console.log(`  Format: ${layoutFormat ? "PDF layout text" : "tab-separated conversion"}`);
const parcels = layoutFormat ? estimatePropertyZips(parseLayoutRoll(text, rollMeta)) : parseTextRoll(text, rollMeta);
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
