---
name: albany-dashboard-surgery
description: Albany dashboard editing guide for the large coupled dashboard file in this repo. Use when changing albany-full-dashboard.jsx, especially grievance workflow tabs, map-facing flows, helper builders, packet output, autoload behavior, or any task where a local edit can easily break a nearby surface.
---

# Albany Dashboard Surgery

## Overview

Use this skill when editing `albany-full-dashboard.jsx`. The file is large and coupled, so efficiency comes from finding the right section quickly, making the smallest safe edit, and tracing a concept through its builder and render sites before touching code.

## Operating Rules

1. Find the owning builder or state path before editing JSX.
2. Prefer narrow edits around the concept owner instead of broad search-and-replace changes.
3. Trace a behavior from:
   - preprocessing or derived state
   - helper or builder function
   - tab or panel render site
4. If a concept appears in multiple workflow steps, assume they are coupled until proven otherwise.

## Main Hot Spots

- `preprocessParcels`
  - parcel shaping before the UI consumes records
- `buildSelectedGrievancePackage`
  - main grievance package summary assembly
- `buildComplaintReasonGuidance`
  - claim guidance wording
- `buildGrievanceFilingHelper`
  - filing helper output
- `buildAppealEvidence`
  - evidence summary for appeal/grievance presentation
- `TaxTools`
  - grievance workflow home for current homeowner flows
- `MapView`
  - map tab wiring
- app-level state and autoload logic near the bottom of the file

## Editing Heuristics

- If the task is wording-only, edit the smallest helper that owns the text.
- If the task is logic-plus-wording, change the logic owner first, then the helper text that explains it.
- If the task is tab-specific, verify whether the same concept is reused in another tab before editing only the visible panel.
- If the task touches grievance output, check Step 4, Step 5, packet output, and filing helper paths rather than assuming one render site controls everything.

## Known Traps

- There are no separate UI consumer layers here; one workflow concept often feeds several panels.
- A concept may be assembled in a helper long before it renders, so editing only the render block can miss the real source of truth.
- Parcel preprocessing can hide the fact that a field is nested under `inventory`.
- The map, homeowner workflow, and autoload state all live in the same file, so broad edits can create unrelated regressions.

## Safe Workflow

1. Search for the concept by function name and user-facing text.
2. Read the owning helper and at least one render site.
3. Make the smallest edit that changes the behavior at the owner.
4. Search for stale copies of the same wording or concept.
5. Build and manually review the affected path.

## When To Slow Down

Slow down and trace more context if:

- the same concept appears in multiple helper builders
- a grievance concept appears in both evidence and packet output
- the change seems local but touches parcel preprocessing or top-level app state
- you are tempted to patch several far-apart blocks without identifying the shared owner
