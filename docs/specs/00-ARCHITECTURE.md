# Windwalker Platform Architecture Specification

**Version:** 0.1.0
**Status:** Draft
**Date:** 2026-02-11
**Authors:** Claude (Opus 4.5) + Human

---

## Abstract

Windwalker is an enterprise-grade platform for the Native Treaty Mapping Initiative, providing interactive exploration of Native American treaties, tribal territories, unceded lands, and the legal history of land confiscation. Built on Sigil and Qliphoth, the platform emphasizes data provenance tracking through evidentiality types—critical for historical data where certainty varies.

---

## 1. Conceptual Foundation

### 1.1 Problem Domain

The Native Treaty Mapping Initiative documents:

1. **Treaties** - Agreements between the US Government and Tribal Nations
2. **Territories** - Geographic regions with historical and legal significance
3. **Unceded Lands** - Territories acquired without tribal consent
4. **Legal History** - Laws, acts, and court decisions affecting tribal lands

**Core Challenge:** Historical geographic data has varying levels of certainty. Treaty boundaries were often imprecisely defined, contested, or changed over time. A platform must represent not just *what* we know, but *how certain* we are.

### 1.2 Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Evidentiality First** | Every data point carries provenance. Uncertainty is explicit, not hidden. |
| **Layered Architecture** | Clear separation: Data → API → Frontend. Each layer independently testable. |
| **Cross-Platform** | Same Qliphoth code runs in browser (WASM), server (SSR), desktop (GTK4). |
| **Performance** | Sigil's LLVM backend for data processing; vector tiles for map rendering. |
| **Accessibility** | Non-technical users can explore; researchers can query deeply. |

### 1.3 Key Abstractions

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DOMAIN MODEL                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Treaty ←────────────→ Tribe ←────────────→ Territory              │
│     │                     │                      │                  │
│     │ affected_by         │ governed_by          │ changed_by       │
│     ▼                     ▼                      ▼                  │
│   Law ─────────────────────────────────────────────────────────────│
│                                                                     │
│   All entities carry:                                               │
│   - Temporal bounds (when was this true?)                          │
│   - Evidentiality markers (how certain are we?)                    │
│   - Source references (where did this come from?)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WINDWALKER PLATFORM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    PRESENTATION LAYER                          │ │
│  │                      (Qliphoth/WASM)                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ MapExplorer │  │ TreatyBrowser│  │ LegalTimeline        │  │ │
│  │  │ Component   │  │ Component   │  │ Component             │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ SearchPanel │  │ DetailView  │  │ StoryMap              │  │ │
│  │  │ Component   │  │ Component   │  │ Component             │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              │ HTTP/JSON                            │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      SERVICE LAYER                             │ │
│  │                        (Sigil)                                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ TreatyAPI   │  │ GeoQueryAPI │  │ LegalAPI              │  │ │
│  │  │ /api/v1/    │  │ /api/v1/geo │  │ /api/v1/laws          │  │ │
│  │  │ treaties/*  │  │ /*          │  │ /*                    │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ TribeAPI    │  │ SearchAPI   │  │ TileAPI               │  │ │
│  │  │ /api/v1/    │  │ /api/v1/    │  │ /tiles/{z}/{x}/{y}    │  │ │
│  │  │ tribes/*    │  │ search      │  │                       │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              │ SQL/PostGIS                          │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                      DATA LAYER                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ PostGIS     │  │ Document    │  │ Tile Cache            │  │ │
│  │  │ (Spatial)   │  │ Store       │  │ (Generated MVT)       │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                              │                                      │
│                              │ Import                               │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    PIPELINE LAYER                              │ │
│  │                      (Sigil CLI)                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │ │
│  │  │ GIS Import  │  │ Validator   │  │ Tile Generator        │  │ │
│  │  │ (SHP/GeoJSON│  │ (Schema +   │  │ (MVT creation)        │  │ │
│  │  │ /KML)       │  │ Evidence)   │  │                       │  │ │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| **Presentation** | Qliphoth (WASM) | User interaction, map rendering, state management |
| **Service** | Sigil (HTTP) | Business logic, API endpoints, query processing |
| **Data** | PostGIS + Files | Persistence, spatial indexing, caching |
| **Pipeline** | Sigil (CLI) | Data import, validation, tile generation |

### 2.3 Deployment Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT OPTIONS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Option A: Static + API (Recommended for start)                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │ CDN/Static  │────▶│ API Server  │────▶│ PostgreSQL  │           │
│  │ (WASM app)  │     │ (Sigil)     │     │ (PostGIS)   │           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│                                                                     │
│  Option B: Integrated (Future scaling)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Sigil Server                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ SSR Render  │  │ API Handler │  │ Tile Server         │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Type Architecture

### 3.1 Evidentiality Foundation

All domain types build on evidentiality markers:

```
// Evidentiality markers (from Sigil core)
//   !  = computed/verified (we calculated or verified this)
//   ?  = uncertain/optional (may not exist)
//   ~  = reported/external (came from external source)
//   ‽  = paradox/untrusted (user input, contested)

// Source tracking for all data
DataSource {
    id: SourceId!,
    name: string!,
    type: SourceType!,           // Archive, Academic, Government, Oral, Map
    url: Url?,
    accessed_date: Date?,
    reliability: Reliability~,   // Reported reliability assessment
    notes: string?,
}

// Temporal bounds for historical data
TemporalBounds {
    start: Date?,                // When did this become true?
    end: Date?,                  // When did this stop being true?
    precision: TimePrecision!,   // Day, Month, Year, Decade, Century
}
```

### 3.2 Core Domain Types

```
// ═══════════════════════════════════════════════════════════════════
// TREATY
// ═══════════════════════════════════════════════════════════════════

TreatyId: NewType<u64>

TreatyStatus: enum {
    Active,              // Still legally in force
    Violated,            // Violated by US Government
    Abrogated,           // Formally nullified
    Superseded,          // Replaced by later treaty
    Disputed,            // Status contested
}

Treaty {
    id: TreatyId!,
    name: string!,
    alternate_names: [string]!,

    // Dates
    signed_date: Date~,          // Reported from historical sources
    ratified_date: Date?,
    effective_date: Date?,

    // Parties
    us_signatories: [string]~,   // US officials who signed
    tribal_signatories: [TribalSignatory]~,
    tribes: [TribeId]!,

    // Geography
    ceded_territory: MultiPolygon~,    // Land given up
    reserved_territory: MultiPolygon~, // Land retained
    boundary_certainty: Certainty!,    // How sure are we about boundaries?

    // Legal status
    status: TreatyStatus!,
    violations: [Violation]~,
    affecting_laws: [LawId]~,

    // Metadata
    document_text: string?,
    document_url: Url?,
    sources: [DataSource]~,

    // Temporal
    temporal: TemporalBounds!,
}

TribalSignatory {
    name: string~,
    title: string?,
    tribe: TribeId?,
    mark_or_signature: SignatureType~,
}

Violation {
    id: ViolationId!,
    treaty: TreatyId!,
    description: string~,
    date: Date~,
    violating_action: string~,   // What act violated the treaty?
    sources: [DataSource]~,
}

// ═══════════════════════════════════════════════════════════════════
// TRIBE
// ═══════════════════════════════════════════════════════════════════

TribeId: NewType<u64>

RecognitionStatus: enum {
    FederallyRecognized,
    StateRecognized,
    Unrecognized,
    HistoricalOnly,      // No longer exists as distinct entity
}

Tribe {
    id: TribeId!,
    name: string!,
    alternate_names: [string]!,
    endonym: string?,            // Name in own language

    // Classification
    language_family: LanguageFamily?,
    cultural_area: CulturalArea?,

    // Legal
    recognition: RecognitionStatus~,
    treaties: [TreatyId]!,

    // Geography
    traditional_territory: MultiPolygon~,
    current_lands: [TerritoryId]!,

    // Metadata
    population_historical: [(Date, i64)]~,
    population_current: i64?,
    sources: [DataSource]~,
}

LanguageFamily: enum {
    Algonquian,
    Athabaskan,
    Iroquoian,
    Muskogean,
    Siouan,
    UtoAztecan,
    Salishan,
    // ... (extensible)
    Other { name: string },
}

CulturalArea: enum {
    Arctic,
    Subarctic,
    Northeast,
    Southeast,
    Plains,
    Southwest,
    GreatBasin,
    California,
    Plateau,
    Northwest,
}

// ═══════════════════════════════════════════════════════════════════
// TERRITORY
// ═══════════════════════════════════════════════════════════════════

TerritoryId: NewType<u64>

TerritoryType: enum {
    Traditional,         // Pre-contact homeland
    Ceded,              // Given up by treaty
    Reserved,           // Retained by treaty (reservation)
    Unceded,            // Never legally transferred
    Allotted,           // Individual allotments (Dawes Act)
    Trust,              // Held in trust by federal government
}

Certainty: enum {
    Verified,           // Multiple corroborating sources
    Probable,           // Strong evidence, some uncertainty
    Uncertain,          // Limited or conflicting evidence
    Disputed,           // Actively contested
    Reconstructed,      // Inferred from indirect evidence
}

Territory {
    id: TerritoryId!,
    name: string?,
    type: TerritoryType!,

    // Ownership
    tribe: TribeId!,
    treaty: TreatyId?,           // Treaty that created/modified this

    // Geography
    geometry: MultiPolygon~,
    area_sq_miles: f64?,
    certainty: Certainty!,
    boundary_notes: string?,

    // Temporal
    temporal: TemporalBounds!,

    // Metadata
    sources: [DataSource]~,
}

// ═══════════════════════════════════════════════════════════════════
// LAW
// ═══════════════════════════════════════════════════════════════════

LawId: NewType<u64>

LawType: enum {
    Act,                 // Congressional act
    ExecutiveOrder,      // Presidential order
    CourtDecision,       // Supreme Court or federal court
    Proclamation,        // Presidential proclamation
    Treaty,              // (cross-reference to Treaty)
    Regulation,          // Agency regulation
}

Law {
    id: LawId!,
    name: string!,
    official_citation: string?,

    // Classification
    type: LawType!,

    // Dates
    enacted_date: Date!,
    effective_date: Date?,
    repealed_date: Date?,

    // Effects
    affected_treaties: [TreatyId]~,
    affected_tribes: [TribeId]~,
    territory_changes: [TerritoryChange]~,

    // Content
    summary: string~,
    full_text_url: Url?,

    // Metadata
    sources: [DataSource]~,
}

TerritoryChange {
    territory: TerritoryId!,
    change_type: ChangeType!,
    before_geometry: MultiPolygon?,
    after_geometry: MultiPolygon?,
    description: string~,
}

ChangeType: enum {
    Created,
    Reduced,
    Expanded,
    Terminated,
    Transferred,
    Allotted,
}
```

### 3.3 Geometry Types

```
// Coordinate with evidentiality
Coordinate {
    lng: f64!,
    lat: f64!,
    source: SourceId?,
}

// GeoJSON-compatible types
Point: [f64; 2]                  // [lng, lat]
LineString: [Point]
Polygon: [LineString]            // First ring is exterior, rest are holes
MultiPolygon: [Polygon]

// Bounding box for queries
BBox {
    min_lng: f64!,
    min_lat: f64!,
    max_lng: f64!,
    max_lat: f64!,
}
```

---

## 4. Behavioral Contracts

### 4.1 API Contracts

```
// ═══════════════════════════════════════════════════════════════════
// TREATY API
// ═══════════════════════════════════════════════════════════════════

GET /api/v1/treaties
    Query: {
        tribe?: TribeId,
        status?: TreatyStatus,
        date_range?: (Date, Date),
        bbox?: BBox,
        limit?: u32,
        offset?: u32,
    }
    Response: {
        treaties: [TreatySummary]~,
        total: u64!,
    }

GET /api/v1/treaties/:id
    Response: Treaty~
    Errors: NotFound

GET /api/v1/treaties/:id/geometry
    Query: { format?: "geojson" | "mvt" }
    Response: GeoJSON | MVT
    Errors: NotFound

// ═══════════════════════════════════════════════════════════════════
// GEO QUERY API
// ═══════════════════════════════════════════════════════════════════

GET /api/v1/geo/point
    Query: {
        lng: f64!,
        lat: f64!,
        date?: Date,             // Point in time (defaults to present)
        layers?: [LayerType],    // Which layers to query
    }
    Response: {
        treaties: [TreatySummary]~,
        territories: [TerritorySummary]~,
        tribes: [TribeSummary]~,
    }

GET /api/v1/geo/bbox
    Query: {
        bbox: BBox!,
        date?: Date,
        layers?: [LayerType],
    }
    Response: {
        treaties: [TreatySummary]~,
        territories: [TerritorySummary]~,
        tribes: [TribeSummary]~,
    }

// ═══════════════════════════════════════════════════════════════════
// TILE API
// ═══════════════════════════════════════════════════════════════════

GET /tiles/:layer/:z/:x/:y.mvt
    Parameters: {
        layer: LayerType!,       // treaties, territories, tribes
        z: u8!,                  // Zoom level (0-22)
        x: u32!,                 // Tile X coordinate
        y: u32!,                 // Tile Y coordinate
    }
    Response: MVT (Mapbox Vector Tile)
    Headers: {
        Cache-Control: "public, max-age=86400"
    }

// ═══════════════════════════════════════════════════════════════════
// SEARCH API
// ═══════════════════════════════════════════════════════════════════

GET /api/v1/search
    Query: {
        q: string!,              // Search query
        types?: [EntityType],    // Filter by type
        limit?: u32,
    }
    Response: {
        results: [SearchResult]~,
        total: u64!,
    }

SearchResult: union {
    Treaty { id: TreatyId, name: string, snippet: string },
    Tribe { id: TribeId, name: string, snippet: string },
    Territory { id: TerritoryId, name: string, snippet: string },
    Law { id: LawId, name: string, snippet: string },
}
```

### 4.2 Data Import Contracts

```
// Pipeline: GIS files → Validated records → Database

import_geojson(path: Path, config: ImportConfig) → Result<ImportResult, ImportError>

ImportConfig {
    source: DataSource!,
    entity_type: EntityType!,
    field_mapping: FieldMapping!,
    validation_level: ValidationLevel!,
    evidence_default: Certainty!,   // Default certainty for imported data
}

ImportResult {
    imported: u64!,
    skipped: u64!,
    warnings: [ImportWarning]!,
}

ImportError: enum {
    FileNotFound { path: Path },
    ParseError { line: u64, message: string },
    ValidationError { entity: u64, errors: [ValidationError] },
    DatabaseError { message: string },
}

ValidationError: enum {
    MissingRequired { field: string },
    InvalidGeometry { reason: string },
    OutOfBounds { field: string, value: string },
    DuplicateKey { field: string, value: string },
}
```

---

## 5. Constraints & Invariants

### 5.1 Data Invariants

```
// P1: Every territory has exactly one tribe
∀ territory ∈ Territories:
    territory.tribe ∈ Tribes

// P2: Treaty parties include at least one tribe
∀ treaty ∈ Treaties:
    len(treaty.tribes) ≥ 1

// P3: Temporal bounds are valid
∀ entity with temporal ∈ AllEntities:
    entity.temporal.start ≤ entity.temporal.end ∨ entity.temporal.end = None

// P4: Certainty degrades through derivation
∀ derived_geometry:
    derived.certainty ≤ min(sources.certainty)

// P5: Every data point has at least one source
∀ entity ∈ AllEntities:
    len(entity.sources) ≥ 1

// P6: Polygon rings are closed
∀ polygon ∈ AllPolygons:
    ∀ ring ∈ polygon.rings:
        ring.first = ring.last

// P7: Exterior rings are counter-clockwise, holes are clockwise
∀ polygon ∈ AllPolygons:
    is_ccw(polygon.exterior) ∧ ∀ hole ∈ polygon.holes: is_cw(hole)
```

### 5.2 API Invariants

```
// P8: Pagination is consistent
∀ paginated_request:
    response.total = count(all_matching) ∧
    len(response.items) ≤ request.limit

// P9: Spatial queries respect bounds
∀ bbox_query:
    ∀ result ∈ response:
        intersects(result.geometry, query.bbox)

// P10: Point queries return containing geometries
∀ point_query:
    ∀ result ∈ response:
        contains(result.geometry, query.point)

// P11: Vector tiles are valid MVT
∀ tile_response:
    is_valid_mvt(response.body)
```

---

## 6. Error Conditions

### 6.1 API Errors

| Code | Error | Description |
|------|-------|-------------|
| 400 | `InvalidRequest` | Malformed request parameters |
| 404 | `NotFound` | Entity does not exist |
| 422 | `ValidationFailed` | Request data failed validation |
| 500 | `InternalError` | Server-side failure |

### 6.2 Import Errors

| Error | Recovery |
|-------|----------|
| `FileNotFound` | User provides correct path |
| `ParseError` | Fix source file at indicated line |
| `ValidationError` | Fix data or adjust validation rules |
| `DatabaseError` | Check database connectivity |

### 6.3 Rendering Errors

| Error | Fallback |
|-------|----------|
| Tile generation fails | Return empty tile, log error |
| Geometry too complex | Simplify at current zoom level |
| Source unavailable | Use cached data with staleness indicator |

---

## 7. Integration Points

### 7.1 External Dependencies

| Dependency | Purpose | Interface |
|------------|---------|-----------|
| **PostGIS** | Spatial database | SQL + PostGIS functions |
| **MapLibre GL JS** | Map rendering | JavaScript library (via FFI) |
| **GDAL/OGR** | GIS format handling | CLI or library bindings |

### 7.2 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRUST BOUNDARIES                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ UNTRUSTED (‽)                                                │   │
│  │ - User search queries                                        │   │
│  │ - Uploaded GIS files                                         │   │
│  │ - URL parameters                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ Validate & Sanitize                  │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ REPORTED (~)                                                 │   │
│  │ - Imported GIS data (after validation)                       │   │
│  │ - External API responses                                     │   │
│  │ - Historical sources                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ Cross-reference & Verify             │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ VERIFIED (!)                                                 │   │
│  │ - Computed geometries                                        │   │
│  │ - Cross-referenced data                                      │   │
│  │ - System-generated IDs                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 MapLibre Integration

```
// Qliphoth component wrapping MapLibre GL JS

MapExplorer {
    // Props
    center: Coordinate?,
    zoom: u8?,
    layers: [LayerConfig]!,
    selected_entity: EntityRef?,

    // Events (callbacks to Qliphoth)
    on_click: (Coordinate, [EntityRef]) → (),
    on_move: (BBox) → (),
    on_select: (EntityRef) → (),

    // Internal
    map_instance: MapLibreMap,   // FFI handle to JS object
}

// Integration via Qliphoth's platform FFI
extern "js" {
    fn create_map(container: ElementId, options: MapOptions) → MapHandle;
    fn add_source(map: MapHandle, id: string, source: SourceConfig);
    fn add_layer(map: MapHandle, layer: LayerConfig);
    fn set_feature_state(map: MapHandle, source: string, id: u64, state: object);
}
```

---

## 8. Open Questions

### 8.1 Technical

1. **MapLibre FFI:** What's the cleanest way to integrate MapLibre with Qliphoth?
   - Option A: Full FFI bindings to MapLibre GL JS
   - Option B: Thin wrapper that delegates to JS
   - Option C: Build native map renderer in Sigil (ambitious)

2. **Tile generation:** Generate on-the-fly or pre-generate?
   - On-the-fly: More flexible, higher latency
   - Pre-generate: Lower latency, storage costs, cache invalidation complexity

3. **Desktop version:** Is GTK4 the right choice for Jim's workflow?
   - Could integrate with QGIS via plugin instead

### 8.2 Data

4. **Jim's current data format:** What QGIS project structure is he using?
   - Need to understand before finalizing import pipeline

5. **Source reliability:** How do we rate source reliability?
   - Need taxonomy of source types and their default reliability

6. **Conflicting boundaries:** How to handle when sources disagree?
   - Show all versions? Merge? Prioritize certain sources?

### 8.3 UX

7. **Target audience priority:** Researchers vs. general public vs. educators?
   - Affects complexity of default interface

8. **Temporal navigation:** How to show changes over time?
   - Timeline slider? Discrete snapshots? Animation?

---

## 9. Development Phases

### Phase 0: Data Sourcing ❌
- [ ] Kappler scraper implementation
- [ ] NARA API integration
- [ ] BIA data scraper
- [ ] Cross-reference validation
- [ ] Human review queue
- See: [01-DATA-SOURCING.md](./01-DATA-SOURCING.md)

### Phase 1: Foundation ❌
- [ ] Set up Sigil project structure
- [ ] Define core types in Sigil
- [ ] PostGIS schema creation
- [ ] Import verified data from sourcing pipeline

### Phase 2: API Layer ❌
- [ ] Treaty CRUD endpoints
- [ ] Geo queries (point, bbox)
- [ ] Search endpoint
- [ ] Basic vector tile serving

### Phase 3: Frontend ❌
- [ ] Qliphoth app scaffold
- [ ] MapLibre integration
- [ ] Treaty/Territory browsing
- [ ] Detail views

### Phase 4: Legal Analysis ❌
- [ ] Law database
- [ ] Treaty-Law linking
- [ ] Timeline component
- [ ] Impact visualization

### Phase 5: Polish ❌
- [ ] Story maps
- [ ] Educational guides
- [ ] Performance optimization
- [ ] Documentation

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-11 | Initial draft. Architecture overview, type definitions, API contracts, invariants. |
