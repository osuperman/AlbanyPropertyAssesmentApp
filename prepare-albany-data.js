#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function normalizeParcelId(raw) {
  return (raw || '').toString().trim().replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '').replace(/^(?:sbl|pin|printkey)[:\s-]*/i, '');
}

function normalizeSwisCode(raw) {
  const digits = (raw || '').toString().replace(/\D/g, '');
  if (!digits) return '';
  return digits.padStart(6, '0').slice(-6);
}

function normalizeZip5(raw) {
  const match = (raw || '').toString().match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
}

function toNumber(raw) {
  const value = parseFloat((raw || '').toString().replace(/[$,\s]/g, ''));
  return Number.isFinite(value) ? value : null;
}

function tidyLabel(raw) {
  const value = (raw || '').toString().trim().replace(/\s+/g, ' ');
  return value || null;
}

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQ = false;
  for (const ch of line + ',') {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) {
      cols.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  return cols;
}

function lowerHeaderMap(headers) {
  return headers.map(h => h.trim().toLowerCase().replace(/[\s\-\/]/g, '_').replace(/[^a-z0-9_]/g, ''));
}

function normalizeStreetKeyForCompare(raw) {
  if (!raw) return '';
  const DIR = { n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w', ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw', se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw' };
  const SUF = { street: 'st', st: 'st', avenue: 'ave', ave: 'ave', road: 'rd', rd: 'rd', boulevard: 'blvd', blvd: 'blvd', drive: 'dr', dr: 'dr', lane: 'ln', ln: 'ln', court: 'ct', ct: 'ct', terrace: 'ter', ter: 'ter', place: 'pl', pl: 'pl', circle: 'cir', cir: 'cir', way: 'way', highway: 'hwy', hwy: 'hwy', parkway: 'pkwy', pkwy: 'pkwy' };
  const STOP = new Set(['apt', 'apartment', 'unit', 'ste', 'suite', 'fl', 'floor', 'rm', 'room']);
  const ROLL_NOISE = new Set(['frnt', 'dpth', 'taxable', 'value', 'county', 'city', 'school']);
  const tokens = raw.toString().toLowerCase()
    .replace(/[\r\n,]+/g, ' ')
    .replace(/[^\w\s#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const isNumTok = t => /^\d+[a-z]?$/.test(t);
  const scoreCandidate = startIdx => {
    for (let j = startIdx + 1; j < Math.min(tokens.length, startIdx + 7); j++) {
      const tj = tokens[j];
      if (/^\d{5}(?:-\d{4})?$/.test(tj) || tj === 'ny') break;
      if (SUF[tj]) {
        const middle = tokens.slice(startIdx + 1, j);
        const alphaCount = middle.filter(x => /[a-z]/.test(x) && !DIR[x] && !SUF[x]).length;
        const numNoise = middle.filter(x => /^\d+$/.test(x) || isNumTok(x)).length;
        if (alphaCount < 1) return null;
        return { score: (numNoise * 10) + (j - startIdx), j };
      }
    }
    return null;
  };
  let startIndex = -1;
  let best = null;
  for (let i = 0; i < tokens.length; i++) {
    if (!isNumTok(tokens[i])) continue;
    const cand = scoreCandidate(i);
    if (!cand) continue;
    if (!best || cand.score < best.score || (cand.score === best.score && i > startIndex)) {
      best = cand;
      startIndex = i;
    }
  }
  if (startIndex < 0) startIndex = tokens.findIndex(isNumTok);
  const out = [];
  let started = startIndex >= 0;
  for (let i = started ? startIndex : 0; i < tokens.length; i++) {
    let t = tokens[i];
    if (!started) {
      if (isNumTok(t)) {
        started = true;
        out.push(t.replace(/^0+(?=\d)/, ''));
      }
      continue;
    }
    if (/^\d{5}(?:-\d{4})?$/.test(t) || t === 'ny') break;
    if (t === 'albany' && out.length >= 2) break;
    if (t === 'new' && tokens[i + 1] === 'york') break;
    if (/^east-?\d+$/i.test(t) || /^nrth-?\d+$/i.test(t) || ROLL_NOISE.has(t)) break;
    if (t.startsWith('#') || STOP.has(t)) break;
    t = DIR[t] || SUF[t] || t;
    out.push(t);
    if (out.length >= 5) break;
  }
  return out.join(' ');
}

function compareAddressCandidateToProperty(candidate, propertyAddress, zip) {
  const mail = (candidate || '').toString();
  if (!mail) return null;
  const mailLower = mail.toLowerCase();
  const zip5 = normalizeZip5(zip || '');
  if (/^\s*0+\b/.test(mailLower) && /\balbany\b/.test(mailLower) && (!zip5 || mailLower.includes(zip5))) return true;
  const propKey = normalizeStreetKeyForCompare(propertyAddress || '');
  if (!propKey) return null;
  const mailKey = normalizeStreetKeyForCompare(mail);
  if (!mailKey) return null;
  if (mailKey.includes(propKey) || propKey.includes(mailKey)) return true;
  const a = propKey.split(' ');
  const b = mailKey.split(' ');
  if (a.length >= 2 && b.length >= 2 && a[0] === b[0] && a[1] === b[1]) return true;
  const aNum = parseInt((a[0] || '').match(/\d+/)?.[0] || '', 10);
  const bNum = parseInt((b[0] || '').match(/\d+/)?.[0] || '', 10);
  const aStreet = a.slice(1).join(' ');
  const bStreet = b.slice(1).join(' ');
  const sameZipOrAlbany = (!zip5 || mailLower.includes(zip5)) && /\balbany\b/.test(mailLower);
  if (aStreet && bStreet && aStreet === bStreet && sameZipOrAlbany && Number.isFinite(aNum) && Number.isFinite(bNum) && Math.abs(aNum - bNum) <= 2) return true;
  return false;
}

function normalizeEntityName(raw) {
  return (raw || '').toString().toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/["']/g, ' ')
    .replace(/\bco\b/g, ' company ')
    .replace(/\bcorp\b/g, ' corporation ')
    .replace(/\binc\b/g, ' incorporated ')
    .replace(/\bl\.\s*l\.\s*c\.\b/g, ' llc ')
    .replace(/\bl\.\s*p\.\b/g, ' lp ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function composeRegistryAddress(parts) {
  const joined = [parts[0], parts[1], parts[2], parts[3], parts[4]].filter(Boolean).join(', ');
  return tidyLabel(joined);
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadCorporateRegistry(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) return null;
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lowerHeaderMap(parseCsvLine(lines[0]));
  const find = (...keys) => keys.map(k => headers.indexOf(k)).find(i => i >= 0) ?? -1;
  const c = {
    dosId: find('dos_id'),
    currentEntityName: find('current_entity_name'),
    entityType: find('entity_type'),
    county: find('county'),
    dosProcessAddress1: find('dos_process_address_1'),
    dosProcessAddress2: find('dos_process_address_2'),
    dosProcessCity: find('dos_process_city'),
    dosProcessState: find('dos_process_state'),
    dosProcessZip: find('dos_process_zip'),
    ceoAddress1: find('ceo_address_1'),
    ceoAddress2: find('ceo_address_2'),
    ceoCity: find('ceo_city'),
    ceoState: find('ceo_state'),
    ceoZip: find('ceo_zip'),
    registeredAgentAddress1: find('registered_agent_address_1'),
    registeredAgentAddress2: find('registered_agent_address_2'),
    registeredAgentCity: find('registered_agent_city'),
    registeredAgentState: find('registered_agent_state'),
    registeredAgentZip: find('registered_agent_zip'),
    locationAddress1: find('location_address_1'),
    locationAddress2: find('location_address_2'),
    locationCity: find('location_city'),
    locationState: find('location_state'),
    locationZip: find('location_zip'),
  };
  const index = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const currentEntityName = tidyLabel(cols[c.currentEntityName]);
    const normalizedName = normalizeEntityName(currentEntityName);
    if (!normalizedName) continue;
    const addresses = [
      { label: 'DOS process', address: composeRegistryAddress([cols[c.dosProcessAddress1], cols[c.dosProcessAddress2], tidyLabel(cols[c.dosProcessCity]), tidyLabel(cols[c.dosProcessState]), normalizeZip5(cols[c.dosProcessZip])]) },
      { label: 'CEO', address: composeRegistryAddress([cols[c.ceoAddress1], cols[c.ceoAddress2], tidyLabel(cols[c.ceoCity]), tidyLabel(cols[c.ceoState]), normalizeZip5(cols[c.ceoZip])]) },
      { label: 'Registered agent', address: composeRegistryAddress([cols[c.registeredAgentAddress1], cols[c.registeredAgentAddress2], tidyLabel(cols[c.registeredAgentCity]), tidyLabel(cols[c.registeredAgentState]), normalizeZip5(cols[c.registeredAgentZip])]) },
      { label: 'Location', address: composeRegistryAddress([cols[c.locationAddress1], cols[c.locationAddress2], tidyLabel(cols[c.locationCity]), tidyLabel(cols[c.locationState]), normalizeZip5(cols[c.locationZip])]) },
    ].filter(entry => entry.address);
    const dedupAddresses = [];
    const seenAddresses = new Set();
    for (const entry of addresses) {
      const key = entry.address.toLowerCase();
      if (seenAddresses.has(key)) continue;
      seenAddresses.add(key);
      dedupAddresses.push(entry);
    }
    const record = {
      dosId: tidyLabel(cols[c.dosId]),
      currentEntityName,
      entityType: tidyLabel(cols[c.entityType]),
      county: tidyLabel(cols[c.county]),
      addresses: dedupAddresses,
    };
    const bucket = index.get(normalizedName) || [];
    bucket.push(record);
    index.set(normalizedName, bucket);
  }
  return {
    sourceFile: path.basename(csvPath),
    rows: lines.length - 1,
    index,
  };
}

function findEntityRegistryMatch(parcel, corporateRef) {
  if (!corporateRef) return null;
  const candidates = [];
  const seen = new Set();
  for (const ownerName of [parcel.owner1, parcel.owner2]) {
    const normalized = normalizeEntityName(ownerName);
    if (!normalized) continue;
    const hits = corporateRef.index.get(normalized) || [];
    for (const hit of hits) {
      const dedupeKey = `${hit.dosId || ''}|${hit.currentEntityName || ''}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const matchedAddress = hit.addresses.find(entry => compareAddressCandidateToProperty(entry.address, parcel.address, parcel.zip));
      candidates.push({
        ...hit,
        propertyAddressMatch: !!matchedAddress,
        matchedAddressLabel: matchedAddress ? matchedAddress.label : null,
        matchedAddress: matchedAddress ? matchedAddress.address : null,
      });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    if (a.propertyAddressMatch !== b.propertyAddressMatch) return Number(b.propertyAddressMatch) - Number(a.propertyAddressMatch);
    return (b.addresses?.length || 0) - (a.addresses?.length || 0);
  });
  const best = candidates[0];
  return {
    matched: true,
    currentEntityName: best.currentEntityName,
    entityType: best.entityType,
    dosId: best.dosId,
    propertyAddressMatch: best.propertyAddressMatch,
    matchedAddressLabel: best.matchedAddressLabel,
    matchedAddress: best.matchedAddress,
    addresses: best.addresses,
  };
}

function loadCountyReference(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) return null;
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lowerHeaderMap(parseCsvLine(lines[0]));
  const find = (...keys) => keys.map(k => headers.indexOf(k)).find(i => i >= 0) ?? -1;
  const WATER = { '0': 'Unknown', '1': 'Public Water', '2': 'Well', '3': 'Municipal' };
  const SEWER = { '0': 'Unknown', '1': 'Public Sewer', '2': 'Septic', '3': 'Municipal' };
  const c = {
    printKey: find('print_key', 'printkey'),
    swis: find('swis_code', 'swis', 'swiscode'),
    pinSbl: find('pin_sbl', 'pinsbl', 'pin_sbl_id', 'pin'),
    municipality: find('prclmuni', 'municipality', 'parcel_municipality'),
    schoolDistrict: find('schdist', 'school_district'),
    acres: find('acres', 'lot_acres', 'acreage'),
    water: find('watertype', 'water_type'),
    sewer: find('sewertype', 'sewer_type'),
    parcelArea: find('shape__area', 'shape_area', 'parcel_area'),
    classDesc: find('propclsdes', 'class_description', 'classdesc'),
  };
  const index = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const swisCode = normalizeSwisCode(cols[c.swis]);
    const printKey = normalizeParcelId(cols[c.printKey]);
    if (!swisCode || !printKey) continue;
    index.set(`${swisCode}:${printKey}`, {
      printKey: tidyLabel(cols[c.printKey]) || printKey,
      pinSbl: tidyLabel(cols[c.pinSbl]),
      municipality: tidyLabel(cols[c.municipality]),
      schoolDistrict: tidyLabel(cols[c.schoolDistrict]),
      acres: toNumber(cols[c.acres]),
      waterType: WATER[(cols[c.water] || '').trim()] || null,
      sewerType: SEWER[(cols[c.sewer] || '').trim()] || null,
      parcelArea: toNumber(cols[c.parcelArea]),
      propClassDescCounty: tidyLabel(cols[c.classDesc]),
    });
  }
  return {
    sourceFile: path.basename(csvPath),
    rows: lines.length - 1,
    index,
  };
}


function toInteger(raw) {
  const value = toNumber(raw);
  return Number.isFinite(value) ? Math.round(value) : null;
}

function isResidentialInventoryClass(raw) {
  return /^2\d\d$/.test((raw || '').toString().trim());
}

function loadResidentialInventory(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) return null;
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lowerHeaderMap(parseCsvLine(lines[0]));
  const find = (...keys) => keys.map(k => headers.indexOf(k)).find(i => i >= 0) ?? -1;
  const c = {
    printKey: find('printkey', 'print_key'),
    propClass: find('propclass', 'prop_class'),
    houseNumber: find('housenumber', 'house_number', 'locstnbr', 'loc_st_nbr'),
    streetName: find('streetname', 'street_name', 'locstname', 'loc_st_name'),
    streetSuffix: find('streetsuffix', 'street_suffix', 'locmailstsuff', 'loc_mail_st_suff'),
    buildingStyle: find('buildingstyle', 'building_style', 'bldgstyle', 'bldg_style'),
    yearBuilt: find('yearbuilt', 'year_built', 'yrbuilt', 'yr_built'),
    sqftLivingArea: find('sqftlivingarea', 'sqft_living_area', 'sfla'),
    bedrooms: find('bedrooms', 'nbrbedrooms', 'nbr_bedrooms'),
    halfBaths: find('halfbaths', 'half_baths', 'nbrhalfbaths', 'nbr_half_baths'),
    fullBaths: find('fullbaths', 'full_baths', 'nbrfullbaths', 'nbr_full_baths'),
    inventoryTotalAssessedValue: find('inventorytotalassessedvalue', 'inventory_total_assessed_value', 'totalav', 'total_av'),
    sourceSheet: find('sourcesheet', 'source_sheet'),
  };
  const index = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const printKey = normalizeParcelId(cols[c.printKey]);
    if (!printKey || printKey === 'print_key') continue;
    if (index.has(printKey)) continue;
    const row = {
      printKey,
      propClass: tidyLabel(cols[c.propClass]),
      houseNumber: tidyLabel(cols[c.houseNumber]),
      streetName: tidyLabel(cols[c.streetName]),
      streetSuffix: tidyLabel(cols[c.streetSuffix]),
      buildingStyle: tidyLabel(cols[c.buildingStyle]),
      yearBuilt: toInteger(cols[c.yearBuilt]),
      sqftLivingArea: toInteger(cols[c.sqftLivingArea]),
      bedrooms: toInteger(cols[c.bedrooms]),
      halfBaths: toInteger(cols[c.halfBaths]),
      fullBaths: toInteger(cols[c.fullBaths]),
      inventoryTotalAssessedValue: toInteger(cols[c.inventoryTotalAssessedValue]),
      sourceSheet: tidyLabel(cols[c.sourceSheet]),
    };
    index.set(printKey, row);
  }
  return {
    sourceFile: path.basename(csvPath),
    rows: index.size,
    index,
  };
}

function loadGeometryIndex(geometryPath) {
  const payload = readJsonIfExists(geometryPath);
  if (!payload || !payload.parcels || Array.isArray(payload.parcels)) return null;
  const index = new Set();
  const centroidByParcel = new Map();
  for (const [rawParcelId, geom] of Object.entries(payload.parcels)) {
    const parcelId = normalizeParcelId(rawParcelId);
    if (!parcelId) continue;
    index.add(parcelId);
    if (Array.isArray(geom?.c) && Number.isFinite(geom.c[0]) && Number.isFinite(geom.c[1])) {
      centroidByParcel.set(parcelId, { x: Number(geom.c[0]), y: Number(geom.c[1]) });
    }
  }
  return {
    sourceFile: path.basename(geometryPath),
    count: payload.count || index.size,
    coordSystem: payload.coordSystem || null,
    index,
    centroidByParcel,
  };
}

function bboxFromPoints(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points || []) {
    const x = Number(point?.[0]);
    const y = Number(point?.[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

function pointInBbox(point, bbox) {
  if (!point || !bbox) return false;
  return point.x >= bbox[0] && point.x <= bbox[2] && point.y >= bbox[1] && point.y <= bbox[3];
}

function pointInRing(point, ring) {
  if (!point || !Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function normalizeNeighborhoodFeature(feature) {
  const attrs = feature?.attributes || feature?.properties || {};
  const rawRings = feature?.geometry?.rings;
  if (!Array.isArray(rawRings) || !rawRings.length) return null;
  const rings = rawRings
    .map(ring => Array.isArray(ring) ? ring.filter(point => Array.isArray(point) && point.length >= 2) : null)
    .filter(ring => Array.isArray(ring) && ring.length >= 3)
    .map(ring => ({ ring, bbox: bboxFromPoints(ring) }))
    .filter(entry => entry.bbox);
  if (!rings.length) return null;
  const allPoints = rings.flatMap(entry => entry.ring);
  return {
    associationName: tidyLabel(attrs.Assoc_Name || attrs.assoc_name || attrs.association || attrs.name),
    label: tidyLabel(attrs.Label || attrs.label || attrs.name || attrs.Assoc_Name || attrs.assoc_name),
    description: tidyLabel(attrs.Descr || attrs.descr || attrs.description),
    rings,
    bbox: bboxFromPoints(allPoints),
  };
}

function loadNeighborhoodAssociations(jsonPath) {
  const payload = readJsonIfExists(jsonPath);
  if (!payload) return null;
  const features = Array.isArray(payload.features) ? payload.features : [];
  const normalized = features.map(normalizeNeighborhoodFeature).filter(Boolean);
  if (!normalized.length) return null;
  return {
    sourceFile: path.basename(jsonPath),
    rows: normalized.length,
    coordSystem: payload.spatialReference?.wkid || payload.spatialReference?.latestWkid || payload.crs?.properties?.name || null,
    features: normalized,
  };
}

function findNeighborhoodAssociation(point, neighborhoodRef) {
  if (!point || !neighborhoodRef?.features?.length) return null;
  for (const feature of neighborhoodRef.features) {
    if (!pointInBbox(point, feature.bbox)) continue;
    let inside = false;
    for (const ringEntry of feature.rings) {
      if (!pointInBbox(point, ringEntry.bbox)) continue;
      if (pointInRing(point, ringEntry.ring)) inside = !inside;
    }
    if (inside) {
      return {
        associationName: feature.associationName || feature.label || null,
        label: feature.label || feature.associationName || null,
        description: feature.description || null,
      };
    }
  }
  return null;
}

function projectNativePointToLonLat(x, y, zone = 18) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const a = 6378137.0;
  const eccSquared = 0.00669438;
  const k0 = 0.9996;
  const eccPrimeSquared = eccSquared / (1 - eccSquared);
  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  const xAdj = x - 500000.0;
  const M = y / k0;
  const mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * Math.pow(eccSquared, 3) / 256));
  const phi1Rad = mu
    + (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu)
    + (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu)
    + (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);
  const sinPhi = Math.sin(phi1Rad);
  const cosPhi = Math.cos(phi1Rad);
  const tanPhi = Math.tan(phi1Rad);
  const N1 = a / Math.sqrt(1 - eccSquared * sinPhi * sinPhi);
  const T1 = tanPhi * tanPhi;
  const C1 = eccPrimeSquared * cosPhi * cosPhi;
  const R1 = a * (1 - eccSquared) / Math.pow(1 - eccSquared * sinPhi * sinPhi, 1.5);
  const D = xAdj / (N1 * k0);
  let lat = phi1Rad - (N1 * tanPhi / R1) * (
    (D * D) / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * Math.pow(D, 4) / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * Math.pow(D, 6) / 720
  );
  lat = lat * 180 / Math.PI;
  let lon = (
    D
    - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1) * Math.pow(D, 5) / 120
  ) / cosPhi;
  lon = ((zone - 1) * 6 - 180 + 3) + lon * 180 / Math.PI;
  return Number.isFinite(lat) && Number.isFinite(lon) ? { x: lon, y: lat } : null;
}

function normalizeGeoJsonNeighborhoodFeature(feature) {
  const props = feature?.properties || {};
  const type = feature?.geometry?.type;
  const coords = feature?.geometry?.coordinates;
  if (!type || !Array.isArray(coords)) return null;
  const polygonGroups = type === 'Polygon'
    ? [coords]
    : (type === 'MultiPolygon' ? coords : []);
  const rings = polygonGroups
    .flatMap(poly => Array.isArray(poly) ? poly : [])
    .map(ring => Array.isArray(ring) ? ring.filter(point => Array.isArray(point) && point.length >= 2) : null)
    .filter(ring => Array.isArray(ring) && ring.length >= 3)
    .map(ring => ({ ring, bbox: bboxFromPoints(ring) }))
    .filter(entry => entry.bbox);
  if (!rings.length) return null;
  const allPoints = rings.flatMap(entry => entry.ring);
  return {
    label: tidyLabel(props.name || props.label || props.neighborhood),
    rings,
    bbox: bboxFromPoints(allPoints),
  };
}

function loadNeighborhoodGeoJson(jsonPath) {
  const payload = readJsonIfExists(jsonPath);
  if (!payload) return null;
  const features = Array.isArray(payload.features) ? payload.features : [];
  const normalized = features.map(normalizeGeoJsonNeighborhoodFeature).filter(Boolean);
  if (!normalized.length) return null;
  return {
    sourceFile: path.basename(jsonPath),
    rows: normalized.length,
    coordSystem: payload.crs?.properties?.name || 'EPSG:4326',
    features: normalized,
  };
}

function findGeoJsonNeighborhood(point, neighborhoodRef) {
  if (!point || !neighborhoodRef?.features?.length) return null;
  for (const feature of neighborhoodRef.features) {
    if (!pointInBbox(point, feature.bbox)) continue;
    let inside = false;
    for (const ringEntry of feature.rings) {
      if (!pointInBbox(point, ringEntry.bbox)) continue;
      if (pointInRing(point, ringEntry.ring)) inside = !inside;
    }
    if (inside) return { label: feature.label || null };
  }
  return null;
}

function mergeWarnings(...warningLists) {
  const out = new Set();
  for (const warnings of warningLists) {
    if (!Array.isArray(warnings)) continue;
    for (const warning of warnings) {
      const value = tidyLabel(warning);
      if (value) out.add(value);
    }
  }
  return [...out];
}

function enrichRollPayload(payload, options = {}) {
  if (!payload || !Array.isArray(payload.parcels)) throw new Error('Roll payload must contain a parcels array.');
  const countyRef = options.countyCsvPath ? loadCountyReference(options.countyCsvPath) : null;
  const geometryRef = options.geometryJsonPath ? loadGeometryIndex(options.geometryJsonPath) : null;
  const corporateRef = options.corporateCsvPath ? loadCorporateRegistry(options.corporateCsvPath) : null;
  const neighborhoodRef = options.neighborhoodAssocPath ? loadNeighborhoodAssociations(options.neighborhoodAssocPath) : null;
  const neighborhoodGeoRef = options.neighborhoodGeoJsonPath ? loadNeighborhoodGeoJson(options.neighborhoodGeoJsonPath) : null;
  const inventoryRef = options.inventoryCsvPath ? loadResidentialInventory(options.inventoryCsvPath) : null;
  const rollSwis = normalizeSwisCode(payload.swisCode || payload.meta?.swisCode || '');
  let countyMatched = 0;
  let geometryMatched = 0;
  let warningCount = 0;
  let corporateMatched = 0;
  let corporatePropertyAddressMatched = 0;
  let neighborhoodMatched = 0;
  let neighborhoodGeoMatched = 0;
  let inventoryMatched = 0;
  let inventoryResidentialCandidates = 0;
  let inventoryClassMismatchCount = 0;

  const parcels = payload.parcels.map(parcel => {
    const parcelIdNorm = normalizeParcelId(parcel.parcelIdNorm || parcel.parcelId || parcel.printKey || parcel.pinSbl);
    const swisCode = normalizeSwisCode(parcel.swisCode || rollSwis);
    const countyKey = swisCode + ':' + parcelIdNorm;
    const county = countyRef?.index.get(countyKey) || null;
    const hasGeometry = geometryRef ? geometryRef.index.has(parcelIdNorm) : null;
    if (county) countyMatched += 1;
    if (hasGeometry) geometryMatched += 1;

    const warnings = mergeWarnings(
      parcel.quality?.warnings,
      parcel.qualityWarnings,
      county ? [] : (countyRef ? ['missing_county_reference_join'] : []),
      hasGeometry === false ? ['missing_geometry_join'] : []
    );

    const nextParcel = {
      ...parcel,
      parcelIdNorm,
      swisCode: swisCode || parcel.swisCode || null,
      printKey: county?.printKey || parcel.printKey || parcel.parcelId || parcelIdNorm || null,
      pinSbl: county?.pinSbl || parcel.pinSbl || null,
      municipality: county?.municipality || parcel.municipality || payload.municipality || null,
      county: parcel.county || payload.county || null,
      schoolDistrict: county?.schoolDistrict || parcel.schoolDistrict || null,
      acres: parcel.acres ?? county?.acres ?? null,
      waterType: parcel.waterType || county?.waterType || null,
      sewerType: parcel.sewerType || county?.sewerType || null,
      parcelArea: parcel.parcelArea ?? county?.parcelArea ?? null,
      countyReferenceJoin: county ? 'matched' : (countyRef ? 'missing' : null),
      geometryJoin: hasGeometry === null ? null : (hasGeometry ? 'matched' : 'missing'),
    };

    const entityRegistryMatch = findEntityRegistryMatch(nextParcel, corporateRef);
    if (entityRegistryMatch?.matched) corporateMatched += 1;
    if (entityRegistryMatch?.propertyAddressMatch) corporatePropertyAddressMatched += 1;
    if (entityRegistryMatch) nextParcel.entityRegistryMatch = entityRegistryMatch;

    const centroid = geometryRef?.centroidByParcel?.get(parcelIdNorm);
    const point = centroid || (Number.isFinite(Number(nextParcel.eastCoord)) && Number.isFinite(Number(nextParcel.nrthCoord)) ? { x: Number(nextParcel.eastCoord), y: Number(nextParcel.nrthCoord) } : null);
    const neighborhoodMatch = findNeighborhoodAssociation(point, neighborhoodRef);
    if (neighborhoodMatch) neighborhoodMatched += 1;
    const pointLonLat = point ? projectNativePointToLonLat(point.x, point.y) : null;
    const neighborhoodGeoMatch = findGeoJsonNeighborhood(pointLonLat, neighborhoodGeoRef);
    if (neighborhoodGeoMatch) neighborhoodGeoMatched += 1;
    nextParcel.neighborhoodAssociation = neighborhoodMatch?.associationName || nextParcel.neighborhoodAssociation || null;
    nextParcel.neighborhoodLabel = neighborhoodGeoMatch?.label || neighborhoodMatch?.label || nextParcel.neighborhoodLabel || nextParcel.neighborhood || null;
    nextParcel.neighborhood = neighborhoodGeoMatch?.label || neighborhoodMatch?.label || nextParcel.neighborhood || null;
    nextParcel.neighborhoodJoin = neighborhoodGeoRef ? (neighborhoodGeoMatch ? 'matched' : 'missing') : (neighborhoodRef ? (neighborhoodMatch ? 'matched' : 'missing') : null);
    nextParcel.neighborhoodSource = neighborhoodGeoMatch ? 'albany.geojson' : (neighborhoodMatch ? 'City of Albany Neighborhood Association Boundary Public View' : (nextParcel.neighborhoodSource || null));

    const inventoryEligible = isResidentialInventoryClass(nextParcel.propClass || '');
    const inventoryRow = inventoryEligible ? (inventoryRef?.index.get(parcelIdNorm) || null) : null;
    const inventoryClassMatches = !inventoryRow || !inventoryRow.propClass || !nextParcel.propClass || String(inventoryRow.propClass).trim() === String(nextParcel.propClass).trim();
    if (inventoryEligible) inventoryResidentialCandidates += 1;
    if (inventoryRow && !inventoryClassMatches) {
      warnings.push('inventory_prop_class_mismatch');
      inventoryClassMismatchCount += 1;
    }
    if (inventoryEligible && inventoryRef && !inventoryRow) warnings.push('missing_residential_inventory_join');
    if (inventoryRow && inventoryClassMatches) {
      inventoryMatched += 1;
      nextParcel.inventory = {
        printKey: inventoryRow.printKey,
        propClass: inventoryRow.propClass,
        houseNumber: inventoryRow.houseNumber,
        streetName: inventoryRow.streetName,
        streetSuffix: inventoryRow.streetSuffix,
        buildingStyle: inventoryRow.buildingStyle,
        yearBuilt: inventoryRow.yearBuilt,
        sqftLivingArea: inventoryRow.sqftLivingArea,
        bedrooms: inventoryRow.bedrooms,
        halfBaths: inventoryRow.halfBaths,
        fullBaths: inventoryRow.fullBaths,
        inventoryTotalAssessedValue: inventoryRow.inventoryTotalAssessedValue,
        joinSource: inventoryRef.sourceFile,
        joinConfidence: 'print_key_and_class',
      };
    }

    if (warnings.length) warningCount += 1;
    nextParcel.qualityWarnings = warnings;
    nextParcel.quality = {
      ...(parcel.quality && typeof parcel.quality === 'object' ? parcel.quality : {}),
      countyReferenceJoin: county ? 'matched' : (countyRef ? 'missing' : null),
      hasGeometry: hasGeometry === null ? (parcel.quality?.hasGeometry ?? null) : hasGeometry,
      warnings,
      residentialInventoryJoin: inventoryEligible ? (nextParcel.inventory ? 'matched' : (inventoryRef ? 'missing' : null)) : null,
    };

    return nextParcel;
  });

  const sourceFiles = new Set([...(payload.sourceFiles || []), countyRef?.sourceFile, geometryRef?.sourceFile, corporateRef?.sourceFile, neighborhoodRef?.sourceFile, neighborhoodGeoRef?.sourceFile, inventoryRef?.sourceFile].filter(Boolean));
  const countyJoinRate = countyRef ? +(countyMatched / Math.max(1, parcels.length) * 100).toFixed(2) : null;
  const geometryJoinRate = geometryRef ? +(geometryMatched / Math.max(1, parcels.length) * 100).toFixed(2) : null;
  const neighborhoodJoinRate = neighborhoodRef ? +(neighborhoodMatched / Math.max(1, parcels.length) * 100).toFixed(2) : null;
  const neighborhoodGeoJoinRate = neighborhoodGeoRef ? +(neighborhoodGeoMatched / Math.max(1, parcels.length) * 100).toFixed(2) : null;
  const inventoryJoinRate = inventoryRef && inventoryResidentialCandidates ? +(inventoryMatched / Math.max(1, inventoryResidentialCandidates) * 100).toFixed(2) : null;

  return {
    ...payload,
    version: Math.max(7, payload.version || 0),
    sourceFiles: [...sourceFiles],
    preparedAt: new Date().toISOString(),
    parcels,
    meta: {
      ...(payload.meta && typeof payload.meta === 'object' ? payload.meta : {}),
      countyReference: countyRef ? {
        sourceFile: countyRef.sourceFile,
        rows: countyRef.rows,
        matched: countyMatched,
        unmatched: parcels.length - countyMatched,
        joinRatePct: countyJoinRate,
      } : null,
      geometryReference: geometryRef ? {
        sourceFile: geometryRef.sourceFile,
        matched: geometryMatched,
        unmatched: parcels.length - geometryMatched,
        joinRatePct: geometryJoinRate,
        coordSystem: geometryRef.coordSystem,
      } : null,
      corporateRegistry: corporateRef ? {
        sourceFile: corporateRef.sourceFile,
        rows: corporateRef.rows,
        matchedParcels: corporateMatched,
        propertyAddressMatched: corporatePropertyAddressMatched,
      } : null,
      neighborhoodAssociationBoundaries: neighborhoodRef ? {
        sourceFile: neighborhoodRef.sourceFile,
        rows: neighborhoodRef.rows,
        matched: neighborhoodMatched,
        unmatched: parcels.length - neighborhoodMatched,
        joinRatePct: neighborhoodJoinRate,
        coordSystem: neighborhoodRef.coordSystem,
      } : null,
      neighborhoodBoundaries: neighborhoodGeoRef ? {
        sourceFile: neighborhoodGeoRef.sourceFile,
        rows: neighborhoodGeoRef.rows,
        matched: neighborhoodGeoMatched,
        unmatched: parcels.length - neighborhoodGeoMatched,
        joinRatePct: neighborhoodGeoJoinRate,
        coordSystem: neighborhoodGeoRef.coordSystem,
      } : null,
      residentialInventory: inventoryRef ? {
        sourceFile: inventoryRef.sourceFile,
        rows: inventoryRef.rows,
        eligibleResidentialParcels: inventoryResidentialCandidates,
        matched: inventoryMatched,
        unmatched: Math.max(0, inventoryResidentialCandidates - inventoryMatched),
        classMismatchCount: inventoryClassMismatchCount,
        joinRatePct: inventoryJoinRate,
      } : null,
      qualitySummary: {
        parcelsWithWarnings: warningCount,
        warningRatePct: +(warningCount / Math.max(1, parcels.length) * 100).toFixed(2),
      },
    },
  };
}

function main() {
  const [,, rollArg, countyArg, geometryArg, outArg, corporateArg, neighborhoodArg, inventoryArg] = process.argv;
  const cwd = process.cwd();
  const rollPath = path.resolve(cwd, rollArg || 'albany-roll.json');
  const countyCsvPath = path.resolve(cwd, countyArg || 'Albany_County_Parcels_2024_-1728787929616575091.csv');
  const geometryJsonPath = path.resolve(cwd, geometryArg || 'albany-parcel-geometry.json');
  const outPath = path.resolve(cwd, outArg || rollPath);
  const inferredCorporatePath = path.resolve(cwd, corporateArg || 'Active_Corporations___Beginning_1800_20260308.csv');
  const corporateCsvPath = fs.existsSync(inferredCorporatePath) ? inferredCorporatePath : null;
  const inferredNeighborhoodPath = path.resolve(cwd, neighborhoodArg || '__na_query.json');
  const neighborhoodAssocPath = fs.existsSync(inferredNeighborhoodPath) ? inferredNeighborhoodPath : null;
  const inferredNeighborhoodGeoPath = path.resolve(cwd, 'albany.geojson');
  const neighborhoodGeoJsonPath = fs.existsSync(inferredNeighborhoodGeoPath) ? inferredNeighborhoodGeoPath : null;
  const inventoryCandidates = [
    inventoryArg,
    'residential-inventory-2025.csv',
    'Residential_Inventory.csv',
  ]
    .filter(Boolean)
    .map(name => path.resolve(cwd, name));
  const inventoryCsvPath = inventoryCandidates.find(candidate => fs.existsSync(candidate)) || null;
  const payload = JSON.parse(fs.readFileSync(rollPath, 'utf8'));
  const enriched = enrichRollPayload(payload, { countyCsvPath, geometryJsonPath, corporateCsvPath, neighborhoodAssocPath, neighborhoodGeoJsonPath, inventoryCsvPath });
  fs.writeFileSync(outPath, JSON.stringify(enriched));
  const countySummary = enriched.meta?.countyReference;
  const geomSummary = enriched.meta?.geometryReference;
  const corporateSummary = enriched.meta?.corporateRegistry;
  const neighborhoodSummary = enriched.meta?.neighborhoodAssociationBoundaries;
  const neighborhoodGeoSummary = enriched.meta?.neighborhoodBoundaries;
  const inventorySummary = enriched.meta?.residentialInventory;
  console.log('Prepared ' + path.basename(outPath) + ' with ' + enriched.parcels.length.toLocaleString() + ' parcels.');
  if (countySummary) console.log('  County join: ' + countySummary.matched.toLocaleString() + ' matched (' + countySummary.joinRatePct + '%).');
  if (geomSummary) console.log('  Geometry join: ' + geomSummary.matched.toLocaleString() + ' matched (' + geomSummary.joinRatePct + '%).');
  if (corporateSummary) console.log('  Corporate registry: ' + corporateSummary.matchedParcels.toLocaleString() + ' matched, ' + corporateSummary.propertyAddressMatched.toLocaleString() + ' with filing address match.');
  if (neighborhoodSummary) console.log('  Neighborhood association join: ' + neighborhoodSummary.matched.toLocaleString() + ' matched (' + neighborhoodSummary.joinRatePct + '%).');
  if (neighborhoodGeoSummary) console.log('  Neighborhood label join: ' + neighborhoodGeoSummary.matched.toLocaleString() + ' matched (' + neighborhoodGeoSummary.joinRatePct + '%).');
  if (inventorySummary) console.log('  Residential inventory join: ' + inventorySummary.matched.toLocaleString() + ' matched of ' + inventorySummary.eligibleResidentialParcels.toLocaleString() + ' eligible parcels (' + inventorySummary.joinRatePct + '%), ' + inventorySummary.classMismatchCount.toLocaleString() + ' class mismatches.');
  console.log('  Parcels with warnings: ' + ((enriched.meta?.qualitySummary?.parcelsWithWarnings?.toLocaleString?.()) || 0) + '.');
}

if (require.main === module) main();

module.exports = {
  enrichRollPayload,
  loadCountyReference,
  loadGeometryIndex,
  loadCorporateRegistry,
  loadNeighborhoodAssociations,
  loadNeighborhoodGeoJson,
  loadResidentialInventory,
  isResidentialInventoryClass,
  normalizeParcelId,
  normalizeSwisCode,
  normalizeZip5,
  normalizeEntityName,
};

