# Windwalker Data Sourcing Specification

**Version:** 0.1.0
**Status:** Draft
**Date:** 2026-02-11
**Parent Spec:** 00-ARCHITECTURE.md

---

## Abstract

This specification defines the data sourcing infrastructure for Windwalker, emphasizing authoritative government sources over LLM-generated content. Given concerns about prior research conducted with ChatGPT, this system provides verified, traceable data with explicit provenance—ensuring Jim and future researchers can trust every data point.

---

## 1. Problem Statement

### 1.1 The LLM Hallucination Risk

Large language models (including ChatGPT) are known to:
- **Fabricate treaty names** that never existed
- **Invent dates** that don't match historical records
- **Create fictional signatories** with plausible-sounding names
- **Generate incorrect legal citations** that appear authoritative
- **Confuse similar treaties** or merge details from multiple sources

For indigenous treaty documentation, these errors can have real consequences:
- Undermine legal arguments based on treaty rights
- Misrepresent historical record to researchers and the public
- Create confusion when data doesn't match authoritative sources
- Require costly correction later when errors are discovered

### 1.2 The Solution: Authoritative Source Primacy

Every data point in Windwalker must trace to an **authoritative source**:
- Government archives
- Official tribal nation records
- Published legal compilations
- Academic sources with primary source citations

**Principle:** If we can't cite an authoritative source, we don't include the data.

---

## 2. Authoritative Source Registry

### 2.1 Primary Sources (Highest Authority)

| Source | Type | URL | Data Available |
|--------|------|-----|----------------|
| **Kappler's Indian Affairs** | Legal Compilation | oklegal.onenet.net/kappler | Treaty texts, ratification dates, signatories |
| **National Archives (NARA)** | Government Archive | archives.gov | Original treaty documents, images |
| **Bureau of Indian Affairs** | Government Agency | bia.gov | Tribal recognition, reservations, current status |
| **Library of Congress** | Government Archive | loc.gov | Historical maps, documents, photographs |
| **Federal Register** | Government Publication | federalregister.gov | Current tribal regulations, recognition notices |
| **GPO GovInfo** | Government Publication | govinfo.gov | US Statutes at Large (treaty ratifications) |

### 2.2 Secondary Sources (Verified Compilations)

| Source | Type | URL | Data Available |
|--------|------|-----|----------------|
| **Indian Land Tenure Foundation** | Nonprofit | iltf.org | Land status, allotment history |
| **Native Land Digital** | Community Project | native-land.ca | Territory maps (community-sourced) |
| **First Peoples Worldwide** | Research Org | firstpeoples.org | Tribal nation data |
| **State Historical Societies** | Archives | (varies) | Regional treaty context |

### 2.3 Tertiary Sources (Reference Only)

| Source | Type | Use |
|--------|------|-----|
| **Wikipedia** | Encyclopedia | Cross-reference only, never primary |
| **Academic Papers** | Research | Valuable if citing primary sources |
| **Tribal Websites** | Self-reported | Authoritative for self-identification |

### 2.4 Excluded Sources

| Source | Reason |
|--------|--------|
| **ChatGPT/Claude/LLMs** | Hallucination risk, no provenance |
| **AI-generated summaries** | May introduce errors |
| **Unattributed web content** | No verification possible |
| **Social media** | No editorial standards |

---

## 3. Source Hierarchy & Conflict Resolution

### 3.1 Authority Hierarchy

When sources conflict, prefer in this order:

```
1. Original treaty document (NARA, Kappler)
     ↓
2. Official government compilation (US Statutes at Large)
     ↓
3. Bureau of Indian Affairs records
     ↓
4. Tribal nation official statement
     ↓
5. Academic source citing primary documents
     ↓
6. Secondary compilation (with documented methodology)
```

### 3.2 Conflict Documentation

When sources disagree, we document ALL versions:

```
ConflictRecord {
    entity_type: EntityType!,
    entity_id: EntityId!,
    field: string!,

    versions: [
        {
            value: any~,
            source: DataSource~,
            confidence: Confidence!,
        }
    ]!,

    resolution: Resolution?,
    resolution_rationale: string?,
}

Resolution: enum {
    PreferredSource,      // One source deemed more authoritative
    Synthesis,            // Combined from multiple sources
    Unresolved,           // Documented as disputed
    TribalDetermination,  // Deferred to tribal nation
}
```

---

## 4. Scraping Infrastructure

### 4.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA SOURCING PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     SOURCE ADAPTERS                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ Kappler     │  │ NARA        │  │ BIA                 │  │   │
│  │  │ Scraper     │  │ API Client  │  │ Scraper             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ LOC         │  │ Fed Register│  │ Tribal Sites        │  │   │
│  │  │ API Client  │  │ API Client  │  │ Scraper             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   NORMALIZATION LAYER                        │   │
│  │  - Parse HTML/JSON/XML responses                             │   │
│  │  - Extract structured data                                   │   │
│  │  - Normalize names, dates, locations                         │   │
│  │  - Tag with source provenance                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   VALIDATION LAYER                           │   │
│  │  - Schema validation                                         │   │
│  │  - Cross-reference checking                                  │   │
│  │  - Conflict detection                                        │   │
│  │  - Evidentiality assignment                                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   STAGING DATABASE                           │   │
│  │  - Raw scraped data                                          │   │
│  │  - Provenance metadata                                       │   │
│  │  - Conflict records                                          │   │
│  │  - Human review queue                                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              │ Human Review                         │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   PRODUCTION DATABASE                        │   │
│  │  (Only verified data enters production)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Source Adapter Interface

```
// Every source adapter implements this interface
SourceAdapter {
    source_id: SourceId!,
    source_name: string!,
    base_url: Url!,

    // Rate limiting
    requests_per_minute: u32!,
    respectful_delay_ms: u32!,

    // Methods
    fn fetch_treaties() → Result<[RawTreaty], FetchError>;
    fn fetch_treaty(id: string) → Result<RawTreaty, FetchError>;
    fn fetch_tribes() → Result<[RawTribe], FetchError>;
    fn search(query: string) → Result<[SearchHit], FetchError>;

    // Metadata
    fn last_updated() → Date?;
    fn coverage() → Coverage;
}

Coverage {
    treaties_count: u64?,
    tribes_count: u64?,
    date_range: (Date, Date)?,
    geographic_scope: string?,
}
```

### 4.3 Kappler Scraper (Primary Treaty Source)

```
// Charles J. Kappler's "Indian Affairs: Laws and Treaties"
// The definitive compilation of US-Indian treaties

KapplerAdapter : SourceAdapter {
    source_id: "kappler"!,
    source_name: "Kappler's Indian Affairs: Laws and Treaties"!,
    base_url: "https://oklegal.onenet.net/kappler/"!,

    // Structure: Volume II contains treaties
    // Each treaty has: title, date, parties, articles, signatures

    fn fetch_treaty_index() → Result<[TreatyIndexEntry], FetchError> {
        // Parse: /kappler/Vol2/Htm/V2Treatie.htm
        // Extract: treaty names, dates, page numbers
    }

    fn fetch_treaty_text(page: u32) → Result<TreatyDocument, FetchError> {
        // Parse: /kappler/Vol2/treaties/{page}.htm
        // Extract: preamble, articles, signatures, ratification
    }

    fn parse_treaty_document(html: string) → TreatyDocument {
        // Extract structured data from HTML
        // - Treaty title
        // - Date signed
        // - Date ratified
        // - Tribal parties
        // - US commissioners
        // - Article text
        // - Signatory names
    }
}

TreatyDocument {
    kappler_page: u32!,
    title: string!,
    date_signed: Date~,
    date_ratified: Date?,
    date_proclaimed: Date?,

    tribal_parties: [string]~,
    us_commissioners: [string]~,

    preamble: string~,
    articles: [Article]~,
    signatures: [Signature]~,

    statutes_at_large_citation: string?,

    raw_html: string!,           // Preserve original
    fetch_timestamp: DateTime!,
}
```

### 4.4 BIA Scraper (Tribal Recognition)

```
BIAAdapter : SourceAdapter {
    source_id: "bia"!,
    source_name: "Bureau of Indian Affairs"!,
    base_url: "https://www.bia.gov/"!,

    fn fetch_recognized_tribes() → Result<[RecognizedTribe], FetchError> {
        // Parse: /service/tribal-leaders-directory
        // Extract: federally recognized tribes, contact info
    }

    fn fetch_reservation_data() → Result<[Reservation], FetchError> {
        // Parse: /regional-offices/*/tribes
        // Extract: reservation names, locations, trust land status
    }
}

RecognizedTribe {
    bia_id: string!,
    name: string!,
    alternate_names: [string]~,
    region: BIARegion!,
    headquarters: Address?,
    leader: string?,
    contact: ContactInfo?,

    fetch_timestamp: DateTime!,
}
```

### 4.5 National Archives API Client

```
NARAAdapter : SourceAdapter {
    source_id: "nara"!,
    source_name: "National Archives and Records Administration"!,
    base_url: "https://catalog.archives.gov/api/v1/"!,

    // NARA has a real API
    fn search_treaties(query: SearchQuery) → Result<[ArchiveRecord], FetchError> {
        // API: /search?q={query}&type=item
        // Filter: Record Group 11 (Indian Treaties)
    }

    fn fetch_document(nara_id: string) → Result<ArchiveDocument, FetchError> {
        // API: /items/{id}
        // Returns: metadata, digital object links
    }

    fn fetch_digital_object(object_id: string) → Result<DigitalObject, FetchError> {
        // Download: treaty scans, maps
    }
}

ArchiveRecord {
    nara_id: string!,
    title: string!,
    record_group: string!,
    series: string?,

    date_range: (Date?, Date?)~,
    description: string~,

    digital_objects: [DigitalObjectRef]?,

    fetch_timestamp: DateTime!,
}
```

---

## 5. Data Normalization

### 5.1 Name Normalization

Tribal names appear in many forms across sources:

```
// Example: Cherokee variations
"Cherokee"
"Cherokee Nation"
"Cherokee Indians"
"The Cherokee Nation"
"Eastern Band of Cherokee Indians"
"United Keetoowah Band of Cherokee Indians"
"Cherokee Nation of Oklahoma"

// Normalization approach
TribeNameNormalizer {
    canonical_name: string!,
    alternate_names: [string]!,

    fn normalize(input: string) → string? {
        // Fuzzy match against known names
        // Return canonical or None if no match
    }

    fn is_same_tribe(a: string, b: string) → Confidence {
        // Determine if two names refer to same tribe
        // Return confidence level
    }
}
```

### 5.2 Date Normalization

Historical dates have various formats and precision:

```
DateNormalizer {
    fn parse(input: string) → ParsedDate? {
        // Handle: "July 4, 1776", "4 July 1776", "1776-07-04"
        // Handle: "Summer 1830", "circa 1820", "1820s"
    }
}

ParsedDate {
    year: i32!,
    month: u8?,
    day: u8?,
    precision: DatePrecision!,
    original_text: string!,
}

DatePrecision: enum {
    Exact,           // Full date known
    MonthYear,       // Day unknown
    Year,            // Only year known
    Decade,          // "1820s"
    Approximate,     // "circa 1820"
    Range,           // "1820-1825"
}
```

### 5.3 Geographic Normalization

Treaty boundary descriptions to modern coordinates:

```
// Historical: "beginning at the mouth of the Kansas River..."
// Modern: GeoJSON polygon

BoundaryNormalizer {
    fn parse_metes_bounds(description: string) → Polygon? {
        // Parse historical land descriptions
        // This is HARD - many require manual research
        // Flag for human review
    }

    fn match_to_modern(historical: Polygon, modern_boundaries: [Boundary]) → Match? {
        // Attempt to match historical description to modern boundaries
        // Reservation boundaries, county lines, etc.
    }
}
```

---

## 6. Validation Rules

### 6.1 Treaty Validation

```
validate_treaty(treaty: RawTreaty) → ValidationResult {
    errors: []
    warnings: []

    // Required fields
    if treaty.title.is_empty():
        errors.push(MissingRequired("title"))

    if treaty.date_signed.is_none():
        warnings.push(MissingRecommended("date_signed"))

    // Date sanity
    if treaty.date_signed > treaty.date_ratified:
        errors.push(InvalidSequence("signed after ratified"))

    // Cross-reference
    if treaty.kappler_page.is_some():
        if !kappler_page_exists(treaty.kappler_page):
            errors.push(InvalidReference("kappler_page"))

    // Tribal parties
    for party in treaty.tribal_parties:
        if !normalize_tribe_name(party).is_some():
            warnings.push(UnknownTribe(party))

    return ValidationResult { errors, warnings }
}
```

### 6.2 Cross-Reference Validation

```
cross_reference_treaty(treaty: Treaty, sources: [DataSource]) → CrossRefResult {
    // Check if treaty appears in multiple sources
    matches: []

    for source in sources:
        if match = source.find_treaty(treaty.name, treaty.date_signed):
            matches.push({
                source: source,
                confidence: calculate_match_confidence(treaty, match),
                differences: find_differences(treaty, match),
            })

    return CrossRefResult {
        source_count: len(matches),
        high_confidence_matches: matches.filter(m => m.confidence > 0.9),
        conflicts: extract_conflicts(matches),
    }
}
```

---

## 7. Human Review Queue

Not everything can be automated. The system queues items for human review:

### 7.1 Review Triggers

| Trigger | Reason |
|---------|--------|
| New treaty discovered | Verify authenticity |
| Source conflict | Resolve discrepancy |
| Low confidence match | Confirm identity |
| Unknown tribal name | Research and normalize |
| Geographic ambiguity | Manual boundary research |
| Missing required field | Attempt to source |

### 7.2 Review Interface

```
ReviewItem {
    id: ReviewId!,
    item_type: EntityType!,
    item_data: any~,

    trigger: ReviewTrigger!,
    priority: Priority!,

    sources_consulted: [DataSource]~,
    conflicts: [ConflictRecord]?,

    status: ReviewStatus!,
    assigned_to: UserId?,

    resolution: Resolution?,
    resolution_notes: string?,
    resolved_by: UserId?,
    resolved_at: DateTime?,
}

ReviewStatus: enum {
    Pending,
    InProgress,
    NeedsMoreResearch,
    Resolved,
    Deferred,
}
```

---

## 8. Provenance Chain

Every data point maintains full provenance:

```
ProvenanceChain {
    entity_id: EntityId!,
    field: string!,

    chain: [
        {
            source: DataSource!,
            value: any!,
            extracted_at: DateTime!,
            extractor_version: string!,

            // For transformed data
            derived_from: [ProvenanceRef]?,
            transformation: string?,
        }
    ]!,

    current_value: any!,
    confidence: Confidence!,
}

// Example chain for a treaty date:
// 1. Scraped from Kappler: "July 4, 1805"
// 2. Normalized to: 1805-07-04
// 3. Cross-referenced with NARA: confirmed
// 4. Final value: 1805-07-04 (Verified!)
```

---

## 9. Respectful Scraping

### 9.1 Ethical Guidelines

```
ScrapingEthics {
    // Respect robots.txt
    honor_robots_txt: true!,

    // Rate limiting
    min_delay_between_requests_ms: 1000!,
    max_concurrent_requests: 2!,

    // Identification
    user_agent: "Windwalker/1.0 (Native Treaty Mapping Initiative; contact@windwalker.org)"!,

    // Caching
    cache_duration_hours: 24!,    // Don't re-scrape constantly

    // Hours of operation (avoid peak times)
    preferred_hours_utc: (2, 8)!, // 2 AM - 8 AM UTC
}
```

### 9.2 Source-Specific Rules

| Source | Special Considerations |
|--------|------------------------|
| **NARA** | Has official API - prefer API over scraping |
| **BIA** | Government site - be respectful of bandwidth |
| **Kappler** | Academic resource - cache aggressively |
| **Tribal sites** | Contact tribe before bulk scraping |

---

## 10. Implementation Phases

### Phase 1: Kappler Foundation ❌
- [ ] Kappler treaty index scraper
- [ ] Treaty text parser
- [ ] Basic normalization
- [ ] Staging database schema

### Phase 2: Cross-Reference ❌
- [ ] NARA API integration
- [ ] BIA tribal data scraper
- [ ] Cross-reference validator
- [ ] Conflict detection

### Phase 3: Human Review ❌
- [ ] Review queue interface
- [ ] Resolution workflow
- [ ] Provenance tracking

### Phase 4: Continuous Updates ❌
- [ ] Change detection
- [ ] Incremental updates
- [ ] Staleness monitoring

---

## 11. Open Questions

1. **Kappler OCR quality:** The online Kappler is OCR'd - how much manual correction is needed?

2. **Tribal consent:** Should we contact tribal nations before including their data?
   - Recommendation: Yes, at minimum for self-identification data

3. **Copyright:** Kappler is public domain, but what about modern BIA content?

4. **API access:** Can we get official API access to BIA/DOI data?

5. **Boundary data:** Where do we source actual treaty boundary polygons?
   - Kappler has text descriptions, not coordinates
   - Need to research digitized boundary sources

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-02-11 | Initial draft. Source registry, scraping architecture, validation rules. |
