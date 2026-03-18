---
name: albany-doc-sync
description: Albany grievance documentation sync guide for this repo. Use when code changes affect grievance logic, comparable selection, claim guidance, market evidence, or packet wording and the implementation must stay aligned with GRIEVANCE_APP_COMPLETE_SPEC.md and HOW_COMPARABLES_ARE_CHOSEN.md.
---

# Albany Doc Sync

## Overview

Use this skill when a code change also changes the meaning of the grievance workflow. The repo has one authoritative grievance spec and one plain-language comparable summary, and both must stay aligned with the shipped behavior.

## Source of Truth

- `GRIEVANCE_APP_COMPLETE_SPEC.md` is the authoritative implementation spec.
- `HOW_COMPARABLES_ARE_CHOSEN.md` is the user-facing plain-language summary.
- Dashboard, packet, and filing-helper copy also count as user-facing documentation and must match the implemented logic.

## Sync Order

1. Make the code behavior correct.
2. Update `GRIEVANCE_APP_COMPLETE_SPEC.md` to match the implemented rules exactly.
3. Update `HOW_COMPARABLES_ARE_CHOSEN.md` so it explains the same behavior in plain language.
4. Review dashboard, packet, and helper wording for stale phrasing.

## What Usually Drifts

- Old field names or metrics after a logic removal
- Claim guidance wording after recommendation rules change
- Comparable-selection summaries after gating or tier logic changes
- Packet language that still describes the old model after engine changes

## Working Rules

- Do not leave the summary doc on old logic just because the engine works.
- Do not preserve obsolete wording for continuity if it now misstates the behavior.
- If the summary and spec differ, the spec controls, but fix the mismatch in the same pass whenever possible.
- When removing a concept, search for it across engine, dashboard, packet text, and docs.

## Verification

- Search for removed or renamed terms with `rg`.
- Re-read the relevant doc sections after code changes and check that they describe the new behavior, not the previous one.
- If packet output changed, verify that the packet language and the docs use the same logic framing.
