# Comparable Property Selection Logic

This project has two related outputs:

- a visible research list of "Best Comparable Homes"
- a smaller grievance package used for RP-524 filing summaries

The visible list is built first. The grievance package is then derived from that list.

The main code lives in `albany-full-dashboard.jsx`:

- `buildComparableProfile` around lines 1660-1685
- `classifyGrievanceComparable` around lines 1744-1783
- `buildComparableCandidate` around lines 2473-2569
- `buildComparableResult` around lines 2571-2701
- `buildBroadenedComparableResult` around lines 2721-2754

## Data used to compare properties

The comparison logic builds a subject profile from:

- property class
- neighborhood
- ZIP code
- normalized street name
- full market value
- residential inventory details when present:
  - living area
  - year built
  - bedrooms
  - baths
  - building style

Those residential inventory fields come from `parcel.inventory`, which is joined into the parcel data in `prepare-albany-data.js`. The join carries fields such as `sqftLivingArea`, `yearBuilt`, `bedrooms`, `halfBaths`, `fullBaths`, and `buildingStyle`.

Important details:

- `yearBuilt` prefers the residential inventory value and falls back to the parcel's base `yearBuilt`.
- Bath count is converted to `fullBaths + halfBaths * 0.5`.
- Street matching normalizes directionals and suffixes, removes noise like unit labels, and strips the house number before comparing street names.

## Normal matching mode

Normal comparable selection is handled by `buildComparableCandidate(subject, comp)`.

### Eligibility

A candidate is immediately rejected if any of these are true:

- the subject and candidate are the same parcel
- the subject is not a residential class (`2xx`)
- the candidate does not have the exact same `propClass` as the subject

That means the primary comparable algorithm is strict about class matching. A `210` property will not be compared against a `220` property in normal scoring mode.

### Hard mismatch filters

If both properties have the relevant data, the candidate is rejected when:

- living area differs by more than 60% of the subject's living area
- year built differs by more than 80 years
- bedroom count differs by more than 2
- bath count differs by more than 2

If a field is missing on either side, that field is skipped rather than causing rejection.

## Score model

Each surviving candidate starts with a base score of `18`, then gains points from location and physical similarity.

| Signal | Rule | Score impact |
| --- | --- | --- |
| Base score | Every eligible candidate starts here | `+18` |
| Neighborhood | Same neighborhood | `+28` |
| ZIP | Different neighborhood but same ZIP | `+10` |
| Street | Same normalized street name | `+8` |
| Living area | `+ max(0, 28 - 40 * pct_delta)` where `pct_delta = abs(subject - comp) / subject` | up to `+28` |
| Year built | Same year / within 10 / within 25 / within 40 / within 80 | `+16 / +10 / +5 / +1` |
| Bedrooms | Difference of 0 / 1 / 2 | `+12 / +6 / +2` |
| Baths | Difference of 0 / <= 0.5 / <= 1 / <= 2 | `+10 / +8 / +4 / +1` |
| Style | Exact building style match | `+8` |
| Full market value | Within 35% of the subject FMV | `+6` |
| Missing usable physical evidence | Subject has inventory data, but no physical fields matched at all | `-12` |

Notes:

- Neighborhood and square footage are the heaviest signals.
- ZIP is only added when the neighborhood did not match.
- Living-area and FMV percentages are measured relative to the subject property, not the larger of the two values.
- Style only helps if both properties have the same normalized style string.

The code also records:

- `_compReasons`: human-readable reasons shown in the UI
- `_compPhysicalFieldsUsed`: which physical fields actually matched
- `_compPhysicalFieldCountPossible`: how many physical fields were available on the subject

Those fields are later reused by the grievance-strength and appeal-readiness summaries.

## Selecting the default comparable list

`buildComparableResult` creates the main research list like this:

1. Build a scored candidate for every parcel.
2. Drop all `null` candidates.
3. Sort by `_compScore` descending.
4. Break score ties by choosing the parcel whose `fullMarketValue` is closer to the subject.
5. Keep only the top `8` parcels.

This top-8 set is the real "best comparable" selection.

After that selection is made, the UI reorders the already-chosen set so grievance-supporting comps appear first:

- `supports`
- `neutral`
- `does_not_support`

Within each of those buckets, the original score order is preserved.

So the selection itself is score-driven, but the on-screen order is grievance-driven.

## Fallback mode

If the app is not loading an explicit shared snapshot and the normal scored search finds nothing, it falls back to a lighter rule set.

Fallback behavior:

- exclude the subject parcel
- require the exact same `propClass`
- keep parcels on the same neighborhood or same street
- take the first `8` matches in the existing parcel order
- do not assign a meaningful score

This is why the UI describes fallback results as a lighter nearby list instead of a full physical similarity ranking.

Fallback can happen when:

- the subject is not residential, so the main `2xx` algorithm never runs
- the subject is residential but all candidates fail the hard mismatch filters
- the dataset is too thin to produce any scored matches

## Grievance relevance

Every visible comparable is classified for grievance purposes by `classifyGrievanceComparable`.

Rules:

- `supports`: candidate `assessedValue` is lower than the subject's
- `does_not_support`: candidate `assessedValue` is higher than the subject's
- `neutral`: assessed values are equal or one side is missing

This classification does not change whether a property is a comparable. It changes how the comparable is labeled and whether it is included in the default grievance package.

## Default grievance package

The grievance package is narrower than the visible comparable list.

Default grievance behavior:

- start from the selected visible comparable list
- keep only comparables whose grievance relevance is `supports`
- take the first `4`

In code this is:

- `grievanceSupportPool = neighbors.filter(... supports ...)`
- `grievanceCandidates = grievanceSupportPool.slice(0, 4)`

That means a parcel can be a valid comparable for research but still stay out of the default grievance packet if it is assessed the same as or higher than the subject.

## Broadened search

Broadened search is opt-in and does not replace the default local comparable list.

When the user clicks the broadened-search button, the app:

- excludes parcels already in the default comparable list
- reuses the same normal candidate builder, so the same class and physical mismatch rules still apply
- allows only parcels that are:
  - in the same neighborhood, or
  - on the same street, or
  - in the same ZIP, or
  - within 4 miles based on parcel coordinates

Broadened candidates are assigned a tier:

| Tier | Meaning |
| --- | --- |
| `0` | Same neighborhood overflow or same street |
| `1` | Same ZIP / nearby streets |
| `2` | Within 2 miles |
| `3` | Within 4 miles |

Each click expands the maximum allowed tier:

- initial state: local-only default list
- first click: include tiers `0-1`
- second click: include tiers `0-2`
- third click: include tiers `0-3`

Broadened results are sorted by:

1. grievance relevance (`supports` first)
2. lower broadened tier
3. higher comparable score
4. shorter distance
5. closer full market value

The broadened list is also capped at `8` parcels.

## Shared snapshot mode

The app also supports share links that name an exact subject parcel and exact comparable parcel IDs.

When a snapshot is loaded:

- the app resolves those exact parcel IDs
- normal scoring and rejection rules are bypassed
- the snapshot comps are marked with score `0`
- the UI still calculates deltas and grievance labels for them

This is intentionally different from normal comparable discovery. Snapshot mode reproduces a previously shared list rather than recomputing the "best" list from scratch.

One important consequence: snapshot mode does not enforce same-class or residential-only matching before loading the requested comps.

## Practical summary

In the current codebase, a "good comparable" is mostly defined as:

- exact same property class
- same neighborhood if possible
- same street if available
- similar square footage
- not too far apart in year built, beds, or baths
- optionally same style and roughly similar FMV

Then, for grievance use, the app applies a second filter:

- only lower-assessed comparables are included in the default filing package

That distinction explains why:

- the visible comparable list can contain comps that do not support an appeal
- the grievance package is usually smaller than the research list
- broadened-search comps are available for context but do not automatically replace the default local set
