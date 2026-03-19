# Albany Property Tax Explorer

A civic property tax explorer for Albany residents built from the official 2025 final assessment roll and local parcel geometry.

## Current scope

The project is now data-first. The app should only expose features that are supported by real local datasets already in the repository or by official public sources that can be joined cleanly.

Core supported use cases:

- look up a property
- compare assessments inside Albany
- find exemptions
- identify absentee ownership
- explore parcel patterns on a map

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
- `npm run refresh:data` - reconverts the Albany roll text file and reapplies county and geometry enrichment
- `npm run prepare:data` - reapplies county and geometry enrichment to the existing `albany-roll.json`

Private Google Maps keys:

- keep them out of `grievance-settings.json`
- use an untracked `grievance-settings.local.json` for local builds, or set `ALBANY_GOOGLE_MAPS_EMBED_KEY` and `ALBANY_GOOGLE_MAPS_STATIC_KEY`
- restrict the key in Google Cloud to the exact websites and APIs the app uses

The current app auto-loads these local files when they are present in the repo root:

- `albany-roll.json`
- `Albany 2025 Final Roll conv.txt`
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
- GitHub Actions installs the root `package.json` dependencies before building

Important:

- GitHub Pages will only autoload data that is actually published in `site/` under the same filenames the app expects
- this beta currently publishes `albany-roll.json` and, when present, `albany-parcel-geometry.json` and `albany_street_centerlines.geojson`
- the app depends on Leaflet and `proj4` CDNs plus OpenStreetMap tiles, so the public site still requires internet access
- the Google Maps key is injected at build time from the repository secret, not committed to source control
