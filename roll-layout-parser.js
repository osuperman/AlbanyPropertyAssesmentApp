/**
 * Parser for Albany assessment rolls extracted from the published PDF with pypdf (one line per printed
 * line, pages separated by form feeds). Each record looks like:
 *
 *   ******************************************* 75.36 -2-78 *****************
 *           5 Academy Rd    HOMESTEAD PARCEL       19726
 *   75.36-2-78         210 1 Family Res        AGED - ALL 41800       149,000  149,000     149,000
 *   Erdman Janice S         Albany        010100       59,600 ENH STAR 41834      0        0      86,100
 *   5 Academy Rd         FRNT   45.00 DPTH  113.00     298,000   COUNTY  TAXABLE VALUE  149,000
 *   Albany, NY 12208        EAST-0647290 NRTH-0966860        CITY    TAXABLE VALUE  149,000
 *             FULL MARKET VALUE      310,417   SCHOOL  TAXABLE VALUE   62,900
 *
 * The left column holds owner name lines, then the mailing street and city line. The middle column holds
 * school district and land value, lot size and total assessed value, coordinates, deed, and full market
 * value. The right column holds exemptions and taxable values.
 *
 * Records use the same shape as convert-roll.js parseTextRoll, including the temporary _ownerOccupiedZip
 * field consumed by estimatePropertyZips.
 */

const HEADER_END = /^CURRENT OWNERS ADDRESS\b/;
const DELIMITER = /^\*{20,}\s+(\d[\d.\s\-]*\d)\s*\*{3,}\s*$/;
const STAR_RULE = /^[*\s]+$/;
const SUMMARY_LINE = /S\s?U\s?M\s?M\s?A\s?R\s?Y|T\s?O\s?T\s?A\s?L\s?S\b|\*\*\*\s+[A-Z]/;
// Exemption names are words, plus statute references such as "RPTL 406(1" (municipal property, code 13350).
const EXEMPTION = /(?:^|\t|\n| {2,}|(?<=\d) )([A-Z][A-Za-z_/&'-]*(?: (?:-|[A-Za-z_/&'-]+|\d+\([\dA-Za-z]*\)?))*)[ \t]+(\d{5})[ \t]+([\d,]+)[ \t]+([\d,]+)[ \t]+([\d,]+)(?=\s|$)/g;
const SKIP_EXEMPTION_NAMES = new Set(["COUNTY TAXABLE", "CITY TAXABLE", "SCHOOL TAXABLE", "FULL MARKET", "DEED BOOK"]);
const CITY_LINE = /,?\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?\s*$/;

const num = s => parseFloat((s || "").replace(/[,$]/g, "")) || 0;

const normalizeStreetForMatch = raw => (raw || "")
  .toLowerCase()
  .replace(/\(unit\s+([^)]*)\)/g, " unit $1 ")
  .replace(/\b(?:apt|apartment|ste|suite|#)\s*/g, " unit ")
  .replace(/[.,#]/g, " ")
  .replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave").replace(/\broad\b/g, "rd").replace(/\bdrive\b/g, "dr")
  .replace(/\blane\b/g, "ln").replace(/\bplace\b/g, "pl").replace(/\bcourt\b/g, "ct").replace(/\bterrace\b/g, "ter")
  .replace(/\bboulevard\b/g, "blvd").replace(/\bnorth\b/g, "n").replace(/\bsouth\b/g, "s").replace(/\beast\b/g, "e").replace(/\bwest\b/g, "w")
  .replace(/\s+/g, " ")
  .trim();

// Remove page headers, column headers, and page-end star rules; keep record lines in order across pages.
function bodyLines(raw) {
  const out = [];
  for (const page of raw.split("\f")) {
    const lines = page.split(/\r?\n/);
    const headerEnd = lines.findIndex(line => HEADER_END.test(line.trim()));
    if (headerEnd < 0) continue; // summary and cover pages have no record column header
    for (let i = headerEnd + 1; i < lines.length; i++) {
      const line = lines[i].replace(/\s+$/, "");
      if (!line.trim()) continue;
      if (STAR_RULE.test(line) && !DELIMITER.test(line)) continue;
      out.push(line);
    }
  }
  return out;
}

function splitSegments(line) {
  const leading = line.match(/^\s*/)[0].length;
  const segments = line.trim().split(/\s{2,}/);
  return { leading, segments };
}

function parseRecord(pidFromDelimiter, lines, rollMeta) {
  // Stop at any summary block printed after the last record of a section.
  const end = lines.findIndex(line => SUMMARY_LINE.test(line) && !/TAXABLE VALUE|FULL MARKET|PARCEL TOTALS/.test(line));
  if (end >= 0) lines = lines.slice(0, end);
  // First line: address plus the tax class label. Variants: "HOMESTEAD PARCEL", "NON-HOMESTEAD PARCEL",
  // "NON-HMSTD PCL-75 PCT OF A/V USED FOR HMSTD EX" (non-homestead with a partial homestead exemption), and
  // "HOMESTEAD PART OF PARCEL" (a mixed parcel printed as homestead part, non-homestead part, parcel totals).
  const TYPE_LABEL = /(NON-HOMESTEAD|HOMESTEAD|NON-HMSTD)\s+(PARCEL|PART OF PARCEL|PCL-)/;
  const typeIdx = lines.findIndex(line => TYPE_LABEL.test(line));
  const typeLine = typeIdx >= 0 ? lines[typeIdx] : "";
  const labelAt = typeLine.search(TYPE_LABEL);
  // Special franchise parcels (utility lines and equipment, "601.1-9999-...", "601.000-0000-...") have no location; the roll prints a
  // placeholder such as "1" or the owner's mailing street in the address slot, so treat them as having no address.
  const printedAddress = (labelAt > 0 ? typeLine.slice(0, labelAt) : "").replace(/\s+/g, " ").trim();
  const isSpecialFranchise = /^\d+\.\d*-(?:9999|0000)-/.test(pidFromDelimiter.replace(/\s+/g, ""));
  const address = (!isSpecialFranchise && printedAddress && !/^\d+$/.test(printedAddress)) ? printedAddress : "No street address";
  const label = labelAt >= 0 ? typeLine.slice(labelAt) : "";
  const totalsIdx = lines.findIndex(line => /^\s*PARCEL TOTALS\b/.test(line));
  const isMixed = /PART OF PARCEL/.test(label) && totalsIdx > 0;
  let parcelType = /^NON-/.test(label) ? "NON-HOMESTEAD" : label ? "HOMESTEAD" : "NON-HOMESTEAD";

  const classIdx = lines.findIndex((line, idx) => idx > typeIdx && /^\d+\.[\d.\-]*\d\s+\d{3}\s/.test(line));
  const classLine = classIdx >= 0 ? lines[classIdx] : "";
  const classMatch = classLine.match(/^(\d+\.[\d.\-]*\d)\s+(\d{3})\s+(.+?)(?:\s{2,}|$)/);
  const parcelId = classMatch ? classMatch[1] : pidFromDelimiter.replace(/\s+/g, "");
  const propClass = classMatch ? classMatch[2] : "000";
  const propClassDesc = classMatch ? classMatch[3].trim() : "Unknown";

  const detail = lines.slice(Math.max(classIdx, typeIdx) + 1);
  const text = lines.join("\n");

  // Left column: lines that start at the margin. Their first segment is owner / mailing text.
  const leftLines = [];
  for (const line of detail) {
    const { leading, segments } = splitSegments(line);
    if (leading >= 4 || !segments[0]) continue;
    const first = segments[0];
    if (/^(?:FRNT|ACRES|EAST-|DEED BOOK|FULL MARKET|BANK|COUNTY|CITY|SCHOOL)\b/.test(first)) continue;
    leftLines.push(first.trim());
  }
  let cityIdx = -1;
  for (let i = leftLines.length - 1; i >= 0; i--) {
    if (CITY_LINE.test(leftLines[i])) { cityIdx = i; break; }
  }
  let owners = [];
  let mailStreet = "";
  let mailCity = "";
  if (cityIdx >= 1) {
    mailCity = leftLines[cityIdx];
    mailStreet = leftLines[cityIdx - 1];
    owners = leftLines.slice(0, cityIdx - 1);
    if (!owners.length) { owners = [mailStreet]; mailStreet = ""; }
  } else {
    owners = leftLines.slice(0, 1);
    mailStreet = leftLines.slice(1).join(" ");
  }
  const owner1 = (owners[0] || "Unknown").replace(/\s+/g, " ").trim();
  const owner2 = owners[1] ? owners[1].replace(/\s+/g, " ").trim() : null;
  const mailAddress = [mailStreet, mailCity].filter(Boolean).join(", ") || address;

  const albanyZipMatch = mailCity.match(/\bAlbany,?\s+NY\s+(122\d{2})\b/i);
  const anyLocalZip = mailCity.match(/\b(122\d{2})\b/);
  const zip = albanyZipMatch ? albanyZipMatch[1] : anyLocalZip ? anyLocalZip[1] : "12207";
  const ownerOccupied = !!(albanyZipMatch && address !== "No street address" && mailStreet &&
    normalizeStreetForMatch(mailStreet) === normalizeStreetForMatch(address));

  const exemptions = [];
  let exMatch;
  EXEMPTION.lastIndex = 0;
  while ((exMatch = EXEMPTION.exec(text)) !== null) {
    let name = exMatch[1].trim().replace(/^A (?=[A-Z])/, "");
    if ((name.match(/\(/g) || []).length > (name.match(/\)/g) || []).length) name += ")";
    if (SKIP_EXEMPTION_NAMES.has(name) || name.length < 2) continue;
    exemptions.push({ name, code: exMatch[2], countyAmt: num(exMatch[3]), cityAmt: num(exMatch[4]), schoolAmt: num(exMatch[5]) });
  }

  const taxable = kind => { const m = text.match(new RegExp(kind + "\\s+TAXABLE\\s+VALUE\\s+([\\d,]+)")); return m ? num(m[1]) : null; };
  const countyTaxableRaw = taxable("COUNTY");
  const cityTaxableRaw = taxable("CITY");
  const schoolTaxableRaw = taxable("SCHOOL");
  const fmvMatch = text.match(/FULL MARKET VALUE\s+([\d,]+)/);
  const fullMarketValue = fmvMatch ? num(fmvMatch[1]) : 0;
  // Lot-size lines print the total assessment after the size ("FRNT 44.00 DPTH 128.00  269,000",
  // "ACRES 11.70 BANK 90  3133,035"). Match within one line so a house number on the next line is never read
  // as the total. Values of $1 million or more print without the millions comma ("3133,035").
  const frnt = text.match(/FRNT[ \t]+([\d.]+)[ \t]+DPTH[ \t]+([\d.]+)[ \t]+([\d,]+)/);
  const acresMatch = text.match(/ACRES[ \t]+([\d.]+)(?:[ \t]+BANK[ \t]+\d+)?(?:[ \t]+([\d,]+))?/);
  const countyExemptTotal = exemptions.filter(ex => ex.code !== "99999").reduce((sum, ex) => sum + ex.countyAmt, 0);
  // Candidates in order of preference. The roll's full market value is the assessment divided by the uniform
  // percent, so the first candidate that agrees with it (within rounding) is taken. If none agrees, the value
  // implied by the full market value is used.
  const level = Number(rollMeta.uniformPercentOfValue) > 0 ? Number(rollMeta.uniformPercentOfValue) / 100 : null;
  const impliedAv = level && fullMarketValue > 0 ? fullMarketValue * level : null;
  const agrees = value => impliedAv == null || Math.abs(value - impliedAv) <= Math.max(2, impliedAv * 0.001);
  const avCandidates = [
    frnt ? num(frnt[3]) : null,
    acresMatch && acresMatch[2] ? num(acresMatch[2]) : null,
    countyTaxableRaw != null ? countyTaxableRaw + countyExemptTotal : null,
  ].filter(value => value != null && value > 0);
  let assessedValue = avCandidates.find(agrees);
  if (assessedValue == null) assessedValue = impliedAv != null ? Math.round(impliedAv) : (avCandidates[0] || 0);
  const swis = rollMeta.swisCode || "010100";
  const landMatch = text.match(new RegExp(swis + "\\s+([\\d,]+)"));
  let landValue = landMatch ? num(landMatch[1]) : 0;
  let countyTaxable = countyTaxableRaw;
  let cityTaxable = cityTaxableRaw;
  let schoolTaxable = schoolTaxableRaw;
  if (isMixed) {
    // Mixed parcels: use the PARCEL TOTALS block. Its middle column lists land (CITY line) and total
    // assessment (SCHOOL line). The tax class follows whichever part carries more assessed value.
    const totals = lines.slice(totalsIdx + 1).join("\n");
    const totalTaxable = kind => { const m = totals.match(new RegExp(kind + "\\s+TAXABLE\\s+VALUE\\s+([\\d,]+)")); return m ? num(m[1]) : null; };
    const middleBefore = (block, kind) => { const m = block.match(new RegExp("^\\s*([\\d,]+)\\s+" + kind + "\\s+TAXABLE", "m")); return m ? num(m[1]) : null; };
    countyTaxable = totalTaxable("COUNTY") ?? countyTaxable;
    cityTaxable = totalTaxable("CITY") ?? cityTaxable;
    schoolTaxable = totalTaxable("SCHOOL") ?? schoolTaxable;
    const totalLand = middleBefore(totals, "CITY");
    const totalAv = middleBefore(totals, "SCHOOL");
    if (totalLand != null) landValue = totalLand;
    if (totalAv != null) assessedValue = totalAv;
    const nonHomeIdx = lines.findIndex(line => /NON-HOMESTEAD PART OF PARCEL/.test(line));
    const homeAv = frnt ? num(frnt[3]) : null;
    const nonHomeAv = nonHomeIdx > 0 ? middleBefore(lines.slice(nonHomeIdx, totalsIdx).join("\n"), "SCHOOL") : null;
    if (homeAv != null && nonHomeAv != null) parcelType = homeAv >= nonHomeAv ? "HOMESTEAD" : "NON-HOMESTEAD";
  }
  const coords = text.match(/EAST-0?(\d+)\s+NRTH-0?(\d+)/);
  const deed = text.match(/DEED BOOK\s+(\d{4})\s+PG/);
  const deedYearRaw = deed ? parseInt(deed[1], 10) : null;
  const maxDeedYear = rollMeta.assessmentYear || new Date().getFullYear();

  return {
    recordKey: [rollMeta.assessmentYear || "unknown", rollMeta.rollType || "unknown", rollMeta.swisCode || "unknown", parcelId].join(":"),
    assessmentYear: rollMeta.assessmentYear || null,
    rollType: rollMeta.rollType || null,
    swisCode: rollMeta.swisCode || swis,
    parcelId,
    parcelIdNorm: parcelId,
    printKey: parcelId,
    pinSbl: null,
    address,
    zip,
    neighborhood: rollMeta.municipality || "Albany",
    owner1,
    owner2: owner2 && owner2 !== owner1 && owner2 !== address ? owner2 : null,
    propClass,
    propClassDesc,
    parcelType,
    landValue,
    assessedValue,
    fullMarketValue,
    countyTaxable: countyTaxable != null ? countyTaxable : assessedValue,
    cityTaxable: cityTaxable != null ? cityTaxable : assessedValue,
    schoolTaxable: schoolTaxable != null ? schoolTaxable : assessedValue,
    frontage: frnt ? parseFloat(frnt[1]) : 0,
    depth: frnt ? parseFloat(frnt[2]) : 0,
    deedYear: deedYearRaw && deedYearRaw >= 1900 && deedYearRaw <= maxDeedYear ? deedYearRaw : null,
    eastCoord: coords ? parseInt(coords[1], 10) : 0,
    nrthCoord: coords ? parseInt(coords[2], 10) : 0,
    exemptions,
    mailAddress,
    schoolDistrict: "Albany",
    municipality: rollMeta.municipality || "Albany",
    county: rollMeta.county || "Albany",
    state: rollMeta.state || "NY",
    yearBuilt: null,
    acres: acresMatch ? parseFloat(acresMatch[1]) : null,
    waterType: null,
    sewerType: null,
    parcelArea: null,
    saleDate: null,
    _ownerOccupiedZip: ownerOccupied ? albanyZipMatch[1] : null,
  };
}

function parseLayoutRoll(raw, rollMeta) {
  const lines = bodyLines(raw);
  const records = [];
  let current = null;
  for (const line of lines) {
    const delim = line.match(DELIMITER);
    if (delim) {
      if (current) records.push(current);
      current = { pid: delim[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) records.push(current);
  return records.map(rec => parseRecord(rec.pid, rec.lines, rollMeta)).filter(p => p.parcelId);
}

function looksLikeLayoutRoll(raw) {
  const sample = raw.slice(0, 200000);
  const tabs = (sample.match(/\t/g) || []).length;
  return tabs < 50 && /\bHOMESTEAD PARCEL\b/.test(sample) && /CURRENT OWNERS ADDRESS/.test(sample);
}

module.exports = { parseLayoutRoll, looksLikeLayoutRoll, normalizeStreetForMatch };
