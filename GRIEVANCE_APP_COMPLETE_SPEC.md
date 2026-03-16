# Grievance App — Complete Algorithm Specification
**Version:** 2.0  
**Status:** Authoritative source of truth. Replaces `HOW_COMPARABLES_ARE_CHOSEN.md` and `GRIEVANCE_APP_BUILD_SPEC.md`.  
**Purpose:** Full implementation reference. Every rule, threshold, score weight, tie-break, edge case, and output label is defined here. No ambiguity is intentional.

---

## 1. Input Fields

### 1.1 Subject Profile Fields

These fields are collected or derived for the subject property before any scoring begins.

| Field | Type | Source | Required |
|---|---|---|---|
| `parcel_id` | string | Assessment roll | Yes |
| `address` | string | Assessment roll | Yes |
| `neighborhood` | string | Assessment roll / lookup | Yes |
| `zip_code` | string | Assessment roll | Yes |
| `street_name_normalized` | string | Derived from address | Yes |
| `property_class` | string | Assessment roll | Yes |
| `living_area_sqft` | float | Assessment roll | Yes |
| `year_built` | integer | Assessment roll | Soft required |
| `bedrooms` | integer | Assessment roll | Soft required |
| `full_baths` | float | Assessment roll | Soft required |
| `half_baths` | float | Assessment roll | Optional |
| `style` | string | Assessment roll | Soft required |
| `style_family` | string | Normalized from style | Soft required |
| `assessed_value` (AV) | float | Assessment roll | Yes |
| `full_market_value` (FMV) | float | Assessment roll | Yes |
| `equity_ratio` | float | Derived: AV / FMV | Yes |
| `av_per_sqft` | float | Derived: AV / living_area_sqft | Yes |
| `fmv_per_sqft` | float | Derived: FMV / living_area_sqft | Yes |
| `latitude` | float | Geocoded | Soft required |
| `longitude` | float | Geocoded | Soft required |
| `lot_size_acres` | float | Assessment roll | Optional |
| `garage_type` | string | Assessment roll | Optional |
| `garage_count` | integer | Assessment roll | Optional |
| `condition_code` | string | Assessment roll | Optional |
| `basement_type` | string | Assessment roll | Optional |
| `municipality_code` | string | Assessment roll | Yes |
| `equalization_rate` | float | ORPTS Municipal Data Portal | Yes |
| `orpts_sale_price` | float | ORPTS sales data | Optional |
| `orpts_sale_date` | date | ORPTS sales data | Optional |
| `orpts_sale_arm_length` | boolean | ORPTS sales data | Optional |

**"Soft required"** means: the field is expected in normal operation. If missing, apply the data confidence penalties defined in Section 8 and continue processing. Do not reject the subject.

### 1.2 Candidate Comp Profile Fields

Same fields as subject. Additionally:

| Field | Type | Notes |
|---|---|---|
| `distance_miles` | float | Haversine distance from subject coordinates |
| `is_subject` | boolean | Always false for candidates |

### 1.3 Derived Comparison Fields (computed per subject-comp pair)

| Field | Formula |
|---|---|
| `living_area_pct_diff` | `abs(comp.living_area - subject.living_area) / subject.living_area` |
| `year_built_diff` | `abs(comp.year_built - subject.year_built)` |
| `bedroom_diff` | `abs(comp.bedrooms - subject.bedrooms)` |
| `bath_diff` | `abs(comp.full_baths - subject.full_baths)` (including 0.5 increments) |
| `fmv_pct_diff` | `abs(comp.fmv - subject.fmv) / max(comp.fmv, subject.fmv)` |
| `av_raw_diff` | `subject.av - comp.av` (positive = comp is lower) |
| `av_pct_diff` | `av_raw_diff / max(subject.av, comp.av)` |
| `av_per_sqft_pct_diff` | `(subject.av_per_sqft - comp.av_per_sqft) / comp.av_per_sqft` |
| `equity_ratio_diff` | `subject.equity_ratio - comp.equity_ratio` (positive = comp lower ratio) |

---

## 2. Hard Exclusions (Pre-Scoring Reject Rules)

A parcel is **rejected before any scoring** if any of the following is true. Rejection is binary — no partial scoring.

| Rule | Condition | Reason |
|---|---|---|
| E1 | `comp.parcel_id == subject.parcel_id` | Same parcel |
| E2 | `subject.property_class` is not residential | Subject must be residential |
| E3 | Class compatibility check fails (see Section 3) | Incompatible class |
| E4 | `comp.av IS NULL AND comp.fmv IS NULL` | No value data at all |
| E5 | `comp.distance_miles > 4.0` | Too far (standard mode) |
| E5-strict | `comp.distance_miles > 2.0` | Too far (city_strict_geo_mode = true, e.g. City of Albany) |
| E6 | `living_area_pct_diff > 0.45` | Size too different (tightened from 0.60) |
| E7 | `year_built_diff > 60` | Age too different (tightened from 100) |
| E8 | `bedroom_diff > 2` | Bedroom count too different (tightened from 3) |
| E9 | `bath_diff > 2.5` | Bath count too different |

**Edge case — missing distance:** If `comp.latitude` or `comp.longitude` is null, distance cannot be computed. Do **not** reject on E5/E5-strict. Apply `-5` data confidence penalty (Section 8). Continue to scoring.

**Edge case — missing living area:** If `comp.living_area_sqft` is null, E6 cannot be evaluated. Do **not** reject. Apply `-6` quality penalty (Section 7g) and `-18` confidence penalty (Section 8). Continue.

**Edge case — missing year built:** If `comp.year_built` is null, E7 cannot be evaluated. Do **not** reject. Apply `-3` quality penalty and `-8` confidence penalty. Continue.

---

## 3. Residential Class Compatibility

Evaluate before physical scoring. This produces a class score used in Section 7.

| Condition | Class Score | Action |
|---|---|---|
| Exact class match | `18` | Continue |
| Close residential pair (see 3a) OR both imply same unit count | `11` | Continue |
| Broad residential match (fallback mode only, see Section 10) | `4` | Continue only in fallback |
| Incompatible | `0` | **Hard reject (E3)** |

### 3.1 Close Residential Pairs

Close residential pair = any of the predefined class-code pairs in the application's `close_residential_pairs` lookup table, OR any two classes that both imply the same residential unit count (e.g., both are single-family).

### 3.2 Broad Residential Match

Broad residential match is only permitted in fallback mode (Section 10). It is not applied in first-pass scoring.

---

## 4. Location Similarity Score

Produces a location score added to the quality score (Section 7).

| Condition | Points |
|---|---|
| Same neighborhood AND distance ≤ 0.5 miles | `22` |
| Same neighborhood AND distance ≤ 1.0 miles | `20` |
| Same neighborhood (any distance, or distance unknown) | `18` |
| Same normalized street name | `17` |
| Same ZIP AND distance ≤ 1.0 miles | `14` |
| Same ZIP AND distance ≤ 2.0 miles | `10` |
| Same ZIP AND distance unknown | `10` |
| Distance ≤ 4.0 miles (no ZIP/neighborhood match) | `5` |
| No match on any above condition | `0` |

**Additional neighborhood mismatch penalty (applied to quality score, not location score):**

```
if comp.neighborhood != subject.neighborhood AND comp.distance_miles > 1.0:
    quality_score -= 8
```

This penalty is applied after the base quality score is computed (Section 7), before clamping. It is separate from and additive to the location score reduction above.

---

## 5. Physical Attribute Scoring

Each sub-score is described below. All sub-scores feed into the quality score (Section 7).

### 5.1 Living Area Points

| Condition | Points |
|---|---|
| `living_area_pct_diff` ≤ 5% | `18` |
| `living_area_pct_diff` ≤ 10% | `16` |
| `living_area_pct_diff` ≤ 15% | `13` |
| `living_area_pct_diff` ≤ 25% | `9` |
| `living_area_pct_diff` ≤ 40% | `4` |
| `living_area_pct_diff` > 40% | `0` |

### 5.2 Year Built Points

| Condition | Points |
|---|---|
| Exact same year | `10` |
| `year_built_diff` ≤ 5 | `9` |
| `year_built_diff` ≤ 10 | `7` |
| `year_built_diff` ≤ 20 | `5` |
| `year_built_diff` ≤ 40 | `2` |
| `year_built_diff` > 40 | `0` |

### 5.3 Bedroom Points

| Condition | Points |
|---|---|
| Same count | `8` |
| `bedroom_diff` = 1 | `6` |
| `bedroom_diff` = 2 | `3` |

Note: `bedroom_diff` > 2 triggers hard exclusion E8 before reaching this step.

### 5.4 Bath Points

| Condition | Points |
|---|---|
| Same count | `8` |
| `bath_diff` = 0.5 | `7` |
| `bath_diff` = 1.0 | `5` |
| `bath_diff` = 1.5 | `2` |
| `bath_diff` > 1.5 and ≤ 2.5 | `1` |

### 5.5 Style Points

| Condition | Points |
|---|---|
| Same normalized style family | `10` |
| Style known but normalization uncertain | `3` |
| Style unknown or no match | `0` |

### 5.6 FMV Alignment Points (reduced weight)

| Condition | Points |
|---|---|
| `fmv_pct_diff` ≤ 5% | `4` |
| `fmv_pct_diff` ≤ 10% | `3` |
| `fmv_pct_diff` ≤ 20% | `2` |
| `fmv_pct_diff` ≤ 35% | `1` |
| `fmv_pct_diff` > 35% | `0` |

**Note:** Maximum reduced from 10 to 4. FMV is the number being challenged; heavily rewarding FMV similarity risks anchoring to the assessor's potential error. The grievance support score (Section 9) captures economic alignment where it belongs.

---

## 6. Quality Score Penalties

Subtract the following from the quality score **before** clamping. Penalties are cumulative.

| Condition | Penalty |
|---|---|
| Fewer than 2 usable physical fields on either side | `-20` |
| Fewer than 3 usable physical fields on either side | `-12` |
| `living_area_sqft` missing on either side | `-6` |
| `year_built` missing on either side | `-3` |
| Both `bedrooms` and `baths` missing on either side | `-5` |
| ≥ 2 hard-check fields missing AND < 2 usable physical fields | `-8` |
| `comp.neighborhood != subject.neighborhood AND distance > 1.0 miles` | `-8` |

**"Usable physical field"** = any of: living_area_sqft, year_built, bedrooms, full_baths, style_family — present on both subject and comp.

---

## 7. Quality Score Assembly

```
quality_score = 0
quality_score += class_score           // Section 3: 0, 4, 11, or 18
quality_score += location_score        // Section 4: 0 to 22
quality_score += living_area_points    // Section 5.1: 0 to 18
quality_score += year_built_points     // Section 5.2: 0 to 10
quality_score += bedroom_points        // Section 5.3: 0 to 8
quality_score += bath_points           // Section 5.4: 0 to 8
quality_score += style_points          // Section 5.5: 0 to 10
quality_score += fmv_alignment_points  // Section 5.6: 0 to 4
quality_score -= quality_penalties     // Section 6: subtractive

// Clamp
quality_score = max(0, min(100, quality_score))
```

**Maximum possible quality score:** 18 + 22 + 18 + 10 + 8 + 8 + 10 + 4 = **98** (before penalties)

---

## 8. Data Confidence Score

Starts at `100`. Subtract for each condition present. Cumulative.

| Condition | Penalty |
|---|---|
| `living_area_sqft` missing on either side | `-18` |
| `assessed_value` missing on either side | `-12` |
| `fmv` missing on either side | `-8` |
| `year_built` missing on either side | `-8` |
| `bedrooms` missing on either side | `-6` |
| `full_baths` missing on either side | `-6` |
| Style family normalization unknown | `-5` |
| Distance unavailable | `-5` |
| Fewer than 3 usable physical fields | `-10` |

**Clamp:** `confidence_score = max(0, min(100, 100 - sum_of_penalties))`

**Labels:**

| Range | Label |
|---|---|
| 80–100 | `"High"` |
| 60–79 | `"Medium"` |
| 0–59 | `"Low"` |

---

## 9. Grievance Support Score

Measures how well a comp supports the grievance. Computed independently from quality score.

Start at `0`. Add contributions. Clamp at end to `[-100, 100]`.

### 9.1 Raw Assessed Value Contribution

```
av_pct_diff = (subject.av - comp.av) / max(subject.av, comp.av)
```

| Condition | Base Points |
|---|---|
| `av_pct_diff` ≥ 0.15 (comp lower by ≥ 15%) | `+25` |
| `av_pct_diff` ≥ 0.08 | `+18` |
| `av_pct_diff` ≥ 0.03 | `+10` |
| `av_pct_diff` > 0 and < 0.03 | `+3` |
| `av_pct_diff` ≤ -0.08 (comp higher by ≥ 8%) | `-18` |
| `av_pct_diff` ≤ -0.03 | `-10` |
| `av_pct_diff` > -0.03 and ≤ 0 | `-4` |

**Size-direction modifier** — apply after base points are computed:

```
size_ratio = comp.living_area_sqft / subject.living_area_sqft

if av_pct_diff > 0:   // comp is lower AV (positive grievance direction)
    if size_ratio > 1.05:
        raw_av_contribution *= 1.35   // comp is LARGER and lower AV — compelling
    elif size_ratio < 0.95:
        raw_av_contribution *= 0.60   // comp is SMALLER and lower AV — expected, weak
    // within ±5% size: no modifier applied

if av_pct_diff < 0:   // comp is higher AV (negative direction)
    // no size modifier; existing penalty stands
```

**Edge case — comp AV missing:** If `comp.av` is null, skip Section 9.1 entirely. Apply `-12` confidence penalty (already captured in Section 8).

### 9.2 Assessed Value Per Square Foot Contribution

```
av_per_sqft_pct_diff = (subject.av_per_sqft - comp.av_per_sqft) / comp.av_per_sqft
```

| Condition | Points |
|---|---|
| `av_per_sqft_pct_diff` ≥ 0.12 (comp lower by ≥ 12%) | `+20` |
| `av_per_sqft_pct_diff` ≥ 0.06 | `+12` |
| `av_per_sqft_pct_diff` ≥ 0.02 | `+6` |
| `av_per_sqft_pct_diff` ≤ -0.02 (comp higher by ≥ 2%) | `-8` |
| Between -0.02 and +0.02 | `0` |

**Edge case — living area missing on either side:** If `living_area_sqft` is null for subject or comp, skip Section 9.2. `av_per_sqft_pct_diff` = undefined.

### 9.3 Equity Ratio Contribution

```
equity_ratio_diff = subject.equity_ratio - comp.equity_ratio
// positive = comp has lower equity ratio (favorable for grievance)
```

| Condition | Points |
|---|---|
| `equity_ratio_diff` ≥ 6 points | `+18` |
| `equity_ratio_diff` ≥ 3 points | `+10` |
| `equity_ratio_diff` ≥ 1 point | `+4` |
| `equity_ratio_diff` ≤ -1 point | `-8` |
| Between -1 and +1 | `0` |

**Municipality uniformity note:** In municipalities where the assessment roll is highly uniform (e.g., Albany at ~96%), the equity ratio contribution will frequently be `0` for most comps. This is expected behavior. The dynamic claim-type recommendation (Section 17) handles this case.

**Edge case — FMV missing:** If `comp.fmv` is null, equity ratio cannot be computed. Skip Section 9.3.

### 9.4 Sale-Evidence Bonus/Penalty

Apply only when `comp.orpts_sale_arm_length = true` AND `comp.orpts_sale_date` is within 3 years of current date.

```
if comp.orpts_sale_price < subject.fmv:
    grievance_support += 6

if comp.orpts_sale_price > comp.fmv * 1.05:
    grievance_support += 3   // comp sold above its own FMV → confirms it's under-assessed

if comp.orpts_sale_price > subject.fmv:
    grievance_support -= 5

// No sale or non-arm's-length: no modifier
```

**Edge case — conflicting sale and FMV:** If `comp.orpts_sale_price` exists but `comp.fmv` is null, apply only the `comp.orpts_sale_price < subject.fmv` check. Skip the `comp.orpts_sale_price > comp.fmv * 1.05` check.

### 9.5 Normalization Penalty (Tied Metrics)

If `av_pct_diff > 0` (comp has lower raw AV) AND both of the following are true:

- `abs(equity_ratio_diff) < 1.0`
- `abs(av_per_sqft_pct_diff) < 0.02`

Then subtract `8` points. This is the "smaller home overall" situation: lower raw assessment exists, but normalized comparisons confirm the comp is not actually being favored.

### 9.6 Small Raw-Advantage Penalty

If `av_pct_diff > 0` AND `av_pct_diff < 0.03`:
Subtract `3` points.

### 9.7 Weak Confidence / Weak Quality Penalties

Unless in shared-snapshot mode (Section 20):

| Condition | Penalty |
|---|---|
| `confidence_score < 60` | `-8` |
| `quality_score < 55` | `-10` |

### 9.8 Upper Marginal Comp Flag

```
if comp.av > subject.av * 0.93:
    comp.marginal_support = true
```

Marginal comps:
- May remain in the visible list and grievance package (if they clear gates)
- Are **excluded from the suggested requested value calculation** (Section 15)
- Display a UI warning: `"Marginal support — small assessed value gap may disappear after adjustments"`

### 9.9 Final Grievance Support Score

```
grievance_support = sum of all contributions above
grievance_support = max(-100, min(100, grievance_support))
```

**Labels:**

| Range | Label |
|---|---|
| ≥ 25 | `"Strong support"` |
| 12–24 | `"Moderate support"` |
| 1–11 | `"Weak support"` |
| -8 to 0 | `"Neutral"` |
| < -8 | `"Weakens case"` |

---

## 10. Visible List Construction

### 10.1 First-Pass Rules

1. Apply all hard exclusions (Section 2)
2. Apply class compatibility (Section 3) — exact and close class only; broad class NOT allowed in first pass
3. Compute quality score (Section 7) and confidence score (Section 8) for each surviving candidate
4. **Keep** comps with `quality_score >= 40`
5. **Sort** by:
   - `quality_score` descending
   - `confidence_score` descending
   - `distance_miles` ascending
   - `fmv_pct_diff` ascending
6. **Keep top 12**

### 10.2 Fallback Rule

If the first-pass grievance candidate pool (Section 11 eligible comps) has fewer than `3` eligible candidates:

1. Re-run visible list collection with **broad residential class matching allowed**
2. Use the broader list **only if** it increases visible list size OR increases the grievance candidate pool

---

## 11. Grievance Package Gates

A visible comp is eligible for the default grievance package **only if all three gates pass:**

| Gate | Threshold |
|---|---|
| Quality gate | `quality_score >= 50` |
| Confidence gate | `confidence_score >= 60` |
| Support gate | `grievance_support > 0` |

All three must be satisfied. Failing any single gate disqualifies the comp from the package.

---

## 12. Package Assembly — Sort Order

Sort eligible comps (those passing all three gates) by:

1. `grievance_support` descending
2. `quality_score` descending
3. `confidence_score` descending
4. `distance_miles` ascending

---

## 13. Package Assembly — Selection Rules

Apply rules in this order. Stop when target package size is reached.

### 13.1 Target Package Size

```
strong_or_moderate_count = count of eligible comps with grievance_support >= 12

if strong_or_moderate_count >= 3:
    target_count = min(5, strong_or_moderate_count)
else:
    // may include up to 2 weak-support comps
    target_count = min(5, strong_or_moderate_count + min(2, weak_support_eligible_count))
```

### 13.2 Same-Street Cap

No more than `2` selected comps from the same normalized street name.

### 13.3 Dominance Suppression

A candidate (non-strong-support) may be excluded if an already-selected nearby comp satisfies **all three**:
- `quality_score >= candidate.quality_score`
- `confidence_score >= candidate.confidence_score`
- `grievance_support >= candidate.grievance_support`

AND strictly better on at least one of them.

"Nearby" = same street OR same neighborhood.

This rule applies only to non-strong-support candidates (grievance_support < 25).

### 13.4 Assessed Value Outlier Filter (Low End)

Once at least `2` comps are already selected:

```
median_selected_av = median(assessed_values of currently selected comps)

if candidate.av < median_selected_av * 0.80:
    reject candidate   // assessed value is anomalously low
```

### 13.5 Assessed Value Marginal Filter (High End)

```
if candidate.marginal_support == true:
    // still allowed in package if needed to reach minimum size
    // excluded from suggested requested value calculation (Section 15)
    // display warning in UI
```

### 13.6 Same-Street Replacement for Non-Strong Comps

A non-strong comp may replace a currently-selected comp on the same street if it dominates the selected comp on all three of: quality, confidence, and grievance support.

### 13.7 Strong-Support Corroboration Rule

Strong-support comps (grievance_support >= 25) are **not** excluded solely because another selected nearby strong comp makes a similar argument. They may stay together as corroborating evidence.

They are still subject to: package size limit, same-street cap, and the low-end outlier filter.

### 13.8 Bracket Comp Rule (Post-Assembly Optimization)

After initial package selection is complete, evaluate bracketing on living area and year built:

```
living_area_bracketed = (
    any selected comp with sqft < subject.sqft
    AND any selected comp with sqft > subject.sqft
)

year_built_bracketed = (
    any selected comp with year_built < subject.year_built
    AND any selected comp with year_built > subject.year_built
)
```

**If not bracketed on living area:**
Search remaining eligible candidates (quality >= 50, confidence >= 60, support > 0) for one that would complete the bracket.

If such a candidate exists AND:
- `candidate.grievance_support > 0`
- `package_average_support` would not drop by more than `20%`

Then swap out the lowest-support current comp from the same street or neighborhood (if one exists), and add the bracketing candidate.

Apply same logic for year built bracket after living area check.

**Do not force bracketing if:**
- No eligible candidate can achieve it
- Bracketing would require replacing a strong-support comp (grievance_support >= 25)
- The replacement candidate fails any gate

**Package-assembly bonus (alternative simpler implementation):**  
If post-assembly swap logic is not implemented, apply a package-assembly bonus during sort:

```
bracket_bonus = 0
if candidate would complete living area bracket: bracket_bonus += 4
if candidate would complete year built bracket:  bracket_bonus += 2
```

Apply this bonus only to the package-assembly sort, not to the visible list sort.

---

## 14. Comp Adjustment Column (Display and Narrative Only)

Compute for each selected comp in the grievance package. These values are display and narrative only — they do not feed back into quality, confidence, or grievance support scores.

### 14.1 Adjustment Inputs Required

- `neighborhood_price_per_sqft`: from market $/sqft model (Section 19). If unavailable, use `subject.fmv / subject.living_area_sqft` as fallback.
- `municipality.equalization_rate`: from ORPTS (Section 1.1)

### 14.2 Adjustment Formula

```
adjusted_av = comp.av

// Living area adjustment
sqft_delta = subject.living_area_sqft - comp.living_area_sqft
sqft_adjustment = sqft_delta * neighborhood_price_per_sqft * municipality.equalization_rate
adjusted_av += sqft_adjustment

// Full bath adjustment
full_bath_delta = subject.full_baths - comp.full_baths
bath_adjustment = full_bath_delta * 8000 * municipality.equalization_rate
adjusted_av += bath_adjustment

// Half bath adjustment
half_bath_delta = subject.half_baths - comp.half_baths
half_bath_adjustment = half_bath_delta * 4000 * municipality.equalization_rate
adjusted_av += half_bath_adjustment
```

**Condition and garage adjustments:** Apply if condition_code and garage data are available in parcel records. Specific dollar values are configurable per municipality. Default: skip if data unavailable.

### 14.3 Display Output Per Comp

| Column | Value |
|---|---|
| Raw AV | `comp.av` |
| Sqft Δ | `subject.sqft - comp.sqft` (show as +/- integer) |
| Full Bath Δ | `subject.full_baths - comp.full_baths` |
| Adjusted AV | `adjusted_av` (rounded to nearest $100) |
| Supports Grievance (adjusted) | `"✅ Yes"` if `adjusted_av < subject.av`, else `"⚠️ Marginal"` or `"❌ No"` |

### 14.4 Narrative Reference

Grievance summary text should use adjusted AV when available:

> "After adjusting for size and bath differences, [address] has an effective assessed value of $[adjusted_av] — $[subject.av - adjusted_av] below your current assessment."

---

## 15. Suggested Requested Assessed Value

### 15.1 Eligibility Gates for Value Calculation

A comp qualifies for the suggested value calculation only if **all** of:

- `quality_score >= 60`
- `confidence_score >= 70`
- `grievance_support >= 12`
- `comp.av` is not null
- `comp.marginal_support != true`

### 15.2 Manual Review Triggers

If any of the following: compute no suggested value and flag for manual review:

- Fewer than 2 comps qualify under 15.1
- Assessed value spread among qualifying comps exceeds `20%`
  - `spread = (max_av - min_av) / median_av > 0.20`
- All qualifying comps have `abs(equity_ratio_diff) < 1.0`

### 15.3 Method A — Inequality Method (Weighted Median of Comp AVs)

```
weights_A:
    quality_score:      35%
    grievance_support:  40%
    confidence_score:   25%

suggested_av_A = weighted_median(qualifying_comp_avs, weights_A)
```

If exactly 2 comps qualify:
```
suggested_av_A = min(weighted_average, simple_midpoint)
```

### 15.4 Method B — Equity Rate Method

```
median_comp_equity_ratio = median(equity_ratio for qualifying comps)
suggested_av_B = subject.fmv * median_comp_equity_ratio
```

**Edge case — FMV missing for subject:** Method B cannot be computed. Use Method A only.

### 15.5 Final Suggested AV

```
suggested_av = min(suggested_av_A, suggested_av_B)
```

Display both methods and label which produced the result:

```
Method A (Inequality / comp AV median):    $X
Method B (Equity rate / FMV × comp rate):  $Y
Filing recommendation (lower):             $Z  [label: "Method A" or "Method B"]
```

### 15.6 SCAR Cap Check

```
reduction_pct = (subject.av - suggested_av) / subject.av

if reduction_pct > 0.25:
    display warning:
    "⚠️ SCAR Limit Exceeded — This reduction ({reduction_pct formatted as %}%) exceeds 
    the 25% maximum allowed under SCAR proceedings (RPTL §730). If you pursue this 
    reduction, Article 7 Supreme Court proceedings may be required. Consult a 
    property tax attorney before filing."
```

---

## 16. Overvaluation Flag (Independent of Comps)

```
if subject.av > subject.fmv * municipality.equalization_rate:
    overvaluation_flag = true
    overvaluation_excess = subject.av - (subject.fmv * municipality.equalization_rate)
    
    display:
    "✅ Independent Overvaluation Detected
    Your assessed value ($[subject.av]) exceeds the expected assessed value under 
    the municipal equalization rate of [equalization_rate * 100]%. 
    Expected AV: $[subject.fmv * equalization_rate]
    Excess: $[overvaluation_excess]
    This is a separate legal basis for an excessive assessment claim independent 
    of comparable properties."
```

**Edge case — equalization_rate unavailable:** Skip this check entirely. Do not display the flag. Log a data warning.

---

## 17. Dynamic Claim-Type Recommendation

Evaluate after package assembly.

```
selected_equity_ratios = [comp.equity_ratio for comp in selected_package]
equity_ratio_variance = max(selected_equity_ratios) - min(selected_equity_ratios)

if equity_ratio_variance < 1.0:
    claim_recommendation = "EXCESSIVE"
    claim_reason = "Equity ratios are nearly uniform across selected comparables 
                   (variance: {equity_ratio_variance:.1f} points). The unequal 
                   assessment argument is structurally weak for this roll. 
                   File under excessive assessment (overvaluation)."

elif overvaluation_flag == true AND equity_ratio_variance < 2.0:
    claim_recommendation = "EXCESSIVE_PRIMARY"
    claim_reason = "Both excessive assessment and limited unequal assessment 
                   evidence are present. Excessive assessment is the stronger 
                   primary argument."

else:
    claim_recommendation = "UNEQUAL"
    claim_reason = "Comparable equity ratios show meaningful variation. 
                   Unequal assessment is the appropriate primary argument."
```

Display as:

> 📋 **Recommended Claim Type:** [label]  
> [reason]

---

## 18. Assessor Counter-Argument Risk Flags

Compute for each selected comp. Display as warning icon with tooltip on comp card.

```
flags = []

if comp.orpts_sale_arm_length == true AND comp.orpts_sale_price > comp.fmv * 1.05:
    flags.append("Recent arm's-length sale above FMV — assessor may argue 
                  this comp is correctly under-assessed, not a favorable comp")

if living_area_pct_diff > 0.20:
    sqft_gap = abs(subject.sqft - comp.sqft)
    flags.append("Large size difference ({sqft_gap} sq ft) — assessor will 
                  apply size adjustment that may reduce or eliminate the AV gap")

if abs(subject.full_baths - comp.full_baths) > 1.0:
    flags.append("Significant bath difference — bath adjustment will be applied 
                  at hearing (~$8,000 per full bath)")

if comp.neighborhood != subject.neighborhood:
    flags.append("Different neighborhood — assessor may challenge whether 
                  this property is truly comparable")

if confidence_score < 70:
    flags.append("Lower data confidence ({confidence_score}) — assessor may 
                  challenge reliability of underlying data")

if year_built_diff > 30:
    flags.append("Age gap of {year_built_diff} years — assessor may argue 
                  different market tier or construction quality")
```

If `len(flags) == 0`: no warning icon displayed.  
If `len(flags) >= 1`: display warning icon. On hover/click: show all flags as a bulleted list.

---

## 19. Market Median Sale $/Sqft Model

### 19.1 Computation

```
eligible_sales = ORPTS arm's-length sales where:
    - sale within 3 years of current date
    - sale parcel within 1.0 miles of subject
    - sale parcel living_area within ±20% of subject.living_area_sqft
    - sale parcel year_built within ±25 years of subject.year_built

neighborhood_median_ppsf = median(sale_price / living_area_sqft 
                                  for each sale in eligible_sales)

estimated_subject_fmv = neighborhood_median_ppsf * subject.living_area_sqft
```

**Minimum sample requirement:** If `count(eligible_sales) < 3`, expand radius to 1.5 miles and retry. If still < 3, display `"Insufficient recent sales for market estimate"` and skip this panel.

### 19.2 Display Panel

```
"📊 Market Value Estimate
 Neighborhood median: $[neighborhood_median_ppsf]/sq ft 
 (based on [count] recent arm's-length sales)
 Your home ([subject.sqft] sq ft): estimated market value $[estimated_subject_fmv]
 Your current assessed value: $[subject.av]
 Implied over/under-assessment: $[subject.av - estimated_subject_fmv] 
 ([pct formatted as %])"
```

### 19.3 Use in Adjustment Column

`neighborhood_price_per_sqft` in Section 14.2 = `neighborhood_median_ppsf` from this model.

---

## 20. Neighborhood Equity Distribution Panel

### 20.1 Computation

```
// Collect parcels in subject neighborhood with recent arm's-length sales
neighborhood_sales = ORPTS arm's-length sales where:
    - parcel.neighborhood == subject.neighborhood
    - sale within 3 years
    - parcel is residential (same broad class as subject)

ratios = [parcel.av / sale_price for each sale in neighborhood_sales]

if count(ratios) < 5:
    // expand to ZIP code
    ratios = same query with zip_code == subject.zip_code

median_ratio = median(ratios)
absolute_deviations = [abs(r - median_ratio) for r in ratios]
COD = median(absolute_deviations) / median_ratio * 100

subject_ratio = subject.av / subject.fmv
subject_percentile = percentile_rank(subject_ratio, ratios)
// percentile_rank = (count of ratios <= subject_ratio) / count(ratios) * 100
```

**Minimum sample:** If `count(ratios) < 5` after ZIP expansion, display `"Insufficient sales data for neighborhood equity analysis"` and skip panel.

### 20.2 Display Panel

| Metric | Value |
|---|---|
| Neighborhood median assessment ratio | `[median_ratio * 100]%` |
| Your assessment ratio | `[subject_ratio * 100]%` |
| Your percentile (higher = more over-assessed) | `[subject_percentile]th` |
| Coefficient of Dispersion (COD) | `[COD formatted to 1 decimal]` |
| IAAO standard (single-family residential) | `≤ 15.0` |

### 20.3 COD Warning

```
if COD > 15.0:
    display:
    "⚠️ Systemic Assessment Inconsistency Detected
    The COD for this neighborhood ({COD:.1f}) exceeds the IAAO professional 
    standard of 15.0 for single-family residential properties. This indicates 
    statistically inconsistent assessments across the neighborhood — a systemic 
    argument that is independent of any individual comparable property."
```

---

## 21. Subject Sale Logic

If `subject.orpts_sale_arm_length == true` AND `subject.orpts_sale_date` within 3 years:

```
ratio = subject.orpts_sale_price / subject.fmv

if ratio <= 0.90:
    subject_sale_signal = "SUPPORTS_GRIEVANCE"
    narrative: "Your recent sale price ($[sale_price]) is materially below 
               the current FMV estimate ($[fmv]), suggesting the FMV may be overstated."

elif ratio >= 1.05:
    subject_sale_signal = "WEAKENS_GRIEVANCE"
    narrative: "Your recent sale price ($[sale_price]) is at or above the current 
               FMV estimate. This may be used by the assessor to support the 
               current assessment."

else:
    subject_sale_signal = "NEUTRAL"
```

If the most recent transfer is non-arm's-length but an older arm's-length sale exists:
Display: `"$/sq ft data is from the most recent arm's-length sale on [date], 
not the most recent transfer on [date]."`

---

## 22. Shared Snapshot Mode

If the app is opened from a shared comparable snapshot URL:

- Requested comp IDs are preserved exactly as shared
- Quality and confidence gates (Section 11) are bypassed for preservation purposes
- Grievance support scoring is still computed
- Score penalties in Section 9.7 (weak confidence/quality penalties) are suppressed
- All display elements render normally

---

## 23. Broadened Search List

Provides additional context beyond the default visible package.

### 23.1 Tiers

| Tier | Criteria |
|---|---|
| 0 | Same neighborhood overflow OR same street |
| 1 | Same ZIP / nearby streets |
| 2 | Within 2 miles |
| 3 | Within 4 miles (or 2 miles in city_strict_geo_mode) |

### 23.2 Sort Order

1. `grievance_support` descending
2. `quality_score` descending
3. Tier number ascending (lower tier = better)
4. Distance ascending
5. `fmv_pct_diff` ascending

### 23.3 Limit

Maximum `8` homes in broadened search list.

---

## 24. Why a Comp May Be in the Visible List But Not the Package

Display this explanation in the UI when a visible comp is excluded from the package:

| Exclusion Reason | Display Label |
|---|---|
| `grievance_support <= 0` | `"Does not support grievance"` |
| `confidence_score < 60` | `"Insufficient data confidence"` |
| `quality_score < 50` | `"Insufficient physical similarity"` |
| Same-street cap hit | `"Same-street limit reached"` |
| Dominated by stronger nearby comp | `"Superseded by stronger comparable"` |
| Low assessed-value outlier | `"Assessed value is an outlier"` |
| Package target size reached | `"Package size limit reached"` |

---

## 25. Edge Case Reference Table

| Situation | Behavior |
|---|---|
| Subject FMV is null | Skip Method B (Section 15.4), skip overvaluation flag (Section 16), skip subject sale ratio check (Section 21), proceed with Method A only |
| Subject AV is null | Cannot produce suggested value. Flag for manual review. |
| Equalization rate unavailable | Skip overvaluation flag (Section 16), skip Method B (Section 15.4). Log data warning. |
| All comps fail quality gate | Trigger fallback (Section 10.2). If fallback also fails, display: "No qualifying comparables found. Manual review required." |
| Only 1 comp qualifies for suggested value (Section 15.1) | Trigger manual review flag. Do not compute a suggested value. |
| Exactly 2 comps qualify for suggested value | Use `min(weighted_average, simple_midpoint)` for Method A. |
| No ORPTS sales exist for any comp | Sale-evidence contributions (Section 9.4) all produce `0`. No impact on other scoring. |
| Subject ORPTS sale is non-arm's-length | Do not use sale for subject sale logic (Section 21). Show in history but mark as non-arm's-length. |
| All selected comp equity ratios within 1 point | Dynamic claim-type = EXCESSIVE (Section 17). Equity ratio contributions likely near 0; this is expected. |
| COD computation has < 5 sales after ZIP expansion | Skip neighborhood equity panel. Display: "Insufficient sales data for neighborhood equity analysis." |
| Market $/sqft model has < 3 sales after radius expansion | Use `subject.fmv / subject.sqft` as fallback for adjustment column. Display note: "Market $/sqft estimate based on subject FMV (limited recent sales data)." |
| Bracket comp rule finds no eligible bracketing candidate | Do not force bracket. Proceed with original package. Do not display a warning to user. |
| Suggested AV > current AV | This should not occur given gate requirements, but if it does: suppress suggested value and flag for manual review. |
| SCAR reduction > 25% | Display SCAR cap warning (Section 15.6). Do not suppress suggested value. |
| Comp has both arm's-length sale and non-arm's-length sale | Use only the most recent arm's-length sale for Section 9.4 and narrative. |

---

## 26. Complete Scoring Reference (Quick Reference)

### Quality Score Components

| Component | Max Points | Section |
|---|---|---|
| Class compatibility | 18 | 3 |
| Location similarity | 22 | 4 |
| Living area | 18 | 5.1 |
| Year built | 10 | 5.2 |
| Bedrooms | 8 | 5.3 |
| Baths | 8 | 5.4 |
| Style family | 10 | 5.5 |
| FMV alignment | 4 | 5.6 |
| Penalties | Variable (subtractive) | 6 |
| Neighborhood mismatch penalty | -8 | 6 |
| **Theoretical max (before penalties)** | **98** | |

### Grievance Support Score Components

| Component | Max Points | Section |
|---|---|---|
| Raw AV contribution (base) | +25 | 9.1 |
| Raw AV size-direction modifier | ×1.35 or ×0.60 | 9.1 |
| AV per sqft contribution | +20 | 9.2 |
| Equity ratio contribution | +18 | 9.3 |
| Sale-evidence bonus | +6 | 9.4 |
| Sale confirmation bonus | +3 | 9.4 |
| Normalization penalty | -8 | 9.5 |
| Small raw-advantage penalty | -3 | 9.6 |
| Confidence penalty | -8 | 9.7 |
| Quality penalty | -10 | 9.7 |
| Sale-evidence negative | -5 | 9.4 |
| **Clamp** | **[-100, 100]** | |

### Package Gates

| Gate | Threshold |
|---|---|
| Quality | ≥ 50 |
| Confidence | ≥ 60 |
| Support | > 0 |

### Suggested Value Gates (stricter)

| Gate | Threshold |
|---|---|
| Quality | ≥ 60 |
| Confidence | ≥ 70 |
| Support | ≥ 12 |
| Marginal flag | must be false |

---

*End of specification. All thresholds, weights, labels, sort orders, edge cases, and output strings are defined above. Implement exactly as written. Flag to developer any condition not covered by this document rather than guessing.*
