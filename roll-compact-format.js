/**
 * Compact storage format for albany-roll.json.
 *
 * The full roll payload (one object per parcel, ~48 MB for Albany) repeats every field name and many long
 * strings. The compact format stores one array per parcel in a fixed column order, replaces repeated strings
 * with indexes into lookup lists, packs nested objects into short arrays, and drops values that can be
 * rebuilt (record keys, parcel ID copies, per-parcel copies of roll-wide constants). The prior year's key
 * values are stored as extra columns so the app can show year-over-year changes without a second file.
 *
 * decodeCompactRollPayload must stay self-contained (no outside references): the dashboard stringifies it
 * into its background parse worker.
 */

const COMPACT_FORMAT = "albany-roll-compact";
const COMPACT_FORMAT_VERSION = 1;

// Columns in row order. "d:" columns are lookup indexes into payload.dicts[name] (-1 = null).
const COLUMNS = [
  "parcelId", "address", "zip", "d:neighborhood", "d:neighborhoodLabel", "d:neighborhoodAssociation",
  "owner1", "owner2", "propClass", "d:propClassDesc", "d:parcelType", "landValue", "assessedValue",
  "fullMarketValue", "countyTaxable", "cityTaxable", "schoolTaxable", "frontage", "depth", "deedYear",
  "eastCoord", "nrthCoord", "exemptions", "mailAddress", "d:schoolDistrict", "d:municipality", "yearBuilt",
  "acres", "d:waterType", "d:sewerType", "parcelArea", "saleDate", "inventory", "qualityWarnings",
  "joins", "entityRegistryMatch", "prior",
];

function encodeCompactRollPayload(full, prior = null) {
  const dicts = {};
  const indexes = {};
  const dictIndex = (name, value) => {
    if (value == null || value === "") return -1;
    if (!dicts[name]) { dicts[name] = []; indexes[name] = new Map(); }
    const key = String(value);
    if (!indexes[name].has(key)) { indexes[name].set(key, dicts[name].length); dicts[name].push(key); }
    return indexes[name].get(key);
  };
  const joinCode = value => value === "matched" ? 1 : value === "missing" ? 2 : 0;
  const round2 = value => value == null || !Number.isFinite(Number(value)) ? null : Math.round(Number(value) * 100) / 100;
  const priorById = new Map();
  if (prior && Array.isArray(prior.parcels)) for (const p of prior.parcels) priorById.set(p.parcelId, p);
  let priorMatched = 0;

  const rows = full.parcels.map(p => {
    const exemptions = Array.isArray(p.exemptions) && p.exemptions.length
      ? p.exemptions.map(ex => [String(ex.code || ""), dictIndex("exemptionName", ex.name), ex.countyAmt || 0, ex.cityAmt || 0, ex.schoolAmt || 0])
      : 0;
    const inv = p.inventory && typeof p.inventory === "object" ? p.inventory : null;
    const inventory = inv ? [
      dictIndex("buildingStyle", inv.buildingStyle), inv.yearBuilt ?? null, inv.sqftLivingArea ?? null, inv.bedrooms ?? null,
      inv.fullBaths ?? null, inv.halfBaths ?? null, inv.inventoryTotalAssessedValue ?? null, inv.propClass ?? null,
    ] : 0;
    const warnings = Array.isArray(p.qualityWarnings) && p.qualityWarnings.length
      ? [...new Set(p.qualityWarnings)].map(w => dictIndex("qualityWarning", w))
      : 0;
    const quality = p.quality && typeof p.quality === "object" ? p.quality : {};
    const joins = [
      joinCode(p.countyReferenceJoin),
      joinCode(p.geometryJoin),
      joinCode(p.neighborhoodJoin),
      quality.residentialInventoryJoin === "matched" ? 1 : quality.residentialInventoryJoin === "missing" ? 2 : 0,
    ];
    const erm = p.entityRegistryMatch && typeof p.entityRegistryMatch === "object"
      ? [p.entityRegistryMatch.matched ? 1 : 0, p.entityRegistryMatch.propertyAddressMatch ? 1 : 0]
      : 0;
    let priorRow = 0;
    const pp = priorById.get(p.parcelId);
    if (pp) {
      priorMatched += 1;
      priorRow = [
        pp.assessedValue ?? null, pp.landValue ?? null, pp.fullMarketValue ?? null,
        pp.countyTaxable ?? null, pp.cityTaxable ?? null, pp.schoolTaxable ?? null,
        Array.isArray(pp.exemptions) && pp.exemptions.length ? pp.exemptions.map(ex => String(ex.code || "")) : 0,
        pp.owner1 && pp.owner1 !== p.owner1 ? pp.owner1 : 0,
        pp.propClass && pp.propClass !== p.propClass ? pp.propClass : 0,
        pp.parcelType && pp.parcelType !== p.parcelType ? dictIndex("parcelType", pp.parcelType) : -1,
      ];
    }
    return [
      p.parcelId, p.address || "", p.zip || "", dictIndex("neighborhood", p.neighborhood),
      dictIndex("neighborhood", p.neighborhoodLabel), dictIndex("neighborhoodAssociation", p.neighborhoodAssociation),
      p.owner1 || "", p.owner2 || null, p.propClass || "", dictIndex("propClassDesc", p.propClassDesc), dictIndex("parcelType", p.parcelType),
      p.landValue ?? 0, p.assessedValue ?? 0, p.fullMarketValue ?? 0, p.countyTaxable ?? 0, p.cityTaxable ?? 0, p.schoolTaxable ?? 0,
      round2(p.frontage) || 0, round2(p.depth) || 0, p.deedYear ?? null, p.eastCoord || 0, p.nrthCoord || 0,
      exemptions, p.mailAddress || "", dictIndex("schoolDistrict", p.schoolDistrict), dictIndex("municipality", p.municipality),
      p.yearBuilt ?? null, round2(p.acres), dictIndex("waterType", p.waterType), dictIndex("sewerType", p.sewerType),
      p.parcelArea == null ? null : Math.round(Number(p.parcelArea)), p.saleDate ?? null, inventory, warnings, joins, erm, priorRow,
    ];
  });

  const { parcels, ...top } = full;
  const invSource = full.parcels.find(p => p.inventory && p.inventory.joinSource)?.inventory?.joinSource || null;
  return {
    ...top,
    format: COMPACT_FORMAT,
    formatVersion: COMPACT_FORMAT_VERSION,
    inventorySource: invSource,
    priorRoll: prior ? {
      assessmentYear: prior.assessmentYear ?? null,
      rollType: prior.rollType ?? null,
      valuationDate: prior.valuationDate ?? null,
      taxableStatusDate: prior.taxableStatusDate ?? null,
      uniformPercentOfValue: prior.uniformPercentOfValue ?? null,
      source: prior.source ?? null,
      matchedParcels: priorMatched,
      priorParcelCount: prior.parcels.length,
    } : null,
    columns: COLUMNS,
    dicts,
    rows,
  };
}

function isCompactRollPayload(payload) {
  return !!(payload && typeof payload === "object" && payload.format === "albany-roll-compact" && Array.isArray(payload.rows));
}

// Rebuilds the full per-parcel objects the dashboard and engine expect.
function decodeCompactRollPayload(payload) {
  if (!payload || payload.format !== "albany-roll-compact" || !Array.isArray(payload.rows)) return null;
  const cols = payload.columns || [];
  const dicts = payload.dicts || {};
  const at = {};
  cols.forEach((name, idx) => { at[name.replace(/^d:/, "")] = idx; });
  const lookup = (name, idx) => (idx == null || idx < 0 || !dicts[name]) ? null : (dicts[name][idx] ?? null);
  const joinText = code => code === 1 ? "matched" : code === 2 ? "missing" : null;
  const prior = payload.priorRoll || null;
  const year = payload.assessmentYear ?? null;
  const rollType = payload.rollType ?? null;
  const swisCode = payload.swisCode ?? null;
  const county = payload.county ?? null;
  const state = payload.state ?? "NY";
  const invSource = payload.inventorySource ?? null;
  const get = (row, name) => row[at[name]];
  return payload.rows.map(row => {
    const parcelId = get(row, "parcelId");
    const exemptionsRaw = get(row, "exemptions");
    const exemptions = Array.isArray(exemptionsRaw)
      ? exemptionsRaw.map(ex => ({ name: lookup("exemptionName", ex[1]) || "", code: ex[0], countyAmt: ex[2], cityAmt: ex[3], schoolAmt: ex[4] }))
      : [];
    const invRaw = get(row, "inventory");
    const inventory = Array.isArray(invRaw) ? {
      printKey: parcelId,
      propClass: invRaw[7] ?? null,
      buildingStyle: lookup("buildingStyle", invRaw[0]),
      yearBuilt: invRaw[1],
      sqftLivingArea: invRaw[2],
      bedrooms: invRaw[3],
      fullBaths: invRaw[4],
      halfBaths: invRaw[5],
      inventoryTotalAssessedValue: invRaw[6],
      joinSource: invSource,
      joinConfidence: "print_key_and_class",
    } : undefined;
    const warningsRaw = get(row, "qualityWarnings");
    const qualityWarnings = Array.isArray(warningsRaw) ? warningsRaw.map(idx => lookup("qualityWarning", idx)).filter(Boolean) : [];
    const joins = get(row, "joins") || [0, 0, 0, 0];
    const ermRaw = get(row, "entityRegistryMatch");
    const priorRaw = get(row, "prior");
    const parcel = {
      recordKey: [year || "unknown", rollType || "unknown", swisCode || "unknown", parcelId].join(":"),
      assessmentYear: year,
      rollType,
      swisCode,
      parcelId,
      parcelIdNorm: parcelId,
      printKey: parcelId,
      pinSbl: null,
      address: get(row, "address"),
      zip: get(row, "zip"),
      neighborhood: lookup("neighborhood", get(row, "neighborhood")),
      neighborhoodLabel: lookup("neighborhood", get(row, "neighborhoodLabel")),
      neighborhoodAssociation: lookup("neighborhoodAssociation", get(row, "neighborhoodAssociation")),
      owner1: get(row, "owner1"),
      owner2: get(row, "owner2"),
      propClass: get(row, "propClass"),
      propClassDesc: lookup("propClassDesc", get(row, "propClassDesc")) || "",
      parcelType: lookup("parcelType", get(row, "parcelType")) || "",
      landValue: get(row, "landValue"),
      assessedValue: get(row, "assessedValue"),
      fullMarketValue: get(row, "fullMarketValue"),
      countyTaxable: get(row, "countyTaxable"),
      cityTaxable: get(row, "cityTaxable"),
      schoolTaxable: get(row, "schoolTaxable"),
      frontage: get(row, "frontage"),
      depth: get(row, "depth"),
      deedYear: get(row, "deedYear"),
      eastCoord: get(row, "eastCoord"),
      nrthCoord: get(row, "nrthCoord"),
      exemptions,
      mailAddress: get(row, "mailAddress"),
      schoolDistrict: lookup("schoolDistrict", get(row, "schoolDistrict")),
      municipality: lookup("municipality", get(row, "municipality")),
      county,
      state,
      yearBuilt: get(row, "yearBuilt"),
      acres: get(row, "acres"),
      waterType: lookup("waterType", get(row, "waterType")),
      sewerType: lookup("sewerType", get(row, "sewerType")),
      parcelArea: get(row, "parcelArea"),
      saleDate: get(row, "saleDate"),
      countyReferenceJoin: joinText(joins[0]),
      geometryJoin: joinText(joins[1]),
      neighborhoodJoin: joinText(joins[2]),
      qualityWarnings,
      quality: {
        countyReferenceJoin: joinText(joins[0]),
        hasGeometry: joins[1] === 1 ? true : joins[1] === 2 ? false : null,
        warnings: qualityWarnings,
        residentialInventoryJoin: joinText(joins[3]),
      },
    };
    if (inventory) parcel.inventory = inventory;
    if (Array.isArray(ermRaw)) parcel.entityRegistryMatch = { matched: !!ermRaw[0], propertyAddressMatch: !!ermRaw[1] };
    if (Array.isArray(priorRaw) && prior) {
      parcel.prior = {
        assessmentYear: prior.assessmentYear ?? null,
        uniformPercentOfValue: prior.uniformPercentOfValue ?? null,
        assessedValue: priorRaw[0],
        landValue: priorRaw[1],
        fullMarketValue: priorRaw[2],
        countyTaxable: priorRaw[3],
        cityTaxable: priorRaw[4],
        schoolTaxable: priorRaw[5],
        exemptionCodes: Array.isArray(priorRaw[6]) ? priorRaw[6] : [],
        owner1: priorRaw[7] ? priorRaw[7] : parcel.owner1,
        ownerChanged: !!priorRaw[7],
        propClass: priorRaw[8] ? priorRaw[8] : parcel.propClass,
        parcelType: priorRaw[9] != null && priorRaw[9] >= 0 ? (lookup("parcelType", priorRaw[9]) || parcel.parcelType) : parcel.parcelType,
      };
    }
    return parcel;
  });
}

module.exports = { COMPACT_FORMAT, COMPACT_FORMAT_VERSION, encodeCompactRollPayload, isCompactRollPayload, decodeCompactRollPayload };
