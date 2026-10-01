# Albany Property Tax Explorer

A civic property tax explorer for Albany residents built from the official 2026 final assessment roll (with 2025 values kept for comparison) and local parcel geometry.

## Current scope

The project is now data-first. The app should only expose features that are supported by real local datasets already in the repository or by official public sources that can be joined cleanly.

Core supported use cases:

- look up a property
- compare assessments inside Albany
- find exemptions
- identify absentee ownership
- explore parcel patterns on a map

How the app is organized for residents:

- **Home** starts with one address search. Data status and file loading details are behind "About this data".
- **Find a Property** shows a plain-language summary: assessed value, taxable value, and the exemptions or STAR credit on record.
- **Check My Assessment** compares a home with similar nearby homes and recent sales (the grievance workflow).
- **Lower My Taxes** shows recorded exemptions and which programs an owner may apply for (STAR credit, senior, veterans, disability).
- **Research tools** (Citywide Patterns, Ownership, Analytics, Change Signals, Data Quality) stay one click away.
- Each section has its own URL (`?tab=...`), so Back, Refresh, and shared links work.
- Map links always say which map they open: "App map" / "Show on app map" stays in this site; "Google Maps ↗" and "Street View ↗" open Google in a new tab (or the Google Maps app on phones). The links use Google's Maps URLs (`google-maps-links.js`), which need no API key. Street View links start on the property's own street and face the parcel, using the street centerlines and parcel boundaries; Google's viewer opens black if a Street View link has no heading.
- The app map opens colored by assessed value. Other views: value per square foot compared with the neighborhood (homes), change since the prior roll, exemptions and STAR, property type, and owner likely lives elsewhere. The assessed-to-full-value ratio is not a map view because nearly every parcel shares the same uniform percent.
- "Aerial photo" swaps the street map for New York State's 2024 orthoimagery (NYS ITS Geospatial Services WMS). The statewide "Latest" composite is too slow for map tiles (20-30 seconds each), and the 2022, 2023, and 2025 services have no Albany County coverage.
- Map links are shareable: the address records the selected parcel, map center and zoom, coloring, and base map (`?tab=mapview&parcel=...&lat=...&lng=...&z=...&layer=...&base=aerial`), and "Copy link to this view" copies it. Leaving the map tab drops those parameters.
- Map drawing keeps parcel shapes between renders and only adds, removes, or restyles what changed. At the citywide view (about 25,000 shapes) a click on a parcel went from 1.2-1.8 seconds of main-thread work to under 0.1 seconds.
- Exemption names explain themselves on hover, keyboard focus, or tap. Meanings come from the NYS Assessor Manual exemption code index, plus notes for Albany's local codes (50000, 51002, 99999).

Assessment level: Albany assesses every property at a uniform percent of value (91.17% on the 2026 roll, 96% on the 2025 roll), and the roll's full market value is assessed value divided by that percent. The assessed-to-full-value ratio is therefore the same for nearly every parcel and is shown only as a record check, never as a fairness verdict. The app reads the percent from the loaded roll; nothing assumes a fixed level.

Roll parsing notes:

- The roll PDF is converted to text with `extract-roll-pdf.py` (pypdf, layout mode) and parsed by `roll-layout-parser.js`. It handles condominium units, split lots, and utility and special franchise records with suffixed print keys (for example `76.26-1-53.-101`, `54.13-4-6.1`, `555.-3-441`, `601.000-9999-132.350-2001`), mixed homestead / non-homestead parcels (it uses the PARCEL TOTALS block), and values of $1 million or more, which the roll prints without the millions comma (`3133,035`).
- Parser check: the parsed record count, land, assessed, and county / city / STAR-taxable totals match the roll's own GRAND TOTALS page exactly (2026: 29,511 parcels, $16,595,109,523 assessed; 2025: 29,565 parcels, $16,707,148,440 assessed). Each record's assessed value is also checked against its full market value (assessed = full value x uniform percent).
- The roll has no property ZIP field; every ZIP on it is the owner's mailing ZIP. That is the property's ZIP only when the owner lives there. For all other records (landlords, including those who live elsewhere in Albany), the ZIP is estimated from the three nearest owner-occupied homes by roll grid coordinates (98% agreement in a holdout test), then from the nearest owner-occupied house number on the same street, then from owner-occupied units on the same lot. PO box and agency ZIPs (12201, 12220s-12260s) are never used as property ZIPs.
- Condo units are only compared with other condo units in Check My Assessment.

Year-over-year data:

- `albany-roll.json` is a compact column file (`roll-compact-format.js`, about 9 MB instead of about 45 MB) that the app decodes on load. It keeps the 2025 assessed, land, and full value, the three taxable values, exemption codes, and the owner, class, and tax class where they changed, for every parcel on both rolls.
- The app uses these for "Same as 2025" / change lines on property cards, a "Change from 2025" section on each property, Browse sorting by change, Compare rows, a "Change since 2025" view in Citywide Patterns, and context in Check My Assessment.
- On the 2026 roll, 99.4% of residential properties kept the same assessed value. The City's uniform percent fell from 96% to 91.17%, so each unchanged assessment now stands for a full-value estimate about 5.3% higher. Basic STAR exemptions on the roll fell from 4,080 to 2,745; property pages point owners to the state STAR credit when an exemption disappeared.

Conditional or future features:

- permit and code-case history
- sale-based valuation models
- statewide parcel browsing beyond Albany

See [DATA_MODEL.md](./DATA_MODEL.md) for the canonical schema, join strategy, and feature feasibility rules.

## Run the app

Use the local scripts from the repo root:

- `npm run serve` - serves the app at `http://127.0.0.1:4173`
- `npm run build` - rebuilds `bundle.js` from `albany-full-dashboard.jsx`
- `npm run build:site` - stages a clean `site/` folder for GitHub Pages
- `npm run check:publish` - rebuilds the app and stages the Pages artifact locally
- `npm run extract:roll-pdf` - extracts `Albany 2026 Final Roll.pdf` to `Albany 2026 Final Roll.txt` (needs Python with `pypdf`; about 10 minutes)
- `npm run convert:roll` - parses the roll text into `albany-roll.full.json`
- `npm run convert:roll-prior` - parses and enriches the prior roll (`Albany 2025 Final Roll.txt`) into `albany-roll-2025.full.json`
- `npm run prepare:data` - applies county, geometry, neighborhood, and inventory enrichment to `albany-roll.full.json`
- `npm run build:roll` - writes the compact `albany-roll.json` (current roll plus prior-year columns) and verifies it round-trips
- `npm run refresh:data` - runs convert, prepare, and build:roll in order

The `*.full.json` files are intermediate and not committed (the GitHub file limit is 50 MB).

Private Google Maps keys:

- keep them out of `grievance-settings.json`
- use an untracked `grievance-settings.local.json` for local builds, or set `ALBANY_GOOGLE_MAPS_EMBED_KEY` and `ALBANY_GOOGLE_MAPS_STATIC_KEY`
- restrict the key in Google Cloud to the exact websites and APIs the app uses

The current app auto-loads these local files when they are present in the repo root:

- `albany-roll.json` (compact format; older full-format files still load)
- `Albany 2025 Final Roll conv.txt` (fallback only, if `albany-roll.json` is missing)
- `Albany_County_Parcels_2024_-1728787929616575091.csv`
- `albany_parcels.json`
- `albany-parcel-geometry.json`
- `albany_street_centerlines.geojson`

## Important files

- `albany-full-dashboard.jsx` - main React source
- `COMPARABLE_PROPERTY_SELECTION.md` - code-level explanation of how comparable properties are selected and filtered for grievance use
- `bundle.js` - compiled browser bundle
- `index.html` - app entry point
- `albany-dashboard.html` - alternate app entry point
- `DATA_MODEL.md` - data schema, joins, and scope rules

## Primary data sources

- Albany County assessment rolls:
  [https://www.albanycountyny.gov/departments/management-and-budget/real-property-tax-service-agency/assessment-rolls](https://www.albanycountyny.gov/departments/management-and-budget/real-property-tax-service-agency/assessment-rolls)
- City of Albany assessment page:
  [https://www.albanyny.gov/207/Assessment](https://www.albanyny.gov/207/Assessment)
- NYS local assessment roll dataset:
  [https://data.ny.gov/Government-Finance/Property-Assessment-Data-from-Local-Assessment-Rol/7vem-aaz7](https://data.ny.gov/Government-Finance/Property-Assessment-Data-from-Local-Assessment-Rol/7vem-aaz7)
- NYS parcel program:
  [https://gis.ny.gov/parcels](https://gis.ny.gov/parcels)

## Tech

- React
- Recharts
- esbuild

## Publish to GitHub Pages

The repo now supports a staged Pages deploy instead of publishing the raw repository root.

Local publish check:

- `npm run check:publish`
- inspect the generated `site/` folder
- confirm `site/site-manifest.json` includes the expected app and data files

GitHub Actions deploy:

- workflow file: `.github/workflows/deploy-pages.yml`
- trigger: push to `master` or manual `workflow_dispatch`
- published artifact: `site/`
- required repository secret: `ALBANY_GOOGLE_MAPS_KEY`
- one-time repo setting: GitHub Pages source must be set to `GitHub Actions`
- GitHub Actions stages the committed bundle and injects the Google Maps secret into the published HTML

Important:

- GitHub Pages will only autoload data that is actually published in `site/` under the same filenames the app expects
- this beta currently publishes `albany-roll.json` and, when present, `albany-parcel-geometry.json` and `albany_street_centerlines.geojson`
- the app depends on Leaflet and `proj4` CDNs plus OpenStreetMap tiles, so the public site still requires internet access
- the Google Maps key is injected at build time from the repository secret, not committed to source control
