---
name: albany-build-and-verify
description: Albany project build and verification guide for this repo. Use when a coding change is large enough that it should be carried through build, regression, and targeted manual checks, especially for grievance workflow, dashboard UI, map behavior, packet output, or data-loading changes.
---

# Albany Build And Verify

## Overview

Use this skill to finish work in this repo without skipping the checks that actually matter. The main risk is not a failed edit; it is stopping after the code change and missing a broken bundle, stale packet text, or an unverified workflow path.

## Core Checks

- Run `node .\grievance-engine-regression.js` for grievance-engine changes.
- Run `npm run build` for any meaningful UI or workflow change.
- Remember that `npm run build` also rebuilds `bundle.js`, rewrites HTML bundle references, and stages the pages output through `stage-pages.js`.

## Verification Sequence

1. Decide which surfaces changed:
   - grievance engine logic
   - dashboard workflow and tabs
   - packet or filing helper output
   - map or geometry behavior
   - data loading or preprocessing
2. Run the automated checks that match the change.
3. Do a small manual pass on the user-facing surfaces that automation does not fully prove.
4. Search for stale wording or removed concepts if the change renamed or removed behavior.

## What To Verify By Change Type

### Grievance logic changes

- Run `node .\grievance-engine-regression.js`.
- Run `npm run build`.
- Manually check the grievance flow if the user-facing reasoning changed.

### Dashboard or packet changes

- Run `npm run build`.
- Manually check the affected tab or packet output in the app.
- If the change touched grievance text, also run the regression script.

### Map or geometry changes

- Run `npm run build`.
- Manually open the map flow, parcel jump flow, and at least one geometry-backed parcel.

### Data preprocessing changes

- Re-run the relevant local script if needed.
- Run `npm run build` if the app consumes the changed output.
- Spot-check one or two records that would expose a bad join.

## Known Traps

- A clean build does not prove grievance logic is correct.
- A passing regression script does not prove packet or helper wording is correct.
- `build-app.js` copies source files into `__build_perf` and rewrites bundle references, so a build touches more than one output artifact.
- Large workflow changes often need one manual pass even after automated checks are green.

## Finish Criteria

Treat the work as finished only when:

- the relevant automated checks pass
- the affected user-facing path has been manually spot-checked
- stale terms from removed logic have been searched for if applicable
- you can name what you verified and what you did not verify
