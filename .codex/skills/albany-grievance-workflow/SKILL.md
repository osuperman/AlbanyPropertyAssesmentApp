---
name: albany-grievance-workflow
description: Albany grievance workflow map for this repo. Use when changing grievance logic, comparable selection behavior, claim guidance, filing helper text, evidence summaries, printable packet output, or grievance-related docs so the engine, dashboard, packet, and docs stay aligned.
---

# Albany Grievance Workflow

## Overview

Use this skill to keep grievance changes synchronized across the real workflow surface in this repo. Treat the engine, dashboard flow, packet output, filing helper, and grievance docs as one coupled system.

## Core Map

- Engine logic lives primarily in `grievance-engine.js`.
- The workflow, packet text, evidence panels, and filing helper live primarily in `albany-full-dashboard.jsx`.
- The authoritative implementation doc is `GRIEVANCE_APP_COMPLETE_SPEC.md`.
- The plain-language comparable logic summary is `HOW_COMPARABLES_ARE_CHOSEN.md`.
- Baseline automated verification is `node .\grievance-engine-regression.js` and `npm run build`.

## Working Rules

1. Start by deciding whether the request is:
   - engine-only analysis,
   - a coupled workflow change,
   - or a doc-alignment task.
2. If behavior changes, trace the same concept through:
   - engine computation,
   - dashboard/evidence presentation,
   - packet output,
   - filing helper text,
   - and both grievance docs.
3. Implement in dependency order:
   - engine first,
   - dashboard and packet second,
   - docs third,
   - verification last.
4. Use real parcel fixtures before large refactors so regressions are visible.

## Hot Spots

- In `grievance-engine.js`, check functions around:
  - `computeClaimRecommendation`
  - `computeMarketSaleModel`
  - `computeNeighborhoodEquityModel`
  - `computeSuggestedRequestedValue`
  - `summarizeGrievancePackage`
- In `albany-full-dashboard.jsx`, check builders around:
  - `buildSelectedGrievancePackage`
  - `buildComplaintReasonGuidance`
  - `buildGrievanceFilingHelper`
  - `buildAppealEvidence`
  - the printable packet/report builder

## Known Traps

- There are no separate "UI consumers" here. The grievance dashboard path, helper text, and packet output are one workflow surface.
- Packet and helper wording often lag behind engine changes if not updated in the same pass.
- Removed concepts like `Adjusted AV` or old claim language can linger in the packet and docs even after logic changes.
- Broad comparable discovery and tighter evidence selection are easy to conflate. Keep recall and evidence rules conceptually separate.
- If a market-evidence result looks unexpectedly thin, verify the data path before assuming the market itself is sparse.

## Verification

- Run `node .\grievance-engine-regression.js`.
- Run `npm run build`.
- If packet or filing text changed, do a manual review of the rendered grievance workflow and printable output.
- Search for stale terms when removing or renaming workflow concepts.
