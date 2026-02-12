# Windwalker

**Native Treaty Mapping Initiative**

An interactive platform for exploring treaties between the United States government and Native American nations, tracking tribal territories, and documenting the legal history of land rights.

## Overview

Windwalker provides:

- **Treaty Database** — All 375 ratified treaties (1778-1871) with full text, signatories, and legal status
- **Interactive Map** — Visualize treaty territories, ceded lands, and reservations over time
- **Evidentiality Tracking** — Every data point shows its certainty level and source provenance
- **Temporal Navigation** — See how boundaries changed from 1778 to present
- **Full-Text Search** — Search across treaties, tribes, and territories

## Project Structure

```
windwalker/
├── sourcing/           # Data scraping pipeline
│   ├── src/
│   │   ├── sources/    # Kappler, NARA, BIA scrapers
│   │   ├── normalize/  # Data normalization
│   │   └── validate/   # Validation & conflict detection
│   └── migrations/     # PostgreSQL/PostGIS schema
│
├── api/                # REST API server
│   └── src/
│       ├── routes/     # Treaty, tribe, search, geo, tile endpoints
│       ├── db/         # Database connection layer
│       └── middleware/ # Logging, CORS, error handling
│
├── web/                # Qliphoth frontend (WASM)
│   ├── src/
│   │   ├── components/ # MapExplorer, TreatyBrowser, etc.
│   │   └── bindings/   # MapLibre GL JS integration
│   └── dist/           # Built assets
│
└── docs/
    ├── specs/          # Architecture & data sourcing specs
    └── GETTING-STARTED.md  # Quick start guide
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Qliphoth (Sigil) | Reactive UI, compiles to WASM |
| Map | MapLibre GL JS | Interactive vector tile maps |
| API | Sigil HTTP | REST endpoints, tile serving |
| Database | PostgreSQL + PostGIS | Spatial queries, full-text search |
| Data Pipeline | Sigil CLI | Scraping, validation, import |

## Data Sources

| Source | Coverage | Reliability |
|--------|----------|-------------|
| **Kappler** | 375 treaties (1778-1883) | 98% — OCR'd historical text |
| **NARA** | Original documents, scans | 99% — National Archives |
| **BIA** | Tribal recognition data | 95% — Bureau of Indian Affairs |

## Evidentiality System

All data carries evidentiality markers showing certainty:

| Marker | Meaning | Example |
|--------|---------|---------|
| `!` | **Verified** — Cross-referenced from multiple sources | Treaty dates confirmed by NARA + Kappler |
| `~` | **Reported** — From single authoritative source | Treaty text from Kappler |
| `?` | **Uncertain** — Limited evidence | Boundary interpretation |
| `‽` | **Disputed** — Sources conflict | Conflicting signatory names |

On the map, verified boundaries show solid lines; uncertain boundaries show dashed lines.

## Quick Start

### Prerequisites

- Sigil v0.4.0+
- PostgreSQL 14+ with PostGIS
- Node.js 18+ (for frontend build)

### Setup

```bash
# 1. Clone and enter project
cd windwalker

# 2. Set up database
createdb windwalker_staging
psql windwalker_staging -c "CREATE EXTENSION postgis;"
psql windwalker_staging -c "CREATE EXTENSION uuid-ossp;"
psql windwalker_staging < sourcing/migrations/001_staging_schema.sql

# 3. Configure environment
export DATABASE_URL="postgres://localhost/windwalker_staging"
export NARA_API_KEY="your-key-here"  # Optional, for NARA data

# 4. Run the data pipeline (test mode)
cd sourcing && sigil run-ws

# 5. Start the API server
cd ../api && sigil run &

# 6. Build and serve the frontend
cd ../web && sigil build --target wasm32
# Serve dist/ with any static file server
```

### Development

```bash
# Run API with hot reload
cd api && sigil run --dev

# Build frontend in watch mode
cd web && sigil build --watch
```

## API Reference

### Treaties

```
GET /api/v1/treaties
    ?tribe=<id>           Filter by tribe
    ?status=Active|Violated|Abrogated
    ?date_from=YYYY-MM-DD
    ?date_to=YYYY-MM-DD
    ?bbox=minLng,minLat,maxLng,maxLat
    ?limit=50&offset=0

GET /api/v1/treaties/:id
GET /api/v1/treaties/:id/geometry
GET /api/v1/treaties/:id/articles
```

### Tribes

```
GET /api/v1/tribes
    ?state=OK
    ?recognized=true
    ?search=Cherokee

GET /api/v1/tribes/:id
GET /api/v1/tribes/:id/treaties
```

### Search

```
GET /api/v1/search?q=fort+laramie&types=treaty,tribe
GET /api/v1/suggest?q=cher
```

### Spatial Queries

```
GET /api/v1/geo/point?lng=-98.5&lat=39.8
GET /api/v1/geo/bbox?bbox=-100,35,-95,40
```

### Vector Tiles

```
GET /tiles/treaties/{z}/{x}/{y}.mvt
GET /tiles/tribes/{z}/{x}/{y}.mvt
```

## Contributing

This project uses Spec-Driven Development. Before implementing:

1. Read the relevant spec in `docs/specs/`
2. If the spec is incomplete, update it first
3. Write tests that validate spec requirements
4. Implement to pass tests

## Data Accuracy

Historical treaty data is inherently uncertain. Windwalker makes this uncertainty visible rather than hiding it. When using this data:

- Always check the evidentiality marker
- Review source citations before citing
- Consult original documents for legal purposes
- Respect that tribal nations may have their own records and perspectives

## License

This project is dedicated to supporting indigenous land rights research and education.

## Acknowledgments

- Jim Windwalker — Inspiration and domain expertise
- Kappler's Indian Affairs — Primary treaty text source
- National Archives — Original documents and scans
- All tribal nations whose history this project documents
