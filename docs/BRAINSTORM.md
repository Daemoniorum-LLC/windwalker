# Windwalker Brainstorming

**Project:** Native Treaty Mapping Initiative - Technical Support
**Date:** 2026-02-11
**Status:** Architecture Decision Made

---

## Context

The Native Treaty Mapping Initiative (Jim Windwalker) is creating interactive maps documenting:
- Native American treaties
- Tribal territories and language regions
- Unceded lands (territories acquired without tribal consent)
- Legal analysis of land confiscation

Current state: Using QGIS, seeking volunteers, scope "larger than anticipated."

---

## Decision: Full Daemoniorum Stack

**2026-02-11:** After reviewing Jim's needs and Daemoniorum's capabilities, we are committing to building a complete enterprise-grade platform using our in-house tooling:

- **Sigil** (`../sigil-lang`) - Polysynthetic systems language
- **Qliphoth** (`../qliphoth`) - Reactive web framework

This is a gift to Jim and the initiative. No half-measures.

---

## Why Sigil + Qliphoth?

### Sigil Advantages for This Project

| Capability | Application to Treaty Mapping |
|------------|------------------------------|
| **Evidentiality Type System** | Track data provenance: verified treaties (`!`), reported boundaries (`~`), uncertain claims (`?`) |
| **3.6x faster than Rust** | Process large GIS datasets efficiently |
| **SIMD/AVX-512 support** | Vector operations on coordinate data |
| **Native HTTP/WebSocket** | API layer without external dependencies |
| **Polysynthetic syntax** | Express complex geospatial transformations concisely |

### Qliphoth Advantages

| Capability | Application to Treaty Mapping |
|------------|------------------------------|
| **Cross-platform** | Browser (WASM), server (SSR), desktop (GTK4) from same code |
| **Evidence tracking in UI** | Display data certainty to users visually |
| **React-like patterns** | Maintainable, componentized map interface |
| **Type-safe routing** | `/treaty/:id`, `/tribe/:name`, `/location/:lat/:lng` |
| **Actor-based state** | Manage complex map state, layer visibility, filters |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WINDWALKER PLATFORM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    QLIPHOTH FRONTEND                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ Map Viewer  │  │ Treaty DB   │  │ Legal Analysis      │  │   │
│  │  │ Component   │  │ Browser     │  │ Timeline            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ Territory   │  │ Search &    │  │ Educational         │  │   │
│  │  │ Explorer    │  │ Filter      │  │ Story Maps          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      SIGIL API LAYER                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ Treaty API  │  │ Geo Query   │  │ Legal Document      │  │   │
│  │  │ /treaties/* │  │ /geo/*      │  │ /laws/*             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ PostGIS     │  │ Document    │  │ Vector Tile         │  │   │
│  │  │ (Spatial)   │  │ Store       │  │ Cache               │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  DATA PIPELINE (SIGIL)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ GIS Import  │  │ Validation  │  │ Tile Generation     │  │   │
│  │  │ (Shapefile, │  │ & Evidence  │  │ (Vector tiles for   │  │   │
│  │  │ GeoJSON)    │  │ Tagging     │  │  web performance)   │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Data Models (Draft)

### Treaty
```
Treaty {
    id: TreatyId!,
    name: string!,
    signed_date: Date?,
    ratified_date: Date?,
    parties: [Party]!,           // US Government + Tribal Nations
    territory: Polygon~,         // Reported boundary (may be uncertain)
    ceded_lands: [Polygon]~,
    reserved_lands: [Polygon]~,
    document_url: Url?,
    status: TreatyStatus!,       // Active, Violated, Abrogated
    violations: [Violation]~,
    source: DataSource~,         // Provenance tracking
}
```

### Territory
```
Territory {
    id: TerritoryId!,
    name: string!,
    type: TerritoryType!,        // Traditional, Reserved, Ceded, Unceded
    tribe: TribeId!,
    geometry: MultiPolygon~,
    time_period: DateRange?,
    certainty: Evidentiality!,   // How certain is this boundary?
    sources: [DataSource]~,
}
```

### Tribe
```
Tribe {
    id: TribeId!,
    name: string!,
    alternate_names: [string]!,
    language_family: LanguageFamily?,
    treaties: [TreatyId]!,
    territories: [TerritoryId]!,
    modern_recognition: RecognitionStatus?,
}
```

### Law
```
Law {
    id: LawId!,
    name: string!,
    enacted_date: Date!,
    type: LawType!,              // Act, Executive Order, Court Decision
    affected_treaties: [TreatyId]~,
    affected_tribes: [TribeId]~,
    territory_changes: [TerritoryChange]~,
    full_text_url: Url?,
    summary: string~,
}
```

---

## Development Phases

### Phase 1: Foundation
- [ ] Set up Sigil project structure
- [ ] Define core types with evidentiality
- [ ] Create GeoJSON import pipeline
- [ ] Basic PostGIS schema

### Phase 2: API Layer
- [ ] Treaty CRUD endpoints
- [ ] Geospatial queries (point-in-polygon, bounding box)
- [ ] Search and filter
- [ ] Vector tile generation

### Phase 3: Frontend
- [ ] Qliphoth app scaffold
- [ ] Map component with MapLibre integration
- [ ] Treaty detail views
- [ ] Territory explorer

### Phase 4: Legal Analysis
- [ ] Law database
- [ ] Treaty-law relationships
- [ ] Timeline visualization
- [ ] Impact analysis

### Phase 5: Educational
- [ ] Story map functionality
- [ ] Guided tours
- [ ] Educational resources integration

---

## Open Questions

1. **Map library integration**: How does Qliphoth integrate with MapLibre/Leaflet?
   - May need FFI bindings or wrapper components

2. **Data ingestion**: What format is Jim's current data in?
   - Need to understand existing QGIS project structure

3. **Hosting**: Where will this be deployed?
   - Static hosting + API server, or integrated?

4. **Collaboration with Jim**: What's his priority?
   - Phase 1 data pipeline? Phase 3 public viewer?

---

## Notes

**2026-02-11**: Committed to full Daemoniorum stack. This is a gift to Jim and the initiative. The evidentiality system is particularly powerful here - treaty boundaries are often contested or uncertain, and being able to track and display that uncertainty is genuinely valuable for this kind of historical/legal work.
