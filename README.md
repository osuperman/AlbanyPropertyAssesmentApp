# Albany Property Intelligence Dashboard

An interactive data intelligence application for exploring Albany, NY property assessment data from the 2025 Final Assessment Roll.

## Features
- 🔍 **Browse & Search** — Search by address, parcel ID, neighborhood, or owner name with pagination
- 📊 **Analytics** — Property value distributions, equity ratios, exemption analysis
- 🗺️ **Map View** — Interactive map with zoom/pan, color-coded by property class, equity, or value
- ⚖️ **Equity Analysis** — Assessment deserts, tax burden by ZIP, exemption revenue impact
- 💡 **Opportunity Finder** — Grievance candidates, under-assessed commercial properties
- 🏢 **Ownership Patterns** — Absentee owner analysis, top landlords
- 🔎 **Property Lookup** — Detailed parcel view, comparable sales, tax bill breakdown
- 📋 **Data Quality** — Missing field audit, completeness scores
- 🔄 **Compare Tool** — Side-by-side comparison of up to 4 parcels

## How to Use
1. **Standalone HTML** — Open `albany-dashboard.html` directly in Chrome or Firefox. No server needed, works offline.
2. **With your own data** — Upload Albany County CSV or the Albany Assessment Roll `.txt` file to load all 27,000+ parcels.

## Files
- `albany-full-dashboard.jsx` — React source (for development)
- `albany-dashboard.html` — Compiled standalone app (open this)

## Data Sources
- Albany 2025 Final Assessment Roll (City of Albany)
- Albany County Parcel Data

## Tech Stack
React 17 · Recharts · esbuild
