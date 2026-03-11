const fs = require("fs");
const path = require("path");

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function lowerHeaderMap(headers) {
  return headers.map(function(header) {
    return String(header || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  });
}

function tidy(value) {
  const text = String(value == null ? "" : value).trim();
  return text || null;
}

function normalizeParcelId(value) {
  return String(value == null ? "" : value)
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, "")
    .replace(/^(?:sbl|pin|printkey)[:\s-]*/i, "")
    .trim();
}

function toInteger(value) {
  const clean = String(value == null ? "" : value).replace(/[^\d.-]/g, "").trim();
  if (!clean) return null;
  const num = Number(clean);
  return Number.isFinite(num) ? Math.round(num) : null;
}

function normalizeBuildingStyle(value) {
  const text = String(value == null ? "" : value).trim();
  if (!text) return null;
  if (/^style code\s+/i.test(text)) return text;
  if (/^\d+$/.test(text)) return "Style code " + text;
  return text;
}

function csvEscape(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function findColumn(headers) {
  const keys = Array.prototype.slice.call(arguments, 1);
  for (const key of keys) {
    const index = headers.indexOf(key);
    if (index >= 0) return index;
  }
  return -1;
}

const inputPath = path.resolve(process.cwd(), process.argv[2] || "Residential_Inventory.csv");
const csvOutPath = path.resolve(process.cwd(), process.argv[3] || "residential-inventory-2025.csv");
const jsonOutPath = path.resolve(process.cwd(), process.argv[4] || "residential-inventory-2025.json");

if (!fs.existsSync(inputPath)) {
  console.error("Input file not found: " + inputPath);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter(function(line) { return line.trim().length > 0; });
if (lines.length < 2) {
  console.error("Input file has no data rows: " + inputPath);
  process.exit(1);
}

const headers = lowerHeaderMap(parseCsvLine(lines[0]));
const c = {
  printKey: findColumn(headers, "printkey", "print_key"),
  propClass: findColumn(headers, "propclass", "prop_class"),
  houseNumber: findColumn(headers, "housenumber", "house_number", "locstnbr", "loc_st_nbr"),
  streetName: findColumn(headers, "streetname", "street_name", "locstname", "loc_st_name"),
  streetSuffix: findColumn(headers, "streetsuffix", "street_suffix", "locmailstsuff", "loc_mail_st_suff"),
  buildingStyle: findColumn(headers, "buildingstyle", "building_style", "bldgstyle", "bldg_style"),
  yearBuilt: findColumn(headers, "yearbuilt", "year_built", "yrbuilt", "yr_built"),
  sqftLivingArea: findColumn(headers, "sqftlivingarea", "sqft_living_area", "sfla"),
  bedrooms: findColumn(headers, "bedrooms", "nbrbedrooms", "nbr_bedrooms"),
  halfBaths: findColumn(headers, "halfbaths", "half_baths", "nbrhalfbaths", "nbr_half_baths"),
  fullBaths: findColumn(headers, "fullbaths", "full_baths", "nbrfullbaths", "nbr_full_baths"),
  inventoryTotalAssessedValue: findColumn(headers, "inventorytotalassessedvalue", "inventory_total_assessed_value", "totalav", "total_av")
};

if (c.printKey < 0 || c.propClass < 0) {
  console.error("Missing required inventory columns: print_key and prop_class");
  process.exit(1);
}

const rowsByPrintKey = new Map();
let duplicateCount = 0;
let repeatedHeaderCount = 0;
for (let i = 1; i < lines.length; i += 1) {
  const cols = parseCsvLine(lines[i]);
  const printKey = normalizeParcelId(cols[c.printKey]);
  if (!printKey) continue;
  if (printKey.toLowerCase() === "print_key") {
    repeatedHeaderCount += 1;
    continue;
  }
  if (rowsByPrintKey.has(printKey)) {
    duplicateCount += 1;
    continue;
  }
  const propClass = tidy(cols[c.propClass]);
  if (!propClass) continue;
  rowsByPrintKey.set(printKey, {
    printKey: printKey,
    propClass: propClass,
    houseNumber: tidy(cols[c.houseNumber]),
    streetName: tidy(cols[c.streetName]),
    streetSuffix: tidy(cols[c.streetSuffix]),
    buildingStyle: normalizeBuildingStyle(cols[c.buildingStyle]),
    yearBuilt: toInteger(cols[c.yearBuilt]),
    sqftLivingArea: toInteger(cols[c.sqftLivingArea]),
    bedrooms: toInteger(cols[c.bedrooms]),
    halfBaths: toInteger(cols[c.halfBaths]),
    fullBaths: toInteger(cols[c.fullBaths]),
    inventoryTotalAssessedValue: toInteger(cols[c.inventoryTotalAssessedValue])
  });
}

const rows = Array.from(rowsByPrintKey.values()).sort(function(a, b) {
  return a.printKey.localeCompare(b.printKey, undefined, { numeric: true });
});
const outputHeaders = [
  "printKey",
  "propClass",
  "houseNumber",
  "streetName",
  "streetSuffix",
  "buildingStyle",
  "yearBuilt",
  "sqftLivingArea",
  "bedrooms",
  "halfBaths",
  "fullBaths",
  "inventoryTotalAssessedValue"
];
const csv = [outputHeaders.join(",")]
  .concat(rows.map(function(row) {
    return outputHeaders.map(function(key) { return csvEscape(row[key]); }).join(",");
  }))
  .join("\r\n");

fs.writeFileSync(csvOutPath, csv);
fs.writeFileSync(jsonOutPath, JSON.stringify(rows));

console.log("Normalized " + rows.length.toLocaleString() + " inventory rows from " + path.basename(inputPath) + ".");
console.log("Removed " + duplicateCount.toLocaleString() + " duplicate parcel rows and " + repeatedHeaderCount.toLocaleString() + " repeated header rows.");
console.log("Wrote " + path.basename(csvOutPath) + " and " + path.basename(jsonOutPath) + ".");
