/**
 * MapLibre Bridge
 *
 * JavaScript bridge between Windwalker WASM and MapLibre GL JS.
 * Provides functions that can be called from WebAssembly to control the map.
 */

// Map instance registry
const maps = new Map();
let nextMapId = 1;

/**
 * Creates a new MapLibre map instance
 * @param {Object} options - Map options
 * @returns {number} Map handle ID
 */
export function createMap(options) {
    const id = nextMapId++;

    const map = new maplibregl.Map({
        container: options.container,
        style: options.style,
        center: options.center,
        zoom: options.zoom,
        minZoom: options.minZoom || 0,
        maxZoom: options.maxZoom || 22,
        attributionControl: true,
    });

    maps.set(id, {
        map,
        callbacks: new Map(),
    });

    return id;
}

/**
 * Destroys a map instance
 * @param {number} handle - Map handle ID
 */
export function destroyMap(handle) {
    const entry = maps.get(handle);
    if (entry) {
        entry.map.remove();
        maps.delete(handle);
    }
}

/**
 * Checks if map is loaded
 * @param {number} handle - Map handle ID
 * @returns {boolean}
 */
export function isMapLoaded(handle) {
    const entry = maps.get(handle);
    return entry ? entry.map.loaded() : false;
}

// ============================================================================
// Sources and Layers
// ============================================================================

/**
 * Adds a source to the map
 * @param {number} handle - Map handle ID
 * @param {string} id - Source ID
 * @param {Object} config - Source configuration
 */
export function addSource(handle, id, config) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.addSource(id, config);
}

/**
 * Removes a source from the map
 * @param {number} handle - Map handle ID
 * @param {string} id - Source ID
 */
export function removeSource(handle, id) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.removeSource(id);
}

/**
 * Adds a layer to the map
 * @param {number} handle - Map handle ID
 * @param {Object} layerDef - Layer definition
 */
export function addLayer(handle, layerDef) {
    const entry = maps.get(handle);
    if (!entry) return;

    const layer = {
        id: layerDef.id,
        type: layerDef.layer_type || layerDef.type,
        source: layerDef.source,
    };

    if (layerDef.source_layer) {
        layer['source-layer'] = layerDef.source_layer;
    }

    if (layerDef.paint) {
        layer.paint = layerDef.paint;
    }

    if (layerDef.layout) {
        layer.layout = layerDef.layout;
    }

    if (layerDef.filter) {
        layer.filter = layerDef.filter;
    }

    if (layerDef.min_zoom !== undefined) {
        layer.minzoom = layerDef.min_zoom;
    }

    if (layerDef.max_zoom !== undefined) {
        layer.maxzoom = layerDef.max_zoom;
    }

    entry.map.addLayer(layer);
}

/**
 * Removes a layer from the map
 * @param {number} handle - Map handle ID
 * @param {string} id - Layer ID
 */
export function removeLayer(handle, id) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.removeLayer(id);
}

/**
 * Sets layer visibility
 * @param {number} handle - Map handle ID
 * @param {string} id - Layer ID
 * @param {boolean} visible - Visibility state
 */
export function setLayerVisibility(handle, id, visible) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
}

/**
 * Sets a layer paint property
 * @param {number} handle - Map handle ID
 * @param {string} layerId - Layer ID
 * @param {string} property - Property name
 * @param {*} value - Property value
 */
export function setLayerPaint(handle, layerId, property, value) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setPaintProperty(layerId, property, value);
}

/**
 * Sets a layer filter
 * @param {number} handle - Map handle ID
 * @param {string} layerId - Layer ID
 * @param {Array} filter - Filter expression
 */
export function setLayerFilter(handle, layerId, filter) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setFilter(layerId, filter);
}

// ============================================================================
// View Control
// ============================================================================

/**
 * Gets map center
 * @param {number} handle - Map handle ID
 * @returns {Array} [lng, lat]
 */
export function getCenter(handle) {
    const entry = maps.get(handle);
    if (!entry) return [0, 0];

    const center = entry.map.getCenter();
    return [center.lng, center.lat];
}

/**
 * Gets map zoom level
 * @param {number} handle - Map handle ID
 * @returns {number}
 */
export function getZoom(handle) {
    const entry = maps.get(handle);
    return entry ? entry.map.getZoom() : 0;
}

/**
 * Gets map bounds
 * @param {number} handle - Map handle ID
 * @returns {Object} { sw: [lng, lat], ne: [lng, lat] }
 */
export function getBounds(handle) {
    const entry = maps.get(handle);
    if (!entry) return null;

    const bounds = entry.map.getBounds();
    return {
        sw: [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
        ne: [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
    };
}

/**
 * Sets map center
 * @param {number} handle - Map handle ID
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 */
export function setCenter(handle, lng, lat) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setCenter([lng, lat]);
}

/**
 * Sets map zoom
 * @param {number} handle - Map handle ID
 * @param {number} zoom - Zoom level
 */
export function setZoom(handle, zoom) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setZoom(zoom);
}

/**
 * Eases to a location
 * @param {number} handle - Map handle ID
 * @param {Array} center - [lng, lat]
 * @param {number} zoom - Zoom level
 */
export function easeTo(handle, center, zoom) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.easeTo({
        center,
        zoom,
        duration: 500,
    });
}

/**
 * Flies to a location with animation
 * @param {number} handle - Map handle ID
 * @param {Array} center - [lng, lat]
 * @param {number} zoom - Zoom level
 */
export function flyTo(handle, center, zoom) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.flyTo({
        center,
        zoom,
        duration: 2000,
    });
}

/**
 * Fits map to bounds
 * @param {number} handle - Map handle ID
 * @param {Array} bounds - [[sw_lng, sw_lat], [ne_lng, ne_lat]]
 * @param {number} padding - Padding in pixels
 */
export function fitBounds(handle, bounds, padding) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.fitBounds(bounds, { padding });
}

/**
 * Zooms in one level
 * @param {number} handle - Map handle ID
 */
export function zoomIn(handle) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.zoomIn();
}

/**
 * Zooms out one level
 * @param {number} handle - Map handle ID
 */
export function zoomOut(handle) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.zoomOut();
}

// ============================================================================
// Interactivity
// ============================================================================

/**
 * Sets cursor style
 * @param {number} handle - Map handle ID
 * @param {string} cursor - Cursor style
 */
export function setCursor(handle, cursor) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.getCanvas().style.cursor = cursor;
}

/**
 * Sets feature state
 * @param {number} handle - Map handle ID
 * @param {string} source - Source ID
 * @param {string} featureId - Feature ID
 * @param {Object} state - State object
 */
export function setFeatureState(handle, source, featureId, state) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.setFeatureState(
        { source, id: featureId },
        state
    );
}

/**
 * Removes feature state
 * @param {number} handle - Map handle ID
 * @param {string} source - Source ID
 * @param {string} featureId - Feature ID
 */
export function removeFeatureState(handle, source, featureId) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.removeFeatureState({ source, id: featureId });
}

/**
 * Queries rendered features at a point
 * @param {number} handle - Map handle ID
 * @param {Array} point - [x, y] pixel coordinates
 * @param {Object} options - Query options
 * @returns {Array} Features
 */
export function queryRenderedFeatures(handle, point, options) {
    const entry = maps.get(handle);
    if (!entry) return [];

    return entry.map.queryRenderedFeatures(point, options);
}

// ============================================================================
// Events
// ============================================================================

/**
 * Registers load event handler
 * @param {number} handle - Map handle ID
 * @param {Function} callback - Callback function
 */
export function onLoad(handle, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('load', () => {
        callback();
    });
}

/**
 * Registers click event handler for a layer
 * @param {number} handle - Map handle ID
 * @param {string} layerId - Layer ID
 * @param {Function} callback - Callback function
 */
export function onClick(handle, layerId, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('click', layerId, (e) => {
        callback({
            lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
            point: { x: e.point.x, y: e.point.y },
            features: e.features.map(f => ({
                id: f.id,
                source: f.source,
                sourceLayer: f.sourceLayer,
                properties: f.properties,
            })),
        });
    });
}

/**
 * Registers mousemove event handler for a layer
 * @param {number} handle - Map handle ID
 * @param {string} layerId - Layer ID
 * @param {Function} callback - Callback function
 */
export function onMouseMove(handle, layerId, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('mousemove', layerId, (e) => {
        callback({
            lngLat: { lng: e.lngLat.lng, lat: e.lngLat.lat },
            features: e.features.map(f => ({
                id: f.id,
                source: f.source,
                sourceLayer: f.sourceLayer,
                properties: f.properties,
            })),
        });
    });
}

/**
 * Registers mouseleave event handler for a layer
 * @param {number} handle - Map handle ID
 * @param {string} layerId - Layer ID
 * @param {Function} callback - Callback function
 */
export function onMouseLeave(handle, layerId, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('mouseleave', layerId, () => {
        callback({});
    });
}

/**
 * Registers moveend event handler
 * @param {number} handle - Map handle ID
 * @param {Function} callback - Callback function
 */
export function onMoveEnd(handle, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('moveend', () => {
        const center = entry.map.getCenter();
        const zoom = entry.map.getZoom();
        callback({
            center: [center.lng, center.lat],
            zoom,
        });
    });
}

/**
 * Registers zoomend event handler
 * @param {number} handle - Map handle ID
 * @param {Function} callback - Callback function
 */
export function onZoomEnd(handle, callback) {
    const entry = maps.get(handle);
    if (!entry) return;

    entry.map.on('zoomend', () => {
        const zoom = entry.map.getZoom();
        callback({ zoom });
    });
}

// Make functions available globally for WASM imports
window.windwalkerMapBridge = {
    createMap,
    destroyMap,
    isMapLoaded,
    addSource,
    removeSource,
    addLayer,
    removeLayer,
    setLayerVisibility,
    setLayerPaint,
    setLayerFilter,
    getCenter,
    getZoom,
    getBounds,
    setCenter,
    setZoom,
    easeTo,
    flyTo,
    fitBounds,
    zoomIn,
    zoomOut,
    setCursor,
    setFeatureState,
    removeFeatureState,
    queryRenderedFeatures,
    onLoad,
    onClick,
    onMouseMove,
    onMouseLeave,
    onMoveEnd,
    onZoomEnd,
};
