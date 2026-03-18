# How Comparable Homes Are Chosen

This is the short, plain-language summary of the grievance engine.

The authoritative implementation reference is [GRIEVANCE_APP_COMPLETE_SPEC.md](/C:/Users/steph/OneDrive/Documents/claude/albany_real_estate/GRIEVANCE_APP_COMPLETE_SPEC.md). If this summary and the full spec ever differ, the full spec controls.

## 1. What the app is doing

The app now works in three layers, not one:

1. A visible list of up to 12 homes that look like the best physical matches to your property.
2. A narrower default grievance package that keeps only the visible comps that still support a grievance after the fairness checks are applied.
3. A separate sale-backed evidence pool built from verified sales, used to decide whether the app may recommend a claim type or a requested assessed value.

That means a home can still appear in the visible list or even in the grievance package without automatically being strong enough to support an automatic filing recommendation.

## 2. What data the app compares

For your home, nearby comps, and verified sales, the app uses the roll and ORPTS data it has available, including:

- Property class
- Neighborhood, neighborhood association, ZIP, and distance
- Living area
- Year built
- Bedrooms and baths
- Style
- Assessed value
- Full market value (FMV)
- Equity ratio
- Assessed value per square foot
- Recent ORPTS sale history and ORPTS sale-usable flags

If residential inventory fields are available only through the inventory join, the app still uses them. Missing inventory fields lower confidence instead of silently pretending they do not exist.

## 3. Visible comps are chosen for physical similarity first

The visible list is still a physical-match engine.

The app first removes clearly bad candidates, such as:

- The subject parcel itself
- Incompatible residential classes
- Parcels with missing core value data
- Parcels that are too far away for the main comp engine
- Homes that are much too different in living area, year built, beds, or baths

The remaining candidates are scored on:

- Class compatibility
- Location similarity
- Living area similarity
- Year built similarity
- Bedroom and bath similarity
- Style-family similarity
- FMV alignment

The app then subtracts penalties for weak or missing data. This visible list answers:

"Which homes look most like mine?"

## 4. The default grievance package is narrower than the visible list

The app does not automatically file every visible comp into the grievance package.

To become a default grievance comp, a home still has to clear the package gates:

- Quality score at least 50
- Data confidence score at least 60
- Grievance support score above 0

The package is then sorted and trimmed so it stays focused on the best local evidence. The package builder still tries to:

- Prefer strong and moderate support
- Limit same-street overconcentration
- Exclude low-end assessed outliers
- Avoid weaker duplicates when a better nearby comp makes the same point
- Preserve useful bracketing when possible

This layer answers:

"Which of the similar homes are worth carrying into the grievance packet?"

## 5. Lower assessed value alone is still not enough

A comp with a lower assessed value is not automatically good grievance evidence.

The app still checks whether that lower assessment is backed up by normalized comparisons, especially:

- Assessed value per square foot
- Equity ratio
- Recent sale evidence when available

That matters because a lower assessed value may simply reflect a smaller, older, or lower-value home, not more favorable assessor treatment.

## 6. Automatic claim guidance now depends on sale-backed evidence

This is the biggest behavior change.

The app now separates:

- the comp package used for research and packet support, and
- the sale-backed evidence required before the app may recommend a claim type or a filing value

The sale-backed evidence status can be:

- `Sale-backed evidence is sufficient`
- `Sale-backed evidence is insufficient`
- `Additional homeowner evidence is needed`

If the sale-backed evidence is insufficient, the app does **not** automatically recommend:

- `Unequal assessment`
- `Excessive assessment`
- a requested assessed value

Instead, it tells the homeowner to review RP-524 manually.

When the leading theory is `Excessive assessment`, the packet may also show up to 3 separate `Supplemental market-evidence` properties. These are not replacements for the main grievance comps. They are a separate sale-backed support layer for the market-value argument.

## 7. The sale-backed market model is tied to the valuation date

The market-value model no longer uses a loose "recent sales" concept based on today.

It now anchors itself to the roll valuation date and looks for verified sales in this order:

1. Within 24 months of valuation date
2. If still thin, within 36 months
3. If still thin, within 60 months

The geography also widens in steps:

1. Tier 1: same neighborhood
2. Tier 2: same neighborhood association, or same ZIP within 1 mile if association data is missing
3. Tier 3: citywide within 2 miles
4. Tier 4: research-only within 4 miles

Every widening step is recorded in the output so the packet can explain what happened.

## 8. Older verified sales may be time-adjusted

If the app has enough usable local sales, it builds a simple local price-trend model using sale price per square foot over time for the same residential family.

That trend model is used only when older sales are needed. If the app cannot build a local trend model, it does not fake one.

So:

- older sales may be adjusted forward to the valuation date
- but only when the local data support that adjustment

## 9. The requested assessed value is now sale-backed

The app no longer uses the old "Method A / Method B / choose the lower one" requested-value logic.

If sale-backed evidence is sufficient, the app:

1. Estimates subject market value from the sale-backed model.
2. Converts that market value to a requested assessed value using the municipality's uniform percent of value (LOA / equalization ratio loaded from the roll metadata).

If sale-backed evidence is not sufficient, the app suppresses the requested assessed value and tells the user to review manually.

## 10. The ratio panel is now a verified sale-ratio study

The old neighborhood equity percentile panel has been replaced for grievance purposes.

The app now runs a verified sale-ratio study built from:

- assessment / verified sale price
- ORPTS sale usability flags
- trimmed samples that drop the top and bottom 5% when the sample is large enough

The ratio study reports:

- Median ratio
- COD
- PRD when the trimmed sample is at least 20
- PRB when the trimmed sample is at least 20
- A reliability label

If the sample is too small, the app may still show COD with a low-reliability warning, but it suppresses PRD and PRB until the sample is large enough to support them.

The packet treats this ratio study carefully:

- If the subject has its own recent arm's-length sale inside the accepted window, the packet may compare the subject's verified sale ratio to the neighborhood verified-sale median.
- If the subject does not have that like-to-like verified sale ratio, the ratio study is shown as neighborhood context only.

That means the packet should not compare the subject's roll equity percentage to the neighborhood verified-sale median as though they are the same statistic.

## 11. Included and excluded sales are explained

The grievance packet now distinguishes between:

- included market-evidence sales
- excluded market-evidence sales
- included ratio-study sales
- excluded ratio-study sales

Excluded sales are not hidden. The app records why they were not used, such as:

- not marked arm's-length
- unusable for COD/RAR work
- condition flags that suggest a non-standard transfer
- too old for the selected valuation window
- outside the needed geography tier
- poor physical fit for the tighter evidence pool

In the printable packet, the app shows the included sales in full, then summarizes exclusions by reason and lists only the most relevant excluded sales instead of dumping every screened-out record.

## 12. The packet explains the method, not just the result

The final grievance packet is meant to be understandable to an assessor and the homeowner.

It now explains:

- what data were used
- what was filtered out
- whether older sales were time-adjusted
- whether the geography had to broaden
- how the requested assessed value was derived when one is shown
- what limitations remain in the evidence

The comparable map also shows the distance from the subject parcel to each included comp.

The packet map keeps the north arrow and includes a short distance reference so the exhibit reads as a filing map rather than an abstract diagram.

## 13. What did not change

Some important parts of the comp engine are still the same:

- the visible list is still primarily a physical-similarity list
- lower assessed value alone is still not enough
- the default grievance package is still narrower than the visible list
- broadened search is still available for research

What changed is that the app is now much stricter about when it is willing to turn those comps and sales into an automatic claim recommendation or requested value.

Neighborhood benchmark numbers may still appear, but only as secondary context. They are not supposed to outrank stronger direct sale-backed evidence.

## 14. Admin explainability

The app now also exposes an internal explainability view for the visible comparable list.

That admin-facing view shows, for each visible comp:

- why it made the visible list
- whether it passed the default package gates
- why it was included or excluded by the default package rules
- whether the current live package reflects a manual override

This explainability layer is meant to help a reviewer explain the engine's decisions to users without changing the filing packet into a developer dump.

## 14. If you want to change the logic

Do not edit this summary file as if it were the engine.

Edit [GRIEVANCE_APP_COMPLETE_SPEC.md](/C:/Users/steph/OneDrive/Documents/claude/albany_real_estate/GRIEVANCE_APP_COMPLETE_SPEC.md) if you want to redefine the behavior in a way that can be implemented exactly.
