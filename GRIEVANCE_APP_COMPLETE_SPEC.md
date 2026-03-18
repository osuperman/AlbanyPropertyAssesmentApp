# GRIEVANCE_APP_COMPLETE_SPEC

This document is the authoritative implementation reference for the Albany grievance workflow.

It describes the behavior implemented across:

- `grievance-engine.js`
- `albany-full-dashboard.jsx`
- the filing helper
- the printable grievance packet

If this file and `HOW_COMPARABLES_ARE_CHOSEN.md` ever differ, this file controls.

## 1. Input Fields

### 1.1 Subject Profile Fields

The subject parcel may provide data from the roll row, joined inventory row, or derived profile. The workflow may use:

- `parcelId` / `printKey`
- `address`
- `neighborhood`
- `neighborhoodAssociation`
- `zip`
- `propertyClass`
- `assessedValue`
- `fullMarketValue`
- `livingAreaSqft`
- `yearBuilt`
- `bedrooms`
- `fullBaths`
- `halfBaths`
- `style`
- roll metadata needed for grievance analysis

### 1.2 Candidate Comp Profile Fields

Candidate comp rows use the same general fields as the subject parcel where available.

### 1.3 Derived Comparison Fields

The engine may derive:

- distance in miles
- living area percent difference
- year built difference
- bed and bath deltas
- assessed value per square foot
- equity ratio
- quality score
- confidence score
- grievance support score

## 2. Hard Exclusions (Pre-Scoring Reject Rules)

Reject a candidate before scoring if any of the following are true:

- same parcel as subject
- incompatible residential class
- missing both assessed value and FMV
- outside the main comparable geography
- living area difference is materially too large
- year built difference is materially too large
- bedroom difference is materially too large
- bath difference is materially too large

Current working thresholds in the grievance engine are:

- living area difference greater than about `45%`
- year built difference greater than about `60` years
- bedroom difference greater than `2`
- bath difference greater than `2.5`

## 3. Residential Class Compatibility

Residential class compatibility is a positive scoring factor in the visible-comp engine.

The engine prefers:

- close residential class matches first
- broader residential family matches second

## 4. Location Similarity Score

Location similarity favors:

- same neighborhood
- same street when relevant
- same ZIP within close distance
- nearer parcels over farther parcels

Albany remains geography-strict for the main visible comparable engine.

## 5. Physical Attribute Scoring

The visible comparable engine scores surviving candidates on:

- living area similarity
- year built similarity
- bedroom similarity
- bath similarity
- style-family similarity
- FMV alignment

These factors determine whether a home belongs in the visible list and whether it is strong enough to be considered for the grievance package.

## 6. Quality Score Penalties

Subtract penalties for weak or missing data, including:

- missing living area
- missing year built
- missing beds or baths
- uncertain style normalization
- broader geography fallback
- weaker FMV support

## 7. Quality Score Assembly

The quality score combines:

- class compatibility
- location similarity
- physical match factors
- FMV alignment
- penalties

Quick-reference maxima:

| Component | Max Points |
|---|---|
| Class compatibility | 18 |
| Location similarity | 22 |
| Living area | 18 |
| Year built | 10 |
| Bedrooms | 8 |
| Baths | 8 |
| Style family | 10 |
| FMV alignment | 4 |

## 8. Data Confidence Score

Each visible comp also receives a confidence score that starts high and drops when important fields are missing or uncertain.

Confidence is reduced by incomplete or unreliable values for:

- living area
- assessed value
- FMV
- year built
- bedrooms
- baths
- style
- distance

## 9. Grievance Support Score

Each visible comp also receives a grievance support score.

This score is separate from physical similarity and combines:

- raw assessed value advantage
- assessed value per square foot advantage
- equity ratio advantage
- sale-evidence bonus or penalty
- normalization penalties when metrics are tied
- penalties for weak quality or weak confidence

Quick-reference contribution caps:

| Component | Max / Rule |
|---|---|
| Raw AV contribution | `+25` base |
| Raw AV size-direction modifier | `x1.35` or `x0.60` |
| AV per sqft contribution | `+20` |
| Equity ratio contribution | `+18` |
| Sale-evidence bonus | `+6` |
| Sale confirmation bonus | `+3` |
| Normalization penalty | `-8` |
| Small raw-advantage penalty | `-3` |
| Confidence penalty | `-8` |
| Quality penalty | `-10` |
| Negative sale-evidence penalty | `-5` |
| Clamp | `[-100, 100]` |

Support labels exposed to the UI are:

- `strong_support`
- `moderate_support`
- `weak_support`
- `neutral`
- `weakens_case`

## 10. Visible List Construction

The visible list is the physical-match layer.

Normal behavior:

- rank surviving candidates by physical similarity and related tie-breakers
- keep up to `12` visible comps

If strict physical matches are thin, the engine may use a fallback visible-list strategy while still preserving a research-vs-package distinction.

## 11. Grievance Package Gates

The default grievance package is narrower than the visible list.

A comp must satisfy all of:

- `quality_score >= 50`
- `confidence_score >= 60`
- `grievance_support > 0`

If visible comps exist but none clear these gates, the result may still be `research_only`.

## 12. Package Assembly - Sort Order

Sort the grievance package to favor:

- stronger grievance support
- better quality
- better confidence
- useful local diversity instead of redundant same-point comps

## 13. Package Assembly - Selection Rules

Package assembly still aims to:

- usually keep `3` to `5` homes
- prefer strong and moderate support
- limit same-street overconcentration
- exclude low-end assessed outliers
- suppress weaker duplicates
- preserve useful bracketing when possible

The broadened research list remains separate from the default grievance package.

## 14. Structured Grievance Output

The grievance workflow now emits explicit structured sections so the dashboard, filing helper, and printable packet all consume the same logic.

The dashboard may also expose an internal explainability surface for admin/debug use. That surface should be derived from the same comparable-selection diagnostics already attached to visible comps, rather than from a second independent scoring system.

Required sections:

- `rollContext`
- `evidenceSufficiency`
- `claimGuidance`
- `marketEvidenceModel`
- `ratioStudyModel`
- `ratioStudyDirectComparison`
- `salesAppendix`

Compatibility aliases may remain for older code paths, but the structured fields above are the intended output contract.

### 14.1 Roll Context

`rollContext` must include:

- `assessmentYear`
- `rollType`
- `valuationDate`
- `taxableStatusDate`
- `uniformPercentOfValue`
- derived LOA / equalization ratio

The valuation date from `rollContext` controls the sale-window logic used by the sale-backed market model and ratio study.

### 14.2 Evidence Sufficiency

`evidenceSufficiency` is computed after package assembly and after the sale-backed market model is built.

Allowed statuses:

- `sale_backed_sufficient`
- `sale_backed_insufficient`
- `needs_homeowner_evidence`

Required fields:

- `status`
- `label`
- `canRecommendClaim`
- `canRecommendValue`
- `reason`

Automatic claim guidance and automatic requested value are allowed only when `status == sale_backed_sufficient`.

### 14.3 Claim Guidance Output

`claimGuidance` must include:

- `allowRecommendation`
- `recommendationCode`
- `recommendedReason`
- `selectionLabel`
- `reason`

If evidence is insufficient, `allowRecommendation` must be `false` and the workflow must instruct the user to review RP-524 Part Three manually.

`claimGuidance` may recommend `UNEQUAL` only when the subject has a directly comparable verified sale ratio inside the accepted valuation window. The packet must not substitute a roll-derived or implied subject ratio for this direct-comparison gate.

### 14.4 Packet / Helper Explanation Requirements

The printable packet must include a dedicated explanation section that states:

- what data were used
- what was filtered out
- whether older sales were time-adjusted
- whether geography broadened beyond Tier 1
- how the requested assessed value was derived when one is shown
- what limitations remain in the evidence

The comparable map in the packet must show the distance from the subject parcel to each included comp.

The packet map must also include a readable distance reference such as "Distances shown in miles from subject parcel" and retain the north arrow.

The packet may include a separate subsection for `Supplemental market-evidence comps` only when sale-backed excessive-assessment evidence is leading. These properties must:

- remain separate from the primary grievance-comp set
- still clear the normal quality and confidence minimums
- be reasonably comparable on class, market area, size, and year
- be clearly labeled `Retained for market-value evidence`

Neighborhood fairness benchmarks are packet context only. They must never override stronger direct sale-backed evidence and should be shown only briefly when favorable or when needed to explain mixed context.

### 14.5 Removed Display Concept

`Adjusted AV` is removed from the grievance workflow surfaces. Do not display it in:

- grievance summary cards
- packet summary tables
- filing helper output
- assessor-exhibit narrative

## 15. Suggested Requested Assessed Value

### 15.1 Gate

The requested assessed value is no longer produced by the old comp-only dual-method calculation.

Compute a requested assessed value only if:

- `marketEvidenceModel.available == true`
- `evidenceSufficiency.canRecommendValue == true`
- `marketEvidenceModel.estimatedSubjectFmv` is finite
- `rollContext.uniformPercentOfValue` or the derived equalization ratio is finite

If any of these are missing, suppress the requested value and return manual-review language.

### 15.2 Formula

```
requested_assessed_value = estimated_subject_fmv * uniform_percent_of_value
```

Round to the same display granularity used elsewhere in the grievance workflow.

### 15.3 Output Behavior

Display:

- the requested assessed value when available
- the explanatory note describing how it was derived
- manual-review text when evidence is insufficient

Do not display legacy `Method A` / `Method B` labels.

### 15.4 SCAR Cap Check

If the recommended reduction exceeds about `25%`, show a SCAR warning. The warning does not by itself invalidate the requested value.

## 16. Overvaluation Flag (Independent Check)

The overvaluation flag remains a separate supporting signal. It is not sufficient by itself to trigger an automatic claim recommendation.

Computation:

```
expected_av = subject.fmv * municipality.equalization_rate
overvaluation_excess = round(subject.av - expected_av)

active = overvaluation_excess > 0
```

Required outputs:

- `active`
- `expectedAssessedValue`
- `overvaluationExcess`
- user-facing message

Do not mark the flag active when the rounded excess is `0`.

If the equalization ratio is unavailable, skip the flag and return a note.

## 17. Claim Guidance

Evaluate claim guidance after package assembly, market evidence, ratio study, and evidence sufficiency.

### 17.1 Gate

If `evidenceSufficiency.canRecommendClaim != true`:

- no automatic `UNEQUAL` recommendation
- no automatic `EXCESSIVE` recommendation
- return manual-review language for RP-524 Part Three

### 17.2 Unequal Assessment Rule

If evidence is sufficient, compare:

- the subject's verified sale ratio from a recent arm's-length sale inside the accepted valuation window
- the local verified-sale median ratio from the ratio study

Rule:

```
canCompareSubjectToRatioStudyDirectly =
    subject has verified arm's-length sale
    and sale falls inside ratioStudyModel.windowMonths
    and subject verified sale ratio is valid

if canCompareSubjectToRatioStudyDirectly:
    ratio_gap = subject_verified_sale_ratio - ratioStudyModel.medianRatio

    if ratio_gap >= 0.05 and ratioStudyModel.reliabilityLabel != "low":
        recommendation = "UNEQUAL"
```

If `canCompareSubjectToRatioStudyDirectly != true`, the ratio study remains neighborhood context only. It may still display COD / PRD / PRB, but it must not be used as direct headline proof against a roll-derived or implied subject ratio.

### 17.3 Excessive Assessment Rule

If the unequal-assessment rule does not trigger, and the sale-backed market model still implies a materially lower market value:

```
if marketEvidenceModel.impliedDifferencePct > 0.03:
    recommendation = "EXCESSIVE"
```

### 17.4 Fallback

If the sale-backed models are directionally useful but do not separate the grounds strongly enough:

- suppress the automatic recommendation
- return manual-review language

## 18. Assessor Counter-Argument Risk Flags

The workflow may still surface risk flags on selected comps to explain how the assessor may respond.

Common risk factors include:

- recent sale evidence that weakens the comp
- large size difference
- large bath difference
- different neighborhood
- lower confidence data
- large age gap

## 19. Sale-Backed Market Evidence Model

This is the market model used for automatic claim/value gating.

### 19.1 Candidate Sale Pool

Use ORPTS-linked sales for parcels that:

- are the same residential family as the subject
- are not the subject parcel
- fall within Tier 1 to Tier 4 geography
- have a usable sale price and sale date

Each sale record must also capture:

- ORPTS usability flags
- condition flags
- geography tier
- months from valuation date
- physical-match diagnostics
- inclusion or exclusion reasons

### 19.2 Geography Tiers

Use these tiers in order:

1. Tier 1: same neighborhood
2. Tier 2: same neighborhood association, or same ZIP within `1` mile if association data is missing
3. Tier 3: within `2` miles
4. Tier 4: within `4` miles for research-only broadening

Each expansion must retain a reason in the output.

### 19.3 Valuation Windows

Use these windows in order, anchored to the roll valuation date:

1. `24` months
2. `36` months
3. `60` months

The model chooses the first window/tier combination that produces at least `3` usable included sales.

### 19.4 Included Sale Rules

Included sales must be:

- arm's-length
- usable for study
- free of ORPTS condition flags that indicate non-standard transfer
- physically acceptable for the tighter evidence pool
- inside the selected window and tier

### 19.5 Time Adjustment

If older-than-24-month sales are needed, the engine attempts to build a local trend model from usable local sale price per square foot history for the same residential family.

If a valid trend model exists:

- older sales may be adjusted forward to the valuation date

If not:

- the model does not invent a time adjustment
- older sales that require adjustment but cannot be adjusted are not forced into the estimate

### 19.6 Outputs

`marketEvidenceModel` must include:

- `available`
- `saleCount`
- `expandedRadius`
- `sufficientForClaim`
- `reliabilityLabel`
- `valuationDate`
- `windowMonths`
- `windowLabel`
- `tierUsed`
- `tierLabel`
- `neighborhoodMedianPpsf`
- `estimatedSubjectFmv`
- `estimatedValueLow`
- `estimatedValueHigh`
- `impliedDifference`
- `impliedDifferencePct`
- `includedSales`
- `excludedSales`
- `timeAdjustmentMethod`
- `insufficiencyReason`
- `note`

## 20. Verified Sale-Ratio Study

The old neighborhood equity percentile panel is replaced for grievance logic by a verified sale-ratio study.

### 20.1 Candidate Pool

Use the same sale-backed collection approach as the market model, but only Tiers `1` through `3` are used for the ratio study.

Each included ratio record must have:

- assessed value at sale
- verified sale price
- ratio = `assessment / sale price`

### 20.2 Trimming and Reliability

If the raw usable sample is at least `20`, trim the top and bottom `5%` of ratios before computing the final reported metrics.

Required outputs:

- `rawSampleSize`
- `trimmedSampleSize`
- `trimRule`
- `medianRatio`
- `cod`
- `prd`
- `prb`
- `reliabilityLabel`
- `includedSales`
- `excludedSales`
- `codWarning`

### 20.3 Metric Rules

- COD is computed for all usable trimmed samples.
- PRD is shown only when the trimmed sample is at least `20`.
- PRB is shown only when the trimmed sample is at least `20`.
- Below that threshold, label the panel low reliability and suppress PRD / PRB.

Do not use subject percentile as the grievance decision metric.

## 21. Subject Sale Logic

If the subject has its own recent arm's-length sale, the workflow may use it as supporting or weakening context.

The subject sale is:

- supportive when it sits materially below the current FMV estimate
- weakening when it sits at or above the current FMV estimate

Non-arm's-length subject sales are shown for context only.

## 22. Shared Snapshot Mode

Shared snapshot mode may preload a fixed comp set, but the grievance workflow still applies the current package, evidence-sufficiency, market-evidence, and claim-guidance rules to that data.

## 23. Broadened Search List

Broadened search remains a research layer beyond the main package.

### 23.1 Tiers

The broadened research view may show:

- same-neighborhood overflow
- same street
- same ZIP nearby
- broader city-strict radius

### 23.2 Sort Order

Research comps are ordered by a blend of:

- grievance support
- quality
- tier
- distance
- FMV closeness

### 23.3 Limit

Keep the broadened list capped so it remains readable.

## 24. Why a Comp May Be in the Visible List But Not the Package

The UI should explain why a visible comp was excluded from the package, using reasons such as:

- does not support grievance
- insufficient data confidence
- insufficient physical similarity
- same-street limit reached
- superseded by stronger comparable
- assessed value is an outlier
- package size limit reached

## 25. Edge Case Reference Table

| Situation | Behavior |
|---|---|
| Subject FMV is missing | Skip requested assessed value and overvaluation flag. Manual review required for automatic value output. |
| Uniform percent / equalization ratio unavailable | Skip requested assessed value and overvaluation flag. Keep manual-review language. |
| All comps fail package gates | Visible list may still exist, but the grievance package becomes `research_only` or manual-review only. |
| Sale-backed market evidence has fewer than 3 usable included sales even after widening | Mark evidence insufficient. No automatic claim recommendation or requested value. |
| Ratio-study sample is below 20 trimmed sales | Show COD if available, label low reliability, suppress PRD / PRB. |
| Older sales are needed but no valid local trend model exists | Do not force unsupported time adjustment. |
| Overvaluation excess rounds to 0 | `overvaluationFlag.active = false`. |
| Subject sale is non-arm's-length | Do not use it as support/weakening logic. |
| Requested value would increase assessment | Suppress requested value and return manual-review text. |
| Packet includes comps but evidence sufficiency is still insufficient | Show packet evidence and manual-review claim guidance, but do not emit an automatic claim type or requested value. |

## 26. Complete Scoring Reference (Quick Reference)

### Quality Score Components

| Component | Max Points |
|---|---|
| Class compatibility | 18 |
| Location similarity | 22 |
| Living area | 18 |
| Year built | 10 |
| Bedrooms | 8 |
| Baths | 8 |
| Style family | 10 |
| FMV alignment | 4 |

### Grievance Support Score Components

| Component | Max / Rule |
|---|---|
| Raw AV contribution | `+25` base |
| Raw AV size-direction modifier | `x1.35` or `x0.60` |
| AV per sqft contribution | `+20` |
| Equity ratio contribution | `+18` |
| Sale-evidence bonus | `+6` |
| Sale confirmation bonus | `+3` |
| Normalization penalty | `-8` |
| Small raw-advantage penalty | `-3` |
| Confidence penalty | `-8` |
| Quality penalty | `-10` |
| Negative sale-evidence penalty | `-5` |
| Clamp | `[-100, 100]` |

### Package Gates

| Gate | Threshold |
|---|---|
| Quality | `>= 50` |
| Confidence | `>= 60` |
| Support | `> 0` |

### Sale-Backed Recommendation Gates

| Gate | Requirement |
|---|---|
| Market evidence available | `true` |
| Included sale-backed records | `>= 3` |
| Evidence sufficiency status | `sale_backed_sufficient` |
| Requested value allowed | `canRecommendValue == true` |
| Claim guidance allowed | `canRecommendClaim == true` |
