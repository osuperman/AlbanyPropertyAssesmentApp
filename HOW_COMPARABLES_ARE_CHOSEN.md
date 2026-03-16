# How Comparable Homes Are Chosen

This is the short, user-facing summary of the grievance engine.

The authoritative implementation reference is [GRIEVANCE_APP_COMPLETE_SPEC.md](/C:/Users/steph/OneDrive/Documents/claude/albany_real_estate/GRIEVANCE_APP_COMPLETE_SPEC.md). If this summary and the full spec ever differ, the full spec controls.

## 1. What the app is doing

The app builds comparables in two layers:

1. A visible list of up to 12 homes that are the best physical matches to your property.
2. A narrower default grievance package that keeps only the comps that still support a grievance after the fairness checks are applied.

The visible list answers:

"Which homes look most similar to mine?"

The grievance package answers:

"Which of those homes are actually useful evidence for a tax grievance?"

## 2. What data the app compares

For your home and each candidate comp, the app uses the roll data it has available, including:

- Property class
- Neighborhood, ZIP, and distance
- Living area
- Year built
- Bedrooms and baths
- Style
- Assessed value
- Full market value (FMV)
- Equity ratio
- Assessed value per square foot
- Recent ORPTS arm's-length sale history when available

## 3. Hard reject rules

A comp is rejected before scoring if it is clearly too different or unusable, including cases like:

- Same parcel as the subject
- Incompatible residential class
- Missing both assessed value and FMV
- Too far away
- Living area more than 45% different
- Year built more than 60 years different
- Bedrooms more than 2 different
- Baths more than 2.5 different

Albany runs in strict geography mode by default, so distance is capped at 2.0 miles for the main comparable engine.

## 4. Physical match score

Each surviving comp gets a quality score based on:

- Residential class compatibility
- Location similarity
- Living area similarity
- Year built similarity
- Bedroom similarity
- Bath similarity
- Style-family similarity
- FMV alignment

The app then subtracts penalties for missing or weak data, such as missing living area, missing year built, uncertain style normalization, or being outside the subject neighborhood and more than 1 mile away.

This quality score controls whether a home belongs in the visible list and whether it is strong enough to be considered for the default package.

## 5. Data confidence score

Separately, each comp gets a data confidence score starting at 100.

The score is reduced when important fields are missing or uncertain, such as:

- Living area
- Assessed value
- FMV
- Year built
- Bedrooms
- Baths
- Style normalization
- Distance

This is why a home can look similar but still be weaker evidence if the underlying data are incomplete.

## 6. Why lower assessed value alone is not enough

A lower assessed value is only the starting point.

The app also checks:

- Assessed value per square foot
- Equity ratio
- Recent sale evidence

These checks matter because a comp may be lower simply because it is a smaller or lower-value home overall, not because it was treated more favorably by the assessor.

### Example: lower assessed value, but still not strong evidence

Just because a comp has a lower assessed value than your home doesn't mean the assessor was more generous with it. What matters is how the assessed value compares to the home's full market value - that ratio (called the equity ratio) tells you whether the assessor treated that property more favorably than yours, or about the same.

If a comp has a similar equity ratio and a similar assessed value per square foot as your home, the assessor was essentially treating both properties the same way. The comp's assessed value might be lower simply because it's a smaller or lower-value home overall - not because it got a better deal from the assessor.

For a comp to be strong grievance evidence, you want to see that it was assessed at a lower proportion of its market value than your home - meaning the assessor undervalued it relative to what it's actually worth, compared to how they valued yours.

## 7. Grievance support score

Each visible comp gets a separate grievance support score.

That score combines:

- Raw assessed value advantage
- Assessed value per square foot advantage
- Equity ratio advantage
- Recent arm's-length sale evidence
- Penalties when normalized metrics are tied
- Penalties for weak quality or weak confidence

Support labels are:

- Strong support
- Moderate support
- Weak support
- Neutral
- Weakens case

## 8. Visible list versus default grievance package

The app does not automatically include every visible comp in the grievance package.

To make the default package, a comp must pass all three gates:

- Quality score at least 50
- Data confidence score at least 60
- Grievance support score above 0

The package is then sorted with the best grievance evidence first and assembled using these rules:

- Usually keep 3 to 5 homes
- Prefer strong and moderate support first
- Limit same-street concentration
- Exclude low-end assessed outliers
- Suppress weaker duplicates when a stronger nearby comp already makes the same point
- Keep corroborating strong comps together when they independently strengthen the case
- Try to preserve bracketing on living area and year built when possible

If visible comps exist but none clear those gates, the app now shows a `Research only` outcome instead of acting like the system failed.

That means:

- physically similar homes were found
- they remain visible for research and manual review
- they are not treated as default grievance evidence

The app also explains why no package was built:

- No physical matches
- Neutral after normalization
- Favorable direction, but quality or confidence was too weak
- Mixed research-only result

## 9. Suggested requested assessed value

The app uses stricter rules for the suggested filing value than it uses for package inclusion.

A comp must clear stronger thresholds before it can influence the suggested value.

The engine then calculates:

- Comp-based value estimate: asks, "If we look at the best qualifying comparable homes, what assessed value do they suggest you should ask for?" The app calculates this from the assessed values of the strongest qualifying comps, using a weighted median or a two-comp fallback.
- Equity-ratio value estimate: asks, "If your home were assessed at about the same percentage of market value as the comps, what assessed value would that imply for you?" The app calculates this by multiplying your FMV by the median qualifying comp equity ratio.

The final suggested requested assessed value is the lower of those two methods.

If the data are too thin, too spread out, or too tied on equity ratio, the app does not force a number and instead flags the result for manual review.

## 10. Independent models outside the comp package

The app also runs additional models that do not depend only on the selected comps:

- Separate overassessment check: asks, "Even aside from the comps, does your assessment look too high compared with your FMV and the municipality's equalization rate?" The app compares your assessed value to FMV times the municipal equalization rate.
- Market value estimate from recent neighborhood arm's-length sales
- Neighborhood equity distribution panel, including percentile, COD (Coefficient of Dispersion), and the IAAO residential COD benchmark of 15.0 or below
- Subject sale logic for the subject's own recent arm's-length sale

These models can support or weaken the overall grievance even when the selected comp package is mixed.

They also matter when nearby homes are very uniform.

If visible comps have tightly clustered equity ratios, the app treats that as weaker unequal-assessment evidence and may shift the explanation toward excessive assessment instead, using:

- Equalization-based overvaluation
- Recent arm's-length sale evidence
- Neighborhood equity percentile

## 11. ORPTS sales data and arm's-length sales

The app uses ORPTS sales data as market evidence, not as a blind ranking shortcut.

Arm's-length sales are used to:

- Add or reduce support for individual comps
- Estimate neighborhood sale price per square foot
- Build the market value estimate panel
- Build the neighborhood equity distribution panel
- Evaluate the subject's own recent sale against the current FMV

Non-arm's-length transfers are shown in sale history for context, but they are not treated as normal market-value evidence.

## 12. Broadened search

Broadened search is a research-only expansion beyond the main visible list.

It can show additional comps from:

- Same-neighborhood overflow or same street
- Same ZIP and nearby streets
- Within 2 miles
- Within the outer city-strict radius

These broadened comps are ordered by:

- Best grievance support first
- Then quality score
- Then tier
- Then distance
- Then FMV closeness

They are shown separately so the default package stays focused on the strongest local evidence.

## 13. If you want to change the logic

Do not edit this summary file as if it were the engine.

Edit [GRIEVANCE_APP_COMPLETE_SPEC.md](/C:/Users/steph/OneDrive/Documents/claude/albany_real_estate/GRIEVANCE_APP_COMPLETE_SPEC.md) if you want to redefine the logic in a way that can be implemented exactly.

That full spec is written to be detailed enough to reproduce:

- Inputs
- Hard exclusions
- Score weights
- Gates
- Sorting
- Package assembly rules
- Value recommendation rules
- Market-sale logic
- Neighborhood equity logic
- Edge-case handling
