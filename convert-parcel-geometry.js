#!/usr/bin/env node
"use strict";

/**
 * Convert Albany parcel GeoJSON into a compact, app-friendly geometry file keyed by parcelId (PRINT_KEY).
 *
 * Usage:
 *   node convert-parcel-geometry.js city_albany_geo_json.geojson albany-parcel-geometry.json
 *
 * Notes:
 * - Preserves polygon/multipolygon geometry rings (including holes).
 * - Rounds coordinates to reduce file size.
 * - Stores minimal metadata + bbox/centroid for faster future map work.
 * - CRS is preserved from source metadata (often EPSG:26918 in NYS export).
 */

const fs = require("fs");
const path = require("path");

function usage() {
  console.error("Usage: node convert-parcel-geometry.js <input.geojson> <output.json>");
  process.exit(1);
}

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) usage();

function roundCoord(n) {
  // 0.1 units in EPSG:26918 (meters) keeps shape fidelity while shrinking size.
  return Math.round(Number(n) * 10) / 10;
}

function toMultiPolygonCoords(geom) {
  if (!geom || !geom.type || !geom.coordinates) return null;
  if (geom.type === "MultiPolygon") return geom.coordinates;
  if (geom.type === "Polygon") return [geom.coordinates];
  return null;
}

function compactCoords(multiPoly) {
  // [[[ [x,y],... ]]] -> same structure, rounded coords, strip Z/M if present.
  return multiPoly.map(poly =>
    poly.map(ring =>
      ring
        .filter(pt => Array.isArray(pt) && pt.length >= 2)
        .map(pt => [roundCoord(pt[0]), roundCoord(pt[1])])
    )
  );
}

function computeBBoxAndCentroid(multiPoly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sx = 0, sy = 0, c = 0;

  for (const poly of multiPoly) {
    for (const ring of poly) {
      for (const pt of ring) {
        const x = pt[0], y = pt[1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        sx += x;
        sy += y;
        c++;
      }
    }
  }

  if (!Number.isFinite(minX) || c === 0) return null;
  return {
    bbox: [roundCoord(minX), roundCoord(minY), roundCoord(maxX), roundCoord(maxY)],
    centroid: [roundCoord(sx / c), roundCoord(sy / c)],
  };
}

function main() {
  const raw = fs.readFileSync(inPath, "utf8");
  const geo = JSON.parse(raw);
  if (!geo || geo.type !== "FeatureCollection" || !Array.isArray(geo.features)) {
    throw new Error("Input is not a GeoJSON FeatureCollection.");
  }

  const byParcelId = Object.create(null);
  let skippedNoKey = 0;
  let skippedBadGeom = 0;
  let duplicateKeys = 0;
  let processed = 0;

  for (const ft of geo.features) {
    const props = ft && ft.properties ? ft.properties : {};
    const key = String(props.PRINT_KEY || "").trim();
    if (!key) {
      skippedNoKey++;
      continue;
    }

    const mp = toMultiPolygonCoords(ft.geometry);
    if (!mp) {
      skippedBadGeom++;
      continue;
    }

    const g = compactCoords(mp);
    const aux = computeBBoxAndCentroid(g);
    if (!aux) {
      skippedBadGeom++;
      continue;
    }

    if (byParcelId[key]) duplicateKeys++;
    byParcelId[key] = {
      g,              // multipolygon rings
      b: aux.bbox,    // bbox [minx,miny,maxx,maxy]
      c: aux.centroid // centroid [x,y]
    };
    processed++;
  }

  const crsName = geo.crs && geo.crs.properties && geo.crs.properties.name
    ? geo.crs.properties.name
    : null;

  const out = {
    version: 1,
    source: path.basename(inPath),
    parsedAt: new Date().toISOString(),
    geometryType: "MultiPolygon",
    coordSystem: crsName || "GeoJSON-default",
    count: Object.keys(byParcelId).length,
    parcels: byParcelId,
    stats: {
      inputFeatureCount: geo.features.length,
      processedFeatures: processed,
      duplicateKeys,
      skippedNoKey,
      skippedBadGeom
    }
  };

  fs.writeFileSync(outPath, JSON.stringify(out));

  const bytes = fs.statSync(outPath).size;
  console.log(`Wrote ${out.count.toLocaleString()} parcel geometries to ${outPath}`);
  console.log(`Output size: ${(bytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`CRS: ${out.coordSystem}`);
  console.log(`Stats:`, out.stats);
}

main();

