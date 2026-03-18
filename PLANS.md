# Albany Grievance Workflow Overhaul Exec Plan

## Purpose

Implement the agreed overhaul of the Albany grievance workflow so that the engine, dashboard workflow, downloadable grievance packet, filing helper, and grievance docs all follow one defensible evidence model.

This plan is the working source of truth for today's implementation. It is written so the work can be resumed from this file alone.

## Context and Orientation

This repo's grievance workflow is centered in these files:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\GRIEVANCE_APP_COMPLETE_SPEC.md`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\HOW_COMPARABLES_ARE_CHOSEN.md`

Current known baseline:

- The market-sale model currently fails on the four fixture parcels below, including parcels that otherwise produce grievance packages.
- The workflow can currently emit `EXCESSIVE` claim recommendations even when sale-backed evidence is not sufficient.
- `Adjusted AV` is still present in workflow/report surfaces.
- The packet does not yet explain the grievance-preparation result in the required evidence/method/limitations format.

Key fixture parcels for validation:

- `52 Oakwood St` (`64.83-1-22`)
- `168 Chestnut St` (`76.24-2-11`)
- `186 Sheridan Ave` (`65.81-4-19`)
- `572 Providence St` (`75.28-5-17`)

Current fixture baseline as of `2026-03-18`:

- `64.83-1-22`: `12` visible comps, `2` selected, `Weak evidence`, `EXCESSIVE`, market sale model unavailable.
- `76.24-2-11`: `12` visible comps, `3` selected, `Moderate evidence`, `EXCESSIVE`, market sale model unavailable.
- `65.81-4-19`: `research_only`, `0` selected, `MANUAL_REVIEW`, market sale model unavailable.
- `75.28-5-17`: `12` visible comps, `3` selected, `Moderate evidence`, `EXCESSIVE`, market sale model unavailable.

Important data inputs already present in repo:

- Roll metadata and parcel data in `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-roll.json`
- ORPTS sales fields in `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-sales.json`
- Residential inventory fields nested under parcel `inventory`

Important implementation risk already confirmed:

- Dashboard-side profile building reads inventory-backed fields from nested `inventory`, while the market-sale model and related engine logic still behave as if subject/comp physical fields are available directly on raw parcel rows in all cases.

## Decision Log

- Decision: Use one main agent, not subagents.
  Rationale: The work is tightly coupled across engine logic, workflow/report rendering, packet output, and grievance docs.
  Date/Author: 2026-03-18 / Codex

- Decision: There are no separate "UI consumers" to migrate.
  Rationale: The grievance presentation path is one coupled workflow surface in `albany-full-dashboard.jsx`.
  Date/Author: 2026-03-18 / User

- Decision: `HOW_COMPARABLES_ARE_CHOSEN.md` must be updated as part of the same change.
  Rationale: Comparable-selection logic must remain understandable and aligned with implementation.
  Date/Author: 2026-03-18 / User

- Decision: Do not emit claim recommendations unless sale-backed evidence is sufficient.
  Rationale: This is a core defensibility requirement for the new workflow.
  Date/Author: 2026-03-18 / User

- Decision: Do not emit requested assessed value unless sale-backed evidence is sufficient.
  Rationale: Requested value must come from defensible sale-backed evidence, not mixed or thin signals.
  Date/Author: 2026-03-18 / User

- Decision: Remove `Adjusted AV` from the grievance workflow.
  Rationale: The user explicitly wants it removed from workflow surfaces.
  Date/Author: 2026-03-18 / User

- Decision: The packet must explain how the grievance-preparation result was produced.
  Rationale: The packet should be understandable and assessor-defensible.
  Date/Author: 2026-03-18 / User

- Decision: The packet explanation section must identify data inputs, filters, adjustments, and limitations.
  Rationale: The user explicitly approved this framing.
  Date/Author: 2026-03-18 / User

## Outcomes and Acceptance Targets

At completion, the workflow should behave like this:

- Sale-backed evidence is evaluated explicitly before any claim recommendation or requested assessed value is shown.
- Broad comp discovery may still surface research candidates, but a separate tighter evidence pool controls grievance-facing conclusions.
- Valuation-date sale windows and fallback windows are applied consistently.
- `Adjusted AV` no longer appears in grievance summary, evidence review, packet output, or filing helper surfaces.
- The final downloadable grievance packet includes a dedicated explanation section covering data inputs, filters, adjustments, and limitations.
- `GRIEVANCE_APP_COMPLETE_SPEC.md` and `HOW_COMPARABLES_ARE_CHOSEN.md` match the implemented logic.

## Plan of Work

### Milestone 1: Rebuild the grievance evidence foundation in the engine

Primary file:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js`

Key changes:

- Add explicit evidence-sufficiency gating for grievance conclusions.
- Separate broad visible/research comparables from a tighter sale-backed evidence pool.
- Rework market-sale logic around valuation date with fallback windows instead of a flat recent-sales rule.
- Add time-adjustment support for older fallback sales using a local trend model broadening only as needed.
- Replace roll-derived equity reliance in claim guidance / requested value decisions with the new sale-backed logic.
- Suppress requested assessed value and strong claim recommendation when evidence is insufficient.
- Remove workflow dependence on adjusted comparable assessed values as a grievance output.
- Clean up the overvaluation edge case where the flag can be active while rounded excess is displayed as zero.

### Milestone 2: Wire the workflow/report surfaces to the new engine output

Primary file:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx`

Key changes:

- Update Step 4 appeal summary to consume evidence sufficiency and new market evidence output.
- Update Step 5 evidence review to explain supportive evidence, excluded evidence, and insufficiency when applicable.
- Update Step 7 downloadable packet to use the new evidence model and remove `Adjusted AV`.
- Update Step 8 filing helper so it does not recommend claims or values when sale-backed evidence is insufficient.
- Rewrite the packet into an assessor-defensible structure with a dedicated explanation section describing data inputs, filters, adjustments, and limitations.
- Update the packet map presentation so each comparable clearly shows its distance from the subject parcel in assessor-usable form.

### Milestone 3: Rework ratio/equity reporting and sales appendices

Primary files:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx`

Key changes:

- Replace the current neighborhood equity panel with a sale-ratio study built from verified sales.
- Trim ratios and apply reliability rules for COD, PRD, and PRB.
- Show included and excluded sales with reasons based on ORPTS usability fields and condition flags.

### Milestone 4: Sync the written logic

Primary files:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\GRIEVANCE_APP_COMPLETE_SPEC.md`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\HOW_COMPARABLES_ARE_CHOSEN.md`

Key changes:

- Update the complete spec to match the implemented workflow and field semantics.
- Rewrite comparable-selection documentation in plain language so it reflects the new broad-discovery vs tighter-evidence-pool logic.

## Concrete Steps

Working directory for all commands:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate`

Planned command sequence:

1. Inspect and patch `grievance-engine.js`.
2. Inspect and patch `albany-full-dashboard.jsx`.
3. Patch `GRIEVANCE_APP_COMPLETE_SPEC.md`.
4. Patch `HOW_COMPARABLES_ARE_CHOSEN.md`.
5. Run `node .\grievance-engine-regression.js`.
6. Run `npm run build`.
7. Manually verify packet/workflow behavior against fixture parcels.

Expected validation transcript shape:

    > node .\grievance-engine-regression.js
    grievance-engine-regression: <N>/<N> tests passed

    > npm run build
    > albany_real_estate@1.0.0 build
    > node build-app.js

The exact build output may vary, but the command must exit successfully.

## Validation and Acceptance

### Global validation

- Run `node .\grievance-engine-regression.js` and expect all tests to pass.
- Run `npm run build` and expect a successful build.

### Behavioral validation by fixture

For `64.83-1-22`:

- The post-change workflow must not emit a sale-backed claim recommendation unless evidence sufficiency is met.
- If insufficient, the workflow must explain insufficiency rather than leaning on `EXCESSIVE`.
- Market evidence behavior must be traceable to the valuation-window logic rather than a generic recent-sales failure message alone.

For `76.24-2-11`:

- The package must not present a strong grievance conclusion unsupported by sale-backed evidence.
- Packet wording must explain the method used and any insufficiency or fallback logic.

For `65.81-4-19`:

- The workflow should remain cautious.
- Packet/helper output should explicitly explain why the case remains research-only or insufficient if that remains the result after the new logic.

For `75.28-5-17`:

- The post-change workflow must not continue to rely on a default `EXCESSIVE` recommendation unless sale-backed evidence is sufficient under the new rules.
- If the case remains grievance-package eligible, the packet must explain why that package is still defensible and what sale-backed evidence supports it.
- If sale-backed evidence remains insufficient, the workflow and packet must downgrade to explanation/manual guidance rather than preserving the current recommendation shape.

### Packet-specific acceptance

The downloadable packet must contain a dedicated explanation section that clearly covers:

- what data was used
- what was filtered out and why
- whether adjustments were applied
- how the conclusion or requested value was produced
- what the limitations are

The packet must not contain `Adjusted AV`.

The downloadable packet comparable map must show the subject-to-comp distance for each included comparable, at minimum in the map legend or comp labels.

## Idempotence and Recovery

- Documentation edits are safely repeatable if they continue to reflect the implemented code.
- Engine and dashboard edits should be made in small coherent patches and validated immediately after major changes.
- If a milestone introduces regressions, revert only the current local changes being made for that milestone rather than broad repo resets.
- Keep the repo clean after completion except for the intended implementation changes.

## Interfaces and Dependencies

Files and interfaces expected to remain aligned at the end:

- `grievance-engine.js`
  - grievance summary output must expose the fields needed by the dashboard packet/helper surfaces for evidence sufficiency, market evidence, ratio study output, and claim guidance.
- `albany-full-dashboard.jsx`
  - grievance workflow rendering must consume the new engine output directly instead of reconstructing contradictory logic locally.
- `GRIEVANCE_APP_COMPLETE_SPEC.md`
  - must describe the same gating and evidence model implemented in code.
- `HOW_COMPARABLES_ARE_CHOSEN.md`
  - must explain the same comparable-selection and evidence-pool logic implemented in code.

Existing local data sources to use:

- `albany-roll.json`
- `albany-sales.json`
- nested `inventory` parcel data already present in roll records

No new external municipality calendar source is required for this milestone.

## Surprises and Discoveries

- `2026-03-18`: The current baseline confirms that the market-sale model is unavailable for all four fixture parcels, including parcels that still produce grievance packages.
- `2026-03-18`: The current overvaluation flag can show active even when rounded displayed excess is zero because the boolean and display rounding do not use the same threshold.

## Artifacts and Notes

Key file touchpoints already identified:

- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1174`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1224`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1279`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1343`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1394`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1501`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\grievance-engine.js:1548`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:2745`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:2898`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:2954`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:3136`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:3313`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:3531`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:6910`
- `C:\Users\steph\OneDrive\Documents\claude\albany_real_estate\albany-full-dashboard.jsx:7148`

## Revision Note

Initial execution plan added on `2026-03-18` before implementation begins so the user can review scope, milestones, and acceptance criteria first.
