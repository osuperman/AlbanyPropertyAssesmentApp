---
name: albany-map-geometry
description: Albany map and geometry debugging guide for this repo. Use when working on parcel boundaries, centroid joins, neighborhood boundaries, street centerlines, parcel map jumps, geometry coverage, or any issue where map behavior may actually be a key-join, geometry, or preprocessing problem.
---

# Albany Map Geometry

## Overview

Use this skill when a task touches map behavior or spatial data. In this repo, apparent map bugs often come from identifier mismatches, missing geometry joins, or preprocessing assumptions rather than from the rendering layer itself.

## Core Data Path

- `prepare-albany-data.js`
  - normalizes parcel identifiers
  - loads residential inventory
  - loads geometry centroids
  - loads neighborhood association and neighborhood boundary data
- `albany-full-dashboard.jsx`
  - holds `parcelGeometry`, `streetCenterlines`, `neighborhoodBoundaries`, and `salesByParcelId` state
  - wires map jumps and autoload handling
- `leaflet-map.jsx`
  - renders the actual Leaflet map view

## Keys And Joins

- Prefer normalized parcel identifiers.
- Geometry joins depend on normalized parcel ids, not display addresses.
- Sales joins prefer normalized `print_key`.
- If a parcel appears in the roll but not on the map, inspect the normalized id and geometry coverage before blaming Leaflet.

## Main Checks

1. Confirm the parcel exists in the loaded roll data.
2. Confirm the normalized parcel id matches the geometry payload key.
3. Confirm centroid or polygon data exists for that parcel in `parcelGeometry`.
4. Confirm the map state is receiving the expected payload.
5. Only then inspect rendering behavior.

## Hot Spots

- `normalizeParcelId` in `prepare-albany-data.js`
- geometry centroid loading and `centroidByParcel`
- neighborhood association and neighborhood GeoJSON loaders
- `preprocessParcels` in `albany-full-dashboard.jsx`
- app-level `parcelGeometry`, `streetCenterlines`, and `neighborhoodBoundaries` state
- `openApplicationMapForParcel`
- `MapView` and `LeafletMapView`

## Known Traps

- A missing polygon can still have a centroid, so map presence and parcel-boundary presence are not the same thing.
- Geometry coverage stats can expose a data-join problem faster than visual inspection.
- Street centerline payloads and parcel geometry payloads have different shapes; do not debug them as if they are interchangeable.
- Neighborhood behavior may depend on either association data or boundary GeoJSON depending on the path.
- A map jump failure can be caused by the parcel lookup path, not the map renderer.

## Practical Workflow

1. Check the data shape first.
2. Check normalized identifiers second.
3. Check geometry coverage or lookup maps third.
4. Check the map jump/state wiring fourth.
5. Inspect the rendering layer last.

## Manual Verification

- Open a parcel that should have geometry and confirm boundary rendering.
- Open a parcel through the application map jump flow and confirm the map receives the expected parcel.
- If the task touched neighborhoods or streets, verify one case for each changed layer rather than only parcel polygons.
