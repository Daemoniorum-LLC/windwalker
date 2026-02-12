# Windwalker Screenshots

Screenshots captured February 12, 2026, demonstrating the Windwalker Native Treaty Mapping Initiative.

## Views

| Screenshot | Description |
|------------|-------------|
| `01-homepage-map.png` | Main map view with 833 treaty boundaries from Native-Land.ca |
| `02-treaty-sidebar.png` | Treaty browser sidebar showing 778 treaties from Kappler |
| `03-treaty-detail.png` | Detail panel when a treaty is selected |
| `04-timeline-1779-first-treaties.png` | Timeline at 1779 showing only the first 2 treaties (Delawares, 1778) |
| `06-filter-active.png` | Treaties filtered by "Active" status |
| `07-search-cherokee.png` | Search results for "Cherokee" |
| `08-treaties-page.png` | Full treaties grid page |
| `09-tribes-page.png` | Tribal Nations page |
| `10-about-page.png` | About page with project information |

## Data Sources

- **Treaty list**: 778 treaties scraped from Kappler's Indian Affairs: Laws and Treaties via Oklahoma State University's digital archive
- **Treaty boundaries**: 833 boundaries from Native-Land.ca API
- **Timeline**: 1778 (Treaty of Fort Pitt) to 1871 (Indian Appropriations Act ended treaty-making)

## Regenerating Screenshots

```bash
npx playwright test screenshots.spec.js
```
