/**
 * Windwalker Frontend Application
 *
 * JavaScript implementation for demo purposes.
 * The full app will be built with Qliphoth/WASM.
 */

const API_BASE = '/api/v1';

// ============================================================================
// State
// ============================================================================

const state = {
    treaties: [],
    tribes: [],
    selectedTreaty: null,
    searchQuery: '',
    statusFilter: '',
    currentView: 'map',  // 'map', 'treaties', 'tribes', 'about'
    loading: true,
    sidebarOpen: true,
    detailPanelOpen: false,
};

// ============================================================================
// Router
// ============================================================================

function navigate(path) {
    history.pushState({}, '', path);
    handleRoute();
}

function handleRoute() {
    const path = window.location.pathname;

    if (path === '/' || path === '/map') {
        state.currentView = 'map';
    } else if (path === '/treaties') {
        state.currentView = 'treaties';
    } else if (path === '/tribes') {
        state.currentView = 'tribes';
    } else if (path === '/about') {
        state.currentView = 'about';
    } else {
        state.currentView = 'map';
    }

    renderApp();
    updateActiveNav();
}

function updateActiveNav() {
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = (href === '/' && state.currentView === 'map') ||
                         (href === '/' + state.currentView);
        link.classList.toggle('active', isActive);
    });
}

// Handle browser back/forward
window.addEventListener('popstate', handleRoute);

// ============================================================================
// API Calls
// ============================================================================

async function fetchTreaties(yearEnd = null) {
    try {
        let url = `${API_BASE}/treaties`;
        if (yearEnd) {
            url += `?year_end=${yearEnd}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        state.treaties = data.treaties || [];

        // Update the appropriate view
        if (state.currentView === 'map') {
            renderTreatyList();
            updateTreatyCount();
        } else if (state.currentView === 'treaties' || state.currentView === 'tribes') {
            // Re-render page content for views that depend on treaty data
            const mapContainer = document.querySelector('.map-explorer');
            if (mapContainer) {
                mapContainer.innerHTML = renderViewContent();
            }
        }
    } catch (err) {
        console.error('Failed to fetch treaties:', err);
    }
}

function updateTreatyCount() {
    const countEl = document.getElementById('treaty-count');
    if (countEl) {
        countEl.textContent = `${state.treaties.length} treaties`;
    }
}

async function fetchTreaty(id) {
    try {
        const res = await fetch(`${API_BASE}/treaties/${id}`);
        const data = await res.json();
        state.selectedTreaty = data;
        state.detailPanelOpen = true;
        renderDetailPanel();
    } catch (err) {
        console.error('Failed to fetch treaty:', err);
    }
}

async function search(query) {
    if (!query || query.length < 2) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        renderSearchResults(data.results || []);
    } catch (err) {
        console.error('Search failed:', err);
    }
}

// ============================================================================
// Rendering
// ============================================================================

function renderApp() {
    document.getElementById('app').innerHTML = `
        <div class="windwalker-app">
            <header class="app-header">
                <div class="header-brand">
                    <a href="/" class="brand-link">
                        <span class="brand-icon">W</span>
                        <span class="brand-title">Windwalker</span>
                    </a>
                    <span class="brand-subtitle">Native Treaty Mapping Initiative</span>
                </div>
                <nav class="header-nav">
                    <a href="/" class="nav-link" onclick="event.preventDefault(); navigate('/')">Map</a>
                    <a href="/treaties" class="nav-link" onclick="event.preventDefault(); navigate('/treaties')">Treaties</a>
                    <a href="/tribes" class="nav-link" onclick="event.preventDefault(); navigate('/tribes')">Tribal Nations</a>
                    <a href="/about" class="nav-link" onclick="event.preventDefault(); navigate('/about')">About</a>
                </nav>
            </header>

            <div class="app-content">
                <div class="sidebar" id="sidebar">
                    <div class="search-panel">
                        <div class="search-input-wrapper">
                            <span class="search-icon">&#x1F50D;</span>
                            <input type="text" class="search-input"
                                   placeholder="Search treaties, tribes..."
                                   id="search-input"
                                   oninput="handleSearch(this.value)">
                        </div>
                        <div id="search-results" class="search-results"></div>
                    </div>

                    <div class="treaty-browser" id="treaty-browser">
                        <div class="browser-header">
                            <h3>Treaties</h3>
                            <div class="filter-row">
                                <select class="filter-select" onchange="filterByStatus(this.value)">
                                    <option value="">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Violated">Violated</option>
                                    <option value="Unknown">Unknown</option>
                                </select>
                            </div>
                        </div>
                        <div class="treaty-list" id="treaty-list">
                            <div class="loading-state">
                                <div class="spinner"></div>
                                <span>Loading treaties...</span>
                            </div>
                        </div>
                        <div class="browser-footer" id="treaty-count">
                            Loading...
                        </div>
                    </div>
                </div>

                <div class="map-container">
                    <div class="map-explorer">
                        <div id="windwalker-map" class="map-canvas"></div>

                        <div class="map-controls">
                            <div class="zoom-controls">
                                <button class="control-btn" onclick="map.zoomIn()">+</button>
                                <button class="control-btn" onclick="map.zoomOut()">−</button>
                            </div>
                        </div>

                        <div class="map-legend">
                            <h4>Treaty Status</h4>
                            <div class="legend-item">
                                <span class="legend-color" style="background: #2d5a27"></span>
                                <span>Active</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: #8b2323"></span>
                                <span>Violated</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-color" style="background: #555555"></span>
                                <span>Unknown</span>
                            </div>
                            <h4>Boundary Certainty</h4>
                            <div class="legend-item">
                                <span class="legend-line solid"></span>
                                <span>Verified</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-line dashed"></span>
                                <span>Uncertain</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="detail-panel" id="detail-panel" style="display: none;">
                </div>
            </div>

            <div class="temporal-slider">
                <div class="year-display">
                    <span class="current-year" id="current-year">1871</span>
                    <span class="present-indicator" title="Congress ended treaty-making with tribes in 1871">(End of Treaty Era)</span>
                </div>
                <div class="slider-container">
                    <input type="range" class="year-slider" id="year-slider"
                           min="1778" max="1871" value="1871"
                           oninput="handleYearChange(this.value)">
                    <div class="slider-labels">
                        <span class="label-min">1778</span>
                        <span class="label-max">1871</span>
                    </div>
                </div>
                <div class="playback-controls">
                    <button class="control-btn" onclick="stepYear(-1)">&lt;</button>
                    <button class="control-btn play-btn" id="play-btn" onclick="togglePlay()">&#9654;</button>
                    <button class="control-btn" onclick="stepYear(1)">&gt;</button>
                    <button class="control-btn reset-btn" onclick="resetYear()">Reset</button>
                </div>
            </div>
        </div>
    `;

    // Initialize based on current view
    if (state.currentView === 'map') {
        initMap();
        document.getElementById('sidebar').style.display = '';
    } else {
        // Hide sidebar for non-map views
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.style.display = 'none';

        // Replace map with view content
        const mapContainer = document.querySelector('.map-explorer');
        if (mapContainer) {
            mapContainer.innerHTML = renderViewContent();
        }
    }
}

function renderViewContent() {
    switch (state.currentView) {
        case 'treaties':
            return renderTreatiesPage();
        case 'tribes':
            return renderTribesPage();
        case 'about':
            return renderAboutPage();
        default:
            return '';
    }
}

function renderTreatiesPage() {
    return `
        <div class="page-content">
            <h1>All Treaties</h1>
            <p class="page-description">Browse all ${state.treaties.length} treaties in the database, from the Treaty with the Delawares (1778) to the Agreement with the Sioux (1883).</p>
            <div class="treaty-grid" id="treaties-page-list">
                ${state.treaties.map(treaty => `
                    <div class="treaty-card" onclick="selectTreaty('${treaty.id}'); navigate('/');">
                        <h3>${treaty.name}</h3>
                        <p class="treaty-date">${treaty.signed_date || 'Date unknown'}</p>
                        <div class="treaty-tribes-mini">
                            ${(treaty.tribes || []).slice(0, 2).map(t => `<span class="tribe-tag">${t.name}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderTribesPage() {
    // Extract unique tribes from treaties
    const tribeMap = new Map();
    state.treaties.forEach(treaty => {
        (treaty.tribes || []).forEach(tribe => {
            if (!tribeMap.has(tribe.name)) {
                tribeMap.set(tribe.name, { name: tribe.name, treatyCount: 0 });
            }
            tribeMap.get(tribe.name).treatyCount++;
        });
    });
    const tribes = Array.from(tribeMap.values()).sort((a, b) => b.treatyCount - a.treatyCount);

    return `
        <div class="page-content">
            <h1>Tribal Nations</h1>
            <p class="page-description">Browse ${tribes.length} tribal nations mentioned in the treaty database.</p>
            <div class="tribe-grid">
                ${tribes.map(tribe => `
                    <div class="tribe-card">
                        <h3>${tribe.name}</h3>
                        <p>${tribe.treatyCount} ${tribe.treatyCount === 1 ? 'treaty' : 'treaties'}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderAboutPage() {
    return `
        <div class="page-content about-page">
            <h1>About Windwalker</h1>
            <p class="lead">The Native Treaty Mapping Initiative aims to make the history of treaties between the United States and Indigenous peoples accessible, searchable, and understandable.</p>

            <h2>Our Mission</h2>
            <p>To preserve and present the documentary record of treaty relationships between sovereign Indigenous nations and the United States government, making this crucial history accessible to researchers, educators, tribal members, and the general public.</p>

            <h2>Data Sources</h2>
            <ul>
                <li><strong>Kappler's Indian Affairs: Laws and Treaties</strong> - The authoritative compilation of treaties published by the Government Printing Office, digitized by Oklahoma State University</li>
                <li><strong>National Archives (NARA)</strong> - Original treaty documents and related records</li>
                <li><strong>Bureau of Indian Affairs</strong> - Tribal recognition and contemporary legal status</li>
            </ul>

            <h2>Evidentiality</h2>
            <p>We use evidentiality markers to indicate the certainty and source of information:</p>
            <ul>
                <li><span class="evidentiality-badge ev-verified">!</span> <strong>Verified</strong> - Cross-referenced from multiple authoritative sources</li>
                <li><span class="evidentiality-badge ev-reported">~</span> <strong>Reported</strong> - From a single authoritative source</li>
                <li><span class="evidentiality-badge ev-uncertain">?</span> <strong>Uncertain</strong> - Requires additional verification</li>
            </ul>

            <h2>Contact</h2>
            <p>This project was created for Jim Windwalker and other researchers documenting the history of Native American treaty rights.</p>
        </div>
    `;
}

function renderTreatyList() {
    const container = document.getElementById('treaty-list');
    const countEl = document.getElementById('treaty-count');

    // Elements might not exist on non-map views
    if (!container) return;

    // Apply status filter
    let filteredTreaties = state.treaties;
    if (state.statusFilter) {
        filteredTreaties = state.treaties.filter(t => t.status === state.statusFilter);
    }

    if (filteredTreaties.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No treaties found${state.statusFilter ? ' with status "' + state.statusFilter + '"' : ''}.</p>
            </div>
        `;
        if (countEl) countEl.textContent = '0 treaties';
        return;
    }

    if (countEl) countEl.textContent = `${filteredTreaties.length} treaties`;

    container.innerHTML = filteredTreaties.map(treaty => `
        <div class="treaty-item ${state.selectedTreaty?.id === treaty.id ? 'selected' : ''} status-${treaty.status.toLowerCase()}"
             onclick="selectTreaty('${treaty.id}')">
            <div class="treaty-name">
                <span>${treaty.name}</span>
                <span class="evidentiality-badge ev-${treaty.certainty.toLowerCase()}"
                      title="${treaty.certainty}">
                    ${treaty.certainty === 'Verified' ? '!' : '~'}
                </span>
            </div>
            <div class="treaty-date">
                <span class="label">Signed: </span>
                <span>${treaty.signed_date || 'Unknown'}</span>
            </div>
            <div class="treaty-tribes">
                ${(treaty.tribes || []).slice(0, 3).map(t =>
                    `<span class="tribe-tag">${t.name}</span>`
                ).join('')}
                ${treaty.tribes?.length > 3 ? `<span class="tribe-more">+${treaty.tribes.length - 3} more</span>` : ''}
            </div>
            <div class="treaty-status">
                <span class="status-badge status-${treaty.status.toLowerCase()}">${treaty.status}</span>
            </div>
        </div>
    `).join('');

    countEl.textContent = `${state.treaties.length} treaties`;
}

function renderDetailPanel() {
    const panel = document.getElementById('detail-panel');
    const treaty = state.selectedTreaty;

    if (!treaty) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'flex';
    panel.innerHTML = `
        <div class="panel-header">
            <button class="close-btn" onclick="closeDetailPanel()">×</button>
            <h2>${treaty.name}</h2>
            <span class="evidentiality-badge ev-${treaty.boundary_certainty.toLowerCase()}">
                ${treaty.boundary_certainty === 'Verified' ? '!' : '~'}
            </span>
        </div>

        <div class="panel-tabs">
            <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
            <button class="tab-btn" onclick="switchTab('parties')">Parties</button>
            <button class="tab-btn" onclick="switchTab('text')">Text</button>
            <button class="tab-btn" onclick="switchTab('sources')">Sources</button>
        </div>

        <div class="panel-content">
            <div id="tab-content">
                ${renderOverviewTab(treaty)}
            </div>
        </div>
    `;
}

function renderOverviewTab(treaty) {
    return `
        <div class="tab-content overview">
            <div class="info-section">
                <h4>Status</h4>
                <div class="status-badge status-${treaty.status.toLowerCase()}">${treaty.status}</div>
            </div>

            <div class="info-section">
                <h4>Key Dates</h4>
                <dl class="date-list">
                    ${treaty.signed_date ? `<dt>Signed</dt><dd>${treaty.signed_date}</dd>` : ''}
                    ${treaty.ratified_date ? `<dt>Ratified</dt><dd>${treaty.ratified_date}</dd>` : ''}
                </dl>
            </div>

            <div class="info-section">
                <h4>Tribal Nations</h4>
                <div class="tribe-list">
                    ${(treaty.tribes || []).map(t =>
                        `<a class="tribe-link" href="/tribes/${t.id}">${t.name}</a>`
                    ).join('')}
                </div>
            </div>

            <div class="info-section">
                <h4>Citations</h4>
                ${treaty.kappler_citation ? `<p>Kappler: ${treaty.kappler_citation}</p>` : ''}
                ${treaty.statutes_at_large ? `<p>Statutes at Large: ${treaty.statutes_at_large}</p>` : ''}
            </div>
        </div>
    `;
}

function renderPartiesTab(treaty) {
    return `
        <div class="tab-content parties">
            <div class="party-section">
                <h4>US Commissioners</h4>
                <ul class="commissioner-list">
                    ${(treaty.us_commissioners || []).map(name => `<li>${name}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderTextTab(treaty) {
    return `
        <div class="tab-content text">
            ${treaty.preamble ? `
                <div class="treaty-preamble">
                    <h4>Preamble</h4>
                    <p>${treaty.preamble}</p>
                </div>
            ` : ''}
            <div class="treaty-articles">
                <h4>Articles</h4>
                ${(treaty.articles || []).map(article => `
                    <div class="article">
                        <h5>Article ${article.number}</h5>
                        <p>${article.text}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSourcesTab(treaty) {
    return `
        <div class="tab-content sources">
            <div class="evidentiality-legend">
                <button class="legend-toggle" onclick="this.classList.toggle('open')">
                    <span>Data Certainty Guide</span>
                    <span class="toggle-icon">▶</span>
                </button>
            </div>
            <h4>Data Sources</h4>
            <div class="source-list">
                ${(treaty.sources || []).map(source => `
                    <div class="source-card">
                        <div class="source-header">
                            <span class="source-name">${source.name}</span>
                            <span class="source-type">${source.source_type}</span>
                        </div>
                        <div class="source-reliability">
                            <span>Reliability: </span>
                            <div class="reliability-bar">
                                <div class="reliability-fill" style="width: ${source.reliability * 100}%"></div>
                            </div>
                            <span>${Math.round(source.reliability * 100)}%</span>
                        </div>
                        ${source.url ? `<a class="source-link" href="${source.url}" target="_blank">View Source</a>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderSearchResults(results) {
    const container = document.getElementById('search-results');

    if (results.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = results.map(result => `
        <div class="search-result-item" onclick="handleResultClick('${result.entity_type}', '${result.id}')">
            <span class="result-type type-${result.entity_type}">${result.entity_type}</span>
            <div class="result-content">
                <span class="result-title">${result.title}</span>
            </div>
        </div>
    `).join('');
}

// ============================================================================
// Event Handlers
// ============================================================================

function selectTreaty(id) {
    fetchTreaty(id);
}

function closeDetailPanel() {
    state.selectedTreaty = null;
    state.detailPanelOpen = false;
    document.getElementById('detail-panel').style.display = 'none';
    renderTreatyList();
}

function switchTab(tab) {
    const treaty = state.selectedTreaty;
    if (!treaty) return;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Render tab content
    const content = document.getElementById('tab-content');
    switch (tab) {
        case 'overview':
            content.innerHTML = renderOverviewTab(treaty);
            break;
        case 'parties':
            content.innerHTML = renderPartiesTab(treaty);
            break;
        case 'text':
            content.innerHTML = renderTextTab(treaty);
            break;
        case 'sources':
            content.innerHTML = renderSourcesTab(treaty);
            break;
    }
}

let searchTimeout;
function handleSearch(query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => search(query), 300);
}

function handleResultClick(type, id) {
    if (type === 'treaty') {
        selectTreaty(id);
    }
    document.getElementById('search-results').innerHTML = '';
    document.getElementById('search-input').value = '';
}

function handleYearChange(year) {
    document.getElementById('current-year').textContent = year;
    // Filter treaties by year (sidebar list)
    fetchTreaties(year);
    // Filter map boundaries by year
    filterBoundariesByYear(parseInt(year));
}

function stepYear(delta) {
    const slider = document.getElementById('year-slider');
    const newYear = Math.min(1871, Math.max(1778, parseInt(slider.value) + delta));
    slider.value = newYear;
    handleYearChange(newYear);
}

let playing = false;
let playInterval;
function togglePlay() {
    playing = !playing;
    const btn = document.getElementById('play-btn');

    if (playing) {
        btn.innerHTML = '⏸';
        btn.classList.add('playing');
        playInterval = setInterval(() => {
            const slider = document.getElementById('year-slider');
            if (parseInt(slider.value) >= 1871) {
                togglePlay();
                return;
            }
            stepYear(1);
        }, 500);
    } else {
        btn.innerHTML = '▶';
        btn.classList.remove('playing');
        clearInterval(playInterval);
    }
}

function resetYear() {
    if (playing) togglePlay();
    document.getElementById('year-slider').value = 1871;
    handleYearChange(1871);
}

function filterByStatus(status) {
    state.statusFilter = status;
    renderTreatyList();
}

// ============================================================================
// Map
// ============================================================================

let map;
let boundariesGeoJSON = null;  // Store full boundaries data for filtering

// Extract year from treaty name (e.g., "Fort Bridger Treaty, 1868" -> 1868)
function extractYearFromName(name) {
    const match = name.match(/\b(1[7-9]\d{2})\b/);
    return match ? parseInt(match[1]) : null;
}

// Filter boundaries by year and update map
function filterBoundariesByYear(maxYear) {
    if (!boundariesGeoJSON || !map.getSource('treaty-boundaries')) return;

    const filtered = {
        type: 'FeatureCollection',
        features: boundariesGeoJSON.features.filter(feature => {
            const year = extractYearFromName(feature.properties.Name || '');
            // At max year (1871), show all boundaries
            if (maxYear >= 1871) return true;
            // Otherwise, only show boundaries with confirmed year <= maxYear
            return year !== null && year <= maxYear;
        })
    };

    map.getSource('treaty-boundaries').setData(filtered);
}

async function loadTreatyBoundaries() {
    try {
        const res = await fetch(`${API_BASE}/boundaries`);
        const geojson = await res.json();

        if (geojson.error) {
            console.error('Boundaries error:', geojson.error);
            return;
        }

        // Store full data for filtering
        boundariesGeoJSON = geojson;

        // Add the GeoJSON source
        map.addSource('treaty-boundaries', {
            type: 'geojson',
            data: geojson
        });

        // Add fill layer (semi-transparent polygons)
        map.addLayer({
            id: 'treaty-boundaries-fill',
            type: 'fill',
            source: 'treaty-boundaries',
            paint: {
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.3
            }
        });

        // Add outline layer
        map.addLayer({
            id: 'treaty-boundaries-outline',
            type: 'line',
            source: 'treaty-boundaries',
            paint: {
                'line-color': ['get', 'color'],
                'line-width': 2,
                'line-opacity': 0.8
            }
        });

        // Add click interaction for boundaries
        map.on('click', 'treaty-boundaries-fill', (e) => {
            if (e.features.length > 0) {
                const feature = e.features[0];
                const props = feature.properties;

                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div class="boundary-popup">
                            <strong>${props.Name}</strong>
                            <p><a href="${props.description}" target="_blank">View on Native-Land.ca</a></p>
                        </div>
                    `)
                    .addTo(map);
            }
        });

        // Change cursor on hover
        map.on('mouseenter', 'treaty-boundaries-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'treaty-boundaries-fill', () => {
            map.getCanvas().style.cursor = '';
        });

        console.log(`Loaded ${geojson.features.length} treaty boundaries`);
    } catch (err) {
        console.error('Failed to load treaty boundaries:', err);
    }
}

function initMap() {
    // Use CartoDB's free basemap tiles (more reliable than demo tiles)
    const style = {
        version: 8,
        sources: {
            'carto-light': {
                type: 'raster',
                tiles: [
                    'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                    'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }
        },
        layers: [{
            id: 'carto-light-layer',
            type: 'raster',
            source: 'carto-light',
            minzoom: 0,
            maxzoom: 22
        }]
    };

    try {
        map = new maplibregl.Map({
            container: 'windwalker-map',
            style: style,
            center: [-98.5795, 39.8283],
            zoom: 4
        });

        map.on('load', () => {
            console.log('Map loaded successfully');
            loadTreatyBoundaries();
        });

        map.on('error', (e) => {
            console.error('Map error:', e);
        });

        map.addControl(new maplibregl.NavigationControl(), 'top-right');
    } catch (err) {
        console.error('Failed to initialize map:', err);
        document.getElementById('windwalker-map').innerHTML =
            '<div style="padding: 2rem; text-align: center; color: #666;">Map failed to load. Please refresh the page.</div>';
    }
}

// ============================================================================
// Initialize
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Determine initial view from URL
    const path = window.location.pathname;
    if (path === '/' || path === '/map') {
        state.currentView = 'map';
    } else if (path === '/treaties') {
        state.currentView = 'treaties';
    } else if (path === '/tribes') {
        state.currentView = 'tribes';
    } else if (path === '/about') {
        state.currentView = 'about';
    }

    // Render app first to create DOM structure
    renderApp();
    updateActiveNav();

    // Then fetch data (will populate the existing DOM elements)
    await fetchTreaties();
});
