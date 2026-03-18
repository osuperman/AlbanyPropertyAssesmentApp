---
name: albany-data-model
description: Albany assessment and grievance data model guide for this repo. Use when working with parcel roll data, residential inventory joins, ORPTS sales, market evidence, comparable inputs, or when a grievance result looks wrong because fields may be nested or joined inconsistently.
---

# Albany Data Model

## Overview

Use this skill when a task depends on how Albany parcel, inventory, and sales data fit together. The main risk in this repo is not usually missing code; it is misunderstanding where a field actually lives and how it is joined.

## Canonical Data Sources

- `albany-roll.json`
  - parcel roll records
  - municipal roll metadata used by grievance logic
- `residential-inventory-2025.json`
  - residential inventory details that are not always flattened onto parcel rows
- `albany-sales.json`
  - ORPTS-style sales records with `print_key`, `arms_length_flag`, `cod_usable`, `rar_usable`, many `cond_*` flags, and `cond_memo`

## Join Model

- Prefer `print_key` when tying sales to parcels.
- Parcel identifiers may also appear as `parcelId`, `printKey`, or `pinSbl` depending on the stage of processing.
- Do not assume the engine receives the same shape that the raw data file uses.

## Important Trap

- Parcel preprocessing in the dashboard keeps important inventory values nested under `inventory`.
- Engine logic sometimes expects top-level fields like `livingAreaSqft` or `yearBuilt`.
- If a market or comparable model says evidence is missing, check for nested inventory data before treating it as a true data shortage.

## Working Heuristics

1. Identify the field at the raw-file level.
2. Check how the dashboard preprocesses it.
3. Check whether the engine reads the preprocessed shape or assumes a flatter one.
4. Only after that decide whether the problem is logic, data sparsity, or a join mismatch.

## Sales Evidence Notes

- Treat `arms_length_flag` as the first gate for market evidence.
- Use `cod_usable`, `rar_usable`, and `cond_*` flags to explain inclusion and exclusion, not just to silently drop records.
- Keep broad comparable discovery separate from the tighter sale-backed evidence pool when building grievance support.

## Useful Checks

- Search for field use with `rg -n "livingAreaSqft|yearBuilt|inventory|print_key|arms_length_flag|cod_usable|rar_usable"`.
- When a value disappears between layers, inspect both the raw JSON shape and the preprocessed parcel shape.
- When a result looks implausible, test one or two known parcels instead of debugging abstractly.
