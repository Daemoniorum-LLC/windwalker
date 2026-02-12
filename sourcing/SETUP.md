# Windwalker Sourcing Pipeline Setup

## Prerequisites

- Sigil v0.4.0+
- PostgreSQL 14+ with PostGIS extension
- curl (for testing API access)

## Configuration

### NARA API Key

The NARA (National Archives) API requires an API key for access.

1. **Request an API key**: Email `Catalog_API@nara.gov` with:
   - Your name
   - Email address for the key
   - Brief description: "Native Treaty Mapping Initiative research project"

2. **Configure the key**: Set the environment variable:
   ```bash
   export NARA_API_KEY="your-api-key-here"
   ```

3. **Verify access**:
   ```bash
   curl -H "Content-Type: application/json" \
        -H "x-api-key: $NARA_API_KEY" \
        "https://catalog.archives.gov/api/v2/records/search?q=indian%20treaty&rows=1"
   ```

### Database Setup

1. **Create the staging database**:
   ```bash
   createdb windwalker_staging
   psql windwalker_staging -c "CREATE EXTENSION postgis;"
   psql windwalker_staging -c "CREATE EXTENSION uuid-ossp;"
   ```

2. **Run migrations**:
   ```bash
   psql windwalker_staging < migrations/001_staging_schema.sql
   ```

3. **Configure connection** (set environment variable):
   ```bash
   export DATABASE_URL="postgres://user:pass@localhost/windwalker_staging"
   ```

## Building

```bash
cd sourcing
sigil build
```

## Running

```bash
# Run the pipeline (test mode - 5 treaties)
sigil run-ws

# Run full pipeline
sigil run-ws -- --full
```

## Data Sources

| Source | API Key Required | Rate Limit | Coverage |
|--------|-----------------|------------|----------|
| Kappler | No | Respectful delay | 375 treaties (1778-1883) |
| NARA | Yes | 10,000/month | Original documents, scans |
| BIA | No | TBD | Tribal recognition data |

## Evidentiality Markers

All scraped data carries evidentiality markers:

- `!` = verified (computed or cross-referenced)
- `~` = reported (scraped from authoritative source)
- `?` = uncertain (may not exist)
- `‽` = paradox (conflicting sources)

## Support

For issues with this pipeline, contact the Windwalker project maintainers.
For NARA API issues, contact `Catalog_API@nara.gov`.
