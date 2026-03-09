# Albany Property Tax Explorer Data Model

## Decision

Proceed with an Albany-focused civic product.

The local files already in this repository are strong enough to support the core public use cases:

- property lookup
- tax fairness and assessment comparisons inside Albany
- exemption discovery
- absentee ownership analysis
- parcel mapping
- neighborhood summaries

Do not build features that depend on unverified or unavailable data. In particular, permit/code-case enrichment, sale-based valuation models, and statewide parcel geometry should remain conditional until access, terms, and preparation are confirmed.

## Verified local datasets

These files exist in the repo and are enough for a meaningful first release:

| File | Role | Current value |
| --- | --- | --- |
| `albany-roll.json` | Parsed Albany assessment roll | Primary parcel fact table for the app |
| `Albany 2025 Final Roll conv.txt` | Original 2025 final assessment roll text export | Provenance and re-parse source |
| `albany-parcel-geometry.json` | Parcel geometry keyed by parcel id | Primary map geometry |
| `Albany_County_Parcels_2024_-1728787929616575091.csv` | County parcel reference table | SWIS, print key, PIN/SBL, land use context |
| `albany_street_centerlines.geojson` | Streets layer | Map orientation only |
| `address points.geojson` | Address points | Fallback geospatial/address joining |
| `city_albany_geo_json.geojson` | City geography | Neighborhood and area overlays if needed |
| `NYS-Tax-Parcels.zip` | Statewide parcel-related source file | Reference only until schema and license are validated |

## Official source posture

These sources support the data strategy and should be treated as authoritative references:

- Albany County Real Property Tax Service Agency assessment rolls:
  [https://www.albanycountyny.gov/departments/management-and-budget/real-property-tax-service-agency/assessment-rolls](https://www.albanycountyny.gov/departments/management-and-budget/real-property-tax-service-agency/assessment-rolls)
- City of Albany assessment office:
  [https://www.albanyny.gov/207/Assessment](https://www.albanyny.gov/207/Assessment)
- City of Albany prior rolls:
  [https://www.albanyny.gov/209/Prior-Assessment-Rolls](https://www.albanyny.gov/209/Prior-Assessment-Rolls)
- NYS statewide local assessment roll dataset:
  [https://data.ny.gov/Government-Finance/Property-Assessment-Data-from-Local-Assessment-Rol/7vem-aaz7](https://data.ny.gov/Government-Finance/Property-Assessment-Data-from-Local-Assessment-Rol/7vem-aaz7)
- NYS GIS parcel program:
  [https://gis.ny.gov/parcels](https://gis.ny.gov/parcels)
- Albany County digital tax maps:
  [https://www.albanycountyny.gov/departments/management-and-budget/digital-tax-maps/digital-tax-maps-by-municipality](https://www.albanycountyny.gov/departments/management-and-budget/digital-tax-maps/digital-tax-maps-by-municipality)

Licensing and access caution:

- Assessment roll data is usable now.
- Local geometry already in the repo is usable now.
- Statewide roll data is feasible for context and cross-checks.
- Statewide parcel geometry should be treated as conditional until redistribution terms and preparation workflow are confirmed from the NYS GIS program.
- CSS Portal / MapGeo / permit enrichment is future work until technical access and terms are explicitly validated.

## Canonical parcel key

Use a stable record key for every parcel-year-roll row:

`record_key = assessment_year + ":" + roll_type + ":" + swis_code + ":" + parcel_id_norm`

Examples:

- `2025:final:010100:76.22-3-40`
- `2024:tentative:010100:75.36-2-79`

This avoids collisions across years, roll states, and municipalities.

## Normalization rules

### Parcel id normalization

Create `parcel_id_norm` from any parcel id variant by:

1. trimming whitespace
2. collapsing repeated spaces
3. converting unicode dash variants to `-`
4. removing surrounding labels like `SBL`, `PIN`, `PrintKey`
5. preserving the dot-dash structure used by Albany rolls

Keep raw values too:

- `parcel_id_raw`
- `print_key_raw`
- `pin_sbl_raw`

### SWIS normalization

Always store `swis_code` as a 6-character string, left-padded with zero if needed.

### Address normalization

Create:

- `address_line1_raw`
- `address_line1_norm`
- `city_norm`
- `state_norm`
- `zip5`
- `address_join_key`

Recommended join key:

`address_join_key = normalized street number + normalized street name + "|" + zip5`

This is a fallback only. Parcel joins should prefer SWIS plus parcel id.

### Owner normalization

Store raw owner strings and derived flags:

- `owner_name_primary`
- `owner_name_secondary`
- `owner_name_norm`
- `mailing_address_raw`
- `mailing_address_clean`
- `mailing_city`
- `mailing_state`
- `mailing_zip5`
- `is_absentee_owner`
- `is_owner_occupied_guess`

`is_absentee_owner` should be derived from a normalized comparison between parcel address and mailing address, not from raw string inequality alone.

## Canonical schema for `albany-roll.json`

The current `albany-roll.json` is already useful, but it needs a slightly richer structure to support reliable joins and multi-year history.

### Top-level shape

```json
{
  "version": 3,
  "dataset": "albany_assessment_roll",
  "municipality": "City of Albany",
  "county": "Albany",
  "state": "NY",
  "assessmentYear": 2025,
  "rollType": "final",
  "swisCode": "010100",
  "valuationDate": "2024-07-01",
  "taxableStatusDate": "2025-03-01",
  "uniformPercentOfValue": 96,
  "sourceFiles": [
    "Albany 2025 Final Roll conv.txt",
    "albany-roll.json"
  ],
  "parsedAt": "2026-02-22T19:32:33.069Z",
  "parcels": []
}
```

### Parcel row shape

```json
{
  "recordKey": "2025:final:010100:76.22-3-40",
  "assessmentYear": 2025,
  "rollType": "final",
  "swisCode": "010100",
  "parcelId": "76.22-3-40",
  "parcelIdNorm": "76.22-3-40",
  "printKey": "76.22-3-40",
  "pinSbl": null,
  "address": {
    "line1": "Rear 335.5 Myrtle Ave",
    "line1Norm": "rear 3355 myrtle ave",
    "city": "Albany",
    "state": "NY",
    "zip5": "12207",
    "joinKey": "rear 3355 myrtle ave|12207"
  },
  "owner": {
    "primary": "Lindell, LLC",
    "secondary": null,
    "mailingAddressRaw": "903 Lindell, LLC ...",
    "mailingAddressClean": "83 Middlesex Dr, Guilderland, NY 12159",
    "mailingCity": "Guilderland",
    "mailingState": "NY",
    "mailingZip5": "12159",
    "isAbsenteeOwner": true
  },
  "propertyClass": {
    "code": "311",
    "description": "Residential vacant land"
  },
  "parcelType": "homestead",
  "values": {
    "land": 3000,
    "assessed": 3000,
    "fullMarket": 3125
  },
  "taxable": {
    "county": 3000,
    "city": 3000,
    "school": 3000
  },
  "dimensions": {
    "frontage": 58.5,
    "depth": 30.5,
    "acres": null
  },
  "location": {
    "rollGridEast": 650850,
    "rollGridNorth": 966990,
    "neighborhood": "Albany",
    "schoolDistrict": "Albany"
  },
  "transaction": {
    "deedYear": 2021,
    "deedRef": "2021-38413"
  },
  "exemptions": [],
  "joins": {
    "geometryParcelId": "76.22-3-40",
    "countyCsvPrintKey": null,
    "countyCsvPinSbl": null,
    "addressJoinKey": "rear 3355 myrtle ave|12207"
  },
  "quality": {
    "hasGeometry": true,
    "hasCleanMailingAddress": true,
    "hasValidFullMarketValue": true,
    "joinConfidence": "high",
    "warnings": []
  },
  "source": {
    "primaryFile": "Albany 2025 Final Roll conv.txt",
    "parserVersion": 3
  }
}
```

## Join strategy

### Join 1: Albany roll to Albany parcel geometry

Use now.

- Left side: `albany-roll.json`
- Right side: `albany-parcel-geometry.json`
- Join key: `parcel_id_norm`
- Fallback: none if geometry file is already keyed by parcel id

Expected result:

- map polygons
- centroids
- viewport bounds

### Join 2: Albany roll to Albany County parcel CSV

Use now.

- Left side: `albany-roll.json`
- Right side: `Albany_County_Parcels_2024_-1728787929616575091.csv`
- Primary join: `swis_code + parcel_id_norm` matched against normalized `PrintKey`
- Secondary join: normalized roll parcel id against `PIN_SBL` only when a known crosswalk exists
- Fallback: `address_join_key` for diagnostics only, not for authoritative overwrite

Expected enrichment:

- canonical print key
- county PIN/SBL
- acreage
- school code
- municipality name
- some land/water/sewer context

### Join 3: Albany roll to statewide NYS assessment roll

Use for cross-checking and future regional context.

- Left side: `albany-roll.json`
- Right side: NYS assessment roll dataset
- Join key: `assessment_year + swis_code + parcel_id_norm`

Expected use:

- confirm fields
- standardize statewide property class coding
- add outside-Albany context later if needed

Do not depend on this join for the Albany resident experience. Albany is already supported without it.

### Join 4: Parcel to address points

Use only as fallback.

- Left side: parcel rows without strong geometry or clean spatial point
- Right side: `address points.geojson`
- Join key: `address_join_key`

Expected use:

- point labels
- QA on parcel address cleanliness
- optional geocoding fallback

### Join 5: Parcel to streets / geography overlays

Use now for map context.

- streets: `albany_street_centerlines.geojson`
- city / tract / block group overlays: local geojson and census files
- method: spatial join from parcel centroid or polygon

Expected use:

- neighborhood summaries
- tract or block-group aggregations
- map overlays

## Feature-to-dataset contract

Every feature in the app should have an explicit data contract.

| Feature | Datasets | Join | Status |
| --- | --- | --- | --- |
| Check my property | `albany-roll.json` | none | Build now |
| Tax fairness inside Albany | `albany-roll.json`, `albany-parcel-geometry.json` | parcel id | Build now |
| Compare to nearby properties | roll + geometry | parcel id plus spatial proximity | Build now |
| Exemption finder | `albany-roll.json` | none | Build now |
| Absentee owner lookup | roll, optional county CSV | parcel id / print key | Build now |
| Neighborhood map | roll + geometry + streets | parcel id plus spatial overlay | Build now |
| Neighborhood absentee / exemption summaries | roll + geometry + geography overlays | spatial join | Build now |
| Data quality panel | all local datasets | audit rules below | Build now |
| Permit / code / ROP history | CSS Portal / MapGeo / city systems | parcel id or address | Future, only if terms and technical access are validated |
| Sale-based comps / grievance evidence from actual transfers | assessment roll plus sale dataset | parcel id and deed history | Future until a clean sale dataset is integrated |
| Statewide parcel map outside Albany | NYS parcel geometry | state parcel identifiers | Future, conditional on licensing and prep |
| Fraud scoring | multiple civic datasets with ground truth | mixed | Future, only after enough reliable labels exist |

## Metrics we can compute now

These metrics are supportable with current local data:

- `assessment_ratio = assessed_value / full_market_value`
- `land_share = land_value / assessed_value`
- `exemption_count`
- `total_exemption_amount` by taxing jurisdiction
- `absentee_owner_rate` by neighborhood / tract / ZIP
- `vacant_land_share` by area
- `property_class_medians` by neighborhood and class
- `assessment_outlier_score` within a peer set defined by class, neighborhood, size band, and lot size

Important limitation:

- This is not the same as a sale ratio study.
- Do not claim "market underassessment" from roll data alone.
- Resident-facing copy should say "assessment fairness compared with similar Albany properties on the roll," not "true market appraisal accuracy."

## Metrics that require more data

These should remain out of scope until the data exists:

- assessment-to-sale ratio
- transfer-price trend lines
- permit-to-value change analysis
- verified vacancy status
- code-violation risk scoring
- rent burden or tenant distress metrics

## Data quality checks

Surface these in the UI and in preprocessing logs:

1. Missing key fields
   - missing `parcel_id`
   - missing `swis_code`
   - missing `assessed_value`
   - missing `full_market_value`

2. Invalid values
   - `assessed_value < land_value`
   - `full_market_value < assessed_value` when clearly impossible given local roll conventions
   - negative frontage, depth, acres, or exemption values

3. Join failures
   - parcel missing geometry
   - parcel not found in county CSV
   - duplicate canonical record keys

4. String quality issues
   - mailing address contaminated with roll artifacts
   - impossible ZIP format
   - owner names that are clearly parse failures

5. Temporal consistency
   - same parcel with impossible year-over-year jumps that require review
   - roll marked `final` but sourced from tentative file name or metadata

Each parcel should carry `quality.warnings[]` so the app can explain uncertainty instead of silently rendering bad data.

## Time-series structure

The app should support multiple rolls over time using the same record shape.

Recommended folder model:

- `data/rolls/2025/final/albany-roll.json`
- `data/rolls/2025/tentative/albany-roll.json`
- `data/rolls/2024/final/albany-roll.json`
- `data/geometry/albany/albany-parcel-geometry.json`

Recommended index file:

```json
{
  "datasets": [
    {
      "assessmentYear": 2025,
      "rollType": "final",
      "swisCode": "010100",
      "path": "data/rolls/2025/final/albany-roll.json"
    }
  ]
}
```

## Product scope line

This app should be described as:

"A civic property tax explorer for Albany residents built from the official assessment roll and parcel map."

It should not be described as:

- a comprehensive real-estate platform
- a valuation engine
- a fraud detector
- a permit intelligence platform

Those require additional data that is not yet integrated or validated.

## Immediate implementation priorities

1. Upgrade `albany-roll.json` parsing so every row carries `assessmentYear`, `rollType`, `swisCode`, `recordKey`, and cleaned mailing fields.
2. Build a reusable join layer between roll rows, geometry, and county CSV reference data.
3. Add explicit parcel-level quality warnings and a public-facing data limitations panel.
4. Reframe every resident feature around the validated local data only.
5. Keep research-mode placeholders only when a real dataset path exists.

## Immediate no-go list

Do not add or retain features that imply data we do not actually have:

- exact permit timelines
- code enforcement history
- occupancy status claims
- statewide parcel browsing with unverified redistribution rights
- market value estimates derived from nonexistent sale data
