import { state } from './state.js';
import { toast } from './ui.js';
import { loadScript, loadCSS } from './loader.js';
import * as api from './api.js';

let missionUpdateInterval = null;

export function getStatusColor(status) {
    const s = (status || "").toLowerCase();
    const colors = {
        healthy: '#27ae60',   // Green (Good)
        good: '#27ae60',
        growing: '#f1c40f',   // Yellow (Warning)
        warning: '#f1c40f',
        attention: '#e74c3c', // Red (Alert)
        alert: '#e74c3c'
    };
    return colors[s] || '#666';
}

let isInitializing = false;

export async function loadMap() {
    const mapContainer = document.getElementById("farmMap");
    if (!mapContainer) return;

    // Prevent re-initialization
    if (state.mapInstance) {
        setTimeout(() => state.mapInstance.invalidateSize(), 100);
        return;
    }

    // Prevent concurrent loading
    if (isInitializing) return;
    isInitializing = true;

    // Dynamic Loading of Leaflet
    if (typeof L === 'undefined') {
        const loadingToast = document.createElement("div");
        loadingToast.className = "toast";
        loadingToast.textContent = "Loading Map Resources...";
        document.getElementById("toastHost")?.appendChild(loadingToast);

        try {
            await Promise.all([
                loadCSS("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"),
                loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
            ]);

            // Plugins
            await Promise.all([
                loadCSS("https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css"),
                loadScript("https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"),
                loadCSS("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"),
                loadCSS("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"),
                loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"),
                loadScript("https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js")
            ]);

            loadingToast.remove();
            toast("Map resources loaded");

        } catch (e) {
            loadingToast.remove();
            console.error("Failed to load map libraries:", e);
            toast("Failed to load map. Check internet connection.");
            isInitializing = false; // Reset lock on error
            return;
        }
    }

    // Initialize Map with zoom limits
    const center = state.mapData.center || [10.7202, 122.5621];
    const zoom = state.mapData.zoom || 15;

    state.mapInstance = L.map('farmMap', {
        maxZoom: 19,
        minZoom: 5
    }).setView(center, zoom);

    // Define Base Layers with appropriate zoom limits
    state.baseLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            maxNativeZoom: 18,
            attribution: '© Esri'
        })
    };

    // Add default layer
    state.currentBaseLayer = state.baseLayers.street;
    state.currentBaseLayer.addTo(state.mapInstance);

    // Initialize Drawing Tools
    state.drawnItems = new L.FeatureGroup();
    state.mapInstance.addLayer(state.drawnItems);

    state.drawControl = new L.Control.Draw({
        edit: {
            featureGroup: state.drawnItems
        },
        draw: {
            polygon: true,
            polyline: false,
            rectangle: true,
            circle: true,
            marker: true,
            circlemarker: false
        }
    });

    // Initialize Marker Cluster Group
    state.markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Add Plant Markers
    renderPlantMarkers();

    // Setup Event Listeners for Controls
    setupMapControls();

    // Handle drawing events
    state.mapInstance.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        state.drawnItems.addLayer(layer);
        toast('Shape drawn successfully!');
    });

    // Check for pending focus OR pending live satellite
    if (state.pendingMapFocusPlantId) {
        setTimeout(() => focusMapOnPlant(state.pendingMapFocusPlantId), 500);
    }

    const pendingLiveId = localStorage.getItem("pm_pending_live_sat_id");
    if (pendingLiveId) {
        localStorage.removeItem("pm_pending_live_sat_id");
        setTimeout(() => enterSatelliteLiveMode(parseInt(pendingLiveId)), 1000);
    }

    isInitializing = false;
}

export function renderPlantMarkers() {
    const map = state.mapInstance;
    if (!map) return;

    // Remove cluster group from map if it exists
    if (map.hasLayer(state.markerClusterGroup)) {
        map.removeLayer(state.markerClusterGroup);
    }

    // Clear all markers from cluster group
    state.markerClusterGroup.clearLayers();

    // Clear existing markers from map
    state.plantMarkers.forEach(m => {
        if (map.hasLayer(m.marker)) {
            map.removeLayer(m.marker);
        }
    });
    state.plantMarkers = [];

    if (typeof state.plantsData !== 'undefined') {
        const plantsToRender = state.plantsData.filter(plant => {
            if (!plant.coords || !Array.isArray(plant.coords)) return false;

            // Apply filter
            if (state.currentPlantFilter !== 'all') {
                const pStatus = (plant.status || "").toLowerCase();
                const filter = state.currentPlantFilter.toLowerCase();
                const isAlertGroup = filter === 'attention' || filter === 'alert';
                const isPlantInAlertGroup = pStatus === 'attention' || pStatus === 'alert';

                if (isAlertGroup) {
                    if (!isPlantInAlertGroup) return false;
                } else if (pStatus !== filter) {
                    return false;
                }
            }
            return true;
        });

        // Optimization: Chunked Rendering
        const CHUNK_SIZE = 50;
        let index = 0;

        function renderChunk() {
            const chunk = plantsToRender.slice(index, index + CHUNK_SIZE);

            chunk.forEach(plant => {
                const status = (plant.status || "").toLowerCase();
                const color = getStatusColor(status);

                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div class="marker-pin" style="background: ${color}"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                const marker = L.marker(plant.coords, { icon: customIcon });
                marker.bindPopup(`
                    <strong>${plant.name}</strong><br>
                    ${plant.location}<br>
                    Status: <span style="color: ${color}; font-weight: bold;">${plant.status}</span><br>
                    <small style="color:#666">X: ${plant.coords[0].toFixed(7)} | Y: ${plant.coords[1].toFixed(7)}</small>
                    <br><small style="color:#666">Click for Zone Analytics</small>
                `);

                marker.on('click', (e) => {
                    map.flyTo(e.latlng, map.getMaxZoom());
                    showDynamicZoneAnalytics(plant);
                });

                state.plantMarkers.push({ marker, plant });

                if (state.clusteringEnabled) {
                    state.markerClusterGroup.addLayer(marker);
                } else {
                    marker.addTo(map);
                }
            });

            index += CHUNK_SIZE;
            if (index < plantsToRender.length) {
                requestAnimationFrame(renderChunk);
            } else {
                // Finalize: Add cluster group if enabled (and if not already added incrementally, though addLayer handles it)
                // Actually markerClusterGroup typically handles updates well, but re-adding to map at the end is safe.
                if (state.clusteringEnabled && !map.hasLayer(state.markerClusterGroup)) {
                    map.addLayer(state.markerClusterGroup);
                }
            }
        }

        renderChunk();
    }
}

export function setupMapControls() {
    // Map Type Selector
    const mapTypeSelector = document.getElementById('mapTypeSelector');
    if (mapTypeSelector) {
        mapTypeSelector.addEventListener('change', (e) => {
            switchMapLayer(e.target.value);
        });
    }

    // Legend Interaction
    document.querySelectorAll('.legend-item').forEach(item => {
        item.addEventListener('click', () => {
            const status = item.getAttribute('data-status');
            const isActive = item.classList.contains('active');

            // Sync with filter buttons (remove active from them)
            document.querySelectorAll('[data-plant-filter]').forEach(b => b.classList.remove('active'));

            if (!isActive) {
                // Clear previous legend actives
                document.querySelectorAll('.legend-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                state.currentPlantFilter = status;
                renderPlantMarkers();

                // After rendering, pulsate the remaining ones
                highlightPlantsByStatus(status);
                toast(`Showing only ${status} plants`);
            } else {
                item.classList.remove('active');
                state.currentPlantFilter = 'all';
                renderPlantMarkers();
                // Clear all highlights
                clearMarkerHighlights();

                // Highlight 'all' button if it exists
                const allBtn = document.querySelector('[data-plant-filter="all"]');
                if (allBtn) allBtn.classList.add('active');

                toast('Showing all plants');
            }
        });
    });

    // Plant Filter Buttons
    document.querySelectorAll('[data-plant-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentPlantFilter = btn.getAttribute('data-plant-filter');
            document.querySelectorAll('[data-plant-filter]').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            renderPlantMarkers();
        });
    });

    // Drawing Toggle
    const toggleDrawing = document.getElementById('toggleDrawing');
    if (toggleDrawing) {
        let drawingEnabled = false;
        toggleDrawing.addEventListener('click', () => {
            drawingEnabled = !drawingEnabled;
            if (drawingEnabled) {
                state.mapInstance.addControl(state.drawControl);
                toggleDrawing.style.background = '#1e8a4c';
                toast('Drawing mode enabled');
            } else {
                state.mapInstance.removeControl(state.drawControl);
                toggleDrawing.style.background = '';
                toast('Drawing mode disabled');
            }
        });
    }

    // Heatmap Toggle
    const toggleHeatmap = document.getElementById('toggleHeatmap');
    if (toggleHeatmap) {
        let heatmapEnabled = false;
        toggleHeatmap.addEventListener('click', () => {
            heatmapEnabled = !heatmapEnabled;
            if (heatmapEnabled) {
                showHeatmap();
                toggleHeatmap.style.background = '#1e8a4c';
            } else {
                hideHeatmap();
                toggleHeatmap.style.background = '';
            }
        });
    }

    // Clustering Toggle
    const toggleClustering = document.getElementById('toggleClustering');

    if (toggleClustering) {
        toggleClustering.addEventListener('click', () => {
            state.clusteringEnabled = !state.clusteringEnabled;
            if (state.clusteringEnabled) {
                toggleClustering.style.background = '#1e8a4c';
                toast('Marker clustering enabled');
            } else {
                toggleClustering.style.background = '';
                toast('Marker clustering disabled');
            }
            renderPlantMarkers();
        });
    }

    // Analytics Panel Close
    const closeAnalytics = document.getElementById('closeAnalytics');
    if (closeAnalytics) {
        closeAnalytics.addEventListener('click', () => {
            document.getElementById('analyticsPanel').style.display = 'none';
        });
    }
}

export function highlightPlantsByStatus(status) {
    setTimeout(() => {
        const matchingMarkers = state.plantMarkers.filter(pm => (pm.plant.status || "").toLowerCase() === status.toLowerCase());

        if (matchingMarkers.length === 0) return;

        matchingMarkers.forEach(pm => {
            const iconElement = pm.marker.getElement();
            if (iconElement) {
                const pin = iconElement.querySelector('.marker-pin');
                if (pin) {
                    // Use status-specific pulse class or 'alert' if it is attention/alert
                    const pStatus = (pm.plant.status || "").toLowerCase();
                    const pulseClass = (pStatus === 'attention' || pStatus === 'alert') ? 'pulse-alert' : `pulse-${pStatus}`;
                    pin.classList.add(pulseClass);
                }
            }
        });

        // Zoom to fit
        const group = L.featureGroup(matchingMarkers.map(pm => pm.marker));
        state.mapInstance.fitBounds(group.getBounds().pad(0.3));
    }, 150);
}

export function clearMarkerHighlights() {
    state.plantMarkers.forEach(pm => {
        const iconElement = pm.marker.getElement();
        if (iconElement) {
            const pin = iconElement.querySelector('.marker-pin');
            if (pin) {
                pin.classList.remove('pulse-healthy', 'pulse-growing', 'pulse-attention', 'pulse-alert', 'pulse-good', 'pulse-warning');
            }
        }
    });
}

function switchMapLayer(layerType) {
    if (state.currentBaseLayer) {
        state.mapInstance.removeLayer(state.currentBaseLayer);
    }
    state.currentBaseLayer = state.baseLayers[layerType];
    if (state.currentBaseLayer) {
        state.currentBaseLayer.addTo(state.mapInstance);
        toast(`Switched to ${layerType} view`);
    }
}

function showHeatmap() {
    if (typeof L.heatLayer === 'undefined') {
        toast('Heatmap library not loaded');
        return;
    }

    if (!state.plantsData || state.plantsData.length === 0) {
        toast('No plant data available for heatmap');
        return;
    }

    // Generate real-time heatmap data based on plant status
    const heatData = state.plantsData.map(plant => {
        if (!plant.coords) return null;

        // Intensity mapping: healthy = 1.0, growing = 0.6, attention = 0.2
        let intensity = 0.5;
        const status = (plant.status || "").toLowerCase();
        if (status === 'healthy') intensity = 1.0;
        else if (status === 'growing') intensity = 0.6;
        else if (status === 'attention' || status === 'alert') intensity = 0.2;

        return [plant.coords[0], plant.coords[1], intensity];
    }).filter(d => d !== null);

    if (heatData.length === 0) {
        toast('No valid coordinates for heatmap');
        return;
    }

    state.heatmapLayer = L.heatLayer(heatData, {
        radius: 35,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        gradient: {
            0.0: '#e74c3c', // Red (Attention)
            0.5: '#f1c40f', // Yellow (Growing)
            1.0: '#27ae60'  // Green (Healthy)
        }
    }).addTo(state.mapInstance);

    toast('Live plant health heatmap displayed');
}

function hideHeatmap() {
    if (state.heatmapLayer) {
        state.mapInstance.removeLayer(state.heatmapLayer);
        state.heatmapLayer = null;
        toast('Heatmap hidden');
    }
}

function showDynamicZoneAnalytics(plant) {
    const panel = document.getElementById('analyticsPanel');
    const content = document.getElementById('analyticsContent');

    if (!panel || !content) return;

    // Extract Zone from location (e.g., "Northern Farm, Zone A" -> "Zone A", "Area 67" -> "Area 67")
    const locationStr = plant.location || "";
    // Match "Zone A", "Area 67", "Section 5", etc.
    const zoneMatch = locationStr.match(/(Zone|Area|Section)\s+[A-Z0-9]+/i);
    const zoneName = zoneMatch ? zoneMatch[0] : (locationStr.includes(',') ? locationStr.split(',').pop().trim() : locationStr || "General Area");

    // Calculate dynamic stats from current plantsData (from database)
    const zonePlants = state.plantsData.filter(p => (p.location || "").includes(zoneName));
    const totalPlants = zonePlants.length;
    const healthyCount = zonePlants.filter(p => (p.status || "").toLowerCase() === 'healthy' || (p.status || "").toLowerCase() === 'good').length;
    const healthScore = totalPlants > 0 ? Math.round((healthyCount / totalPlants) * 100) : 0;

    // Determine status color based on health score
    let status = "Good";
    let statusColor = "#27ae60";

    if (totalPlants === 0) {
        status = "No Data";
        statusColor = "#94a3b8"; // Gray
    } else if (healthScore < 50) {
        status = "Alert";
        statusColor = "#e74c3c";
    } else if (healthScore < 80) {
        status = "Warning";
        statusColor = "#f39c12";
    }

    content.innerHTML = `
      <h4 style="color: #27ae60; margin-bottom: 4px;">${zoneName} Analytics</h4>
      <p style="font-size: 12px; color: #666; margin-bottom: 16px;">Based on ${plant.name}'s location</p>
      
      <div class="stat-row">
        <span class="stat-label">Zone Status</span>
        <span class="stat-value" style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Total Plants in Zone</span>
        <span class="stat-value">${totalPlants}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Average Health</span>
        <span class="stat-value">${healthScore}%</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Current Plant</span>
        <span class="stat-value">${plant.name}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Plant Condition</span>
        <span class="stat-value" style="color: ${getStatusColor(plant.status)}">${plant.status}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Coordinate X (Lat)</span>
        <span class="stat-value">${plant.coords[0].toFixed(7)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Coordinate Y (Lng)</span>
        <span class="stat-value">${plant.coords[1].toFixed(7)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Last Checked</span>
        <span class="stat-value">${formatDateTime(plant.lastWatered || plant.last_watered) || 'Recently'}</span>
      </div>
      
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
        <button class="btn btn-primary btn-sm" style="width: 100%; justify-content: center; background: #6366f1;" onclick="import('./js/map.js').then(m => m.enterSatelliteLiveMode(${plant.id}))">
          📡 LIVE SATELLITE VIEW
        </button>
      </div>
    `;

    panel.style.display = 'flex';
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString || dateTimeString === '-') return '-';
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return dateTimeString;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${hours}:${date.getMinutes().toString().padStart(2, '0')} ${ampm}`;
    } catch (e) { return dateTimeString; }
}

function focusMapOnPlant(plantId) {
    // This function needs to be available to other modules theoretically, 
    // but its mostly used within map start or from UI interactions that trigger map focus.
    const plant = state.plantsData.find(p => p.id === plantId);
    if (plant && plant.coords && state.mapInstance) {
        state.mapInstance.flyTo(plant.coords, 18);
        showDynamicZoneAnalytics(plant);
    }
}

/**
 * Restricted Satellite Live Mode 
 * Requires Premium or Steward role
 */
export async function enterSatelliteLiveMode(plantId) {
    const userRole = localStorage.getItem("pm_user_role");
    const subTier = localStorage.getItem("pm_user_subscription") || "free";

    const isPremium = subTier === 'premium' || localStorage.getItem("pm_premium_status") === 'true';
    const isSteward = userRole === 'steward' || localStorage.getItem("pm_steward_status") === 'approved';

    if (!isPremium && !isSteward) {
        showPremiumLock();
        return;
    }

    const plant = state.plantsData.find(p => p.id === plantId);
    if (!plant || !state.mapInstance) return;

    // 1. Switch to Satellite and fly to high zoom
    switchMapLayer('satellite');
    state.mapInstance.flyTo(plant.coords, 19, {
        animate: true,
        duration: 1.5
    });

    // 2. Setup/Show Overlay
    const mapContainer = document.getElementById("farmMap");
    mapContainer.classList.add("live-video-feed"); // For CSS effects

    let overlay = document.getElementById("satLiveOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "satLiveOverlay";
        overlay.className = "satellite-live-overlay";
        mapContainer.appendChild(overlay);
    }

    // Initial Weather Fetch for Precise Location
    let weatherInfo = "FETCHING MISSION DATA...";
    let sunInfo = "SR: --:-- | SS: --:--";
    let isDay = true; // Default to day

    api.fetchWeather(plant.coords[0], plant.coords[1]).then(data => {
        if (data && data.current) {
            const { temperature_2m, relative_humidity_2m, wind_speed_10m, is_day } = data.current;
            weatherInfo = `${temperature_2m}°C | RH:${relative_humidity_2m}% | W:${wind_speed_10m}km/h`;
            isDay = is_day === 1;

            // Apply day/night filter
            if (!isDay) {
                mapContainer.classList.add("night-mode");
            } else {
                mapContainer.classList.remove("night-mode");
            }

            if (data.daily) {
                const sr = data.daily.sunrise[0].split('T')[1];
                const ss = data.daily.sunset[0].split('T')[1];
                sunInfo = `SR: ${sr} | SS: ${ss}`;
            }
            updateTelemetry();
        }
    });

    // Mission Update Interval (Real-time Clock & Telemetry)
    if (missionUpdateInterval) clearInterval(missionUpdateInterval);

    let scanProgress = 0;
    const updateTelemetry = () => {
        const now = new Date();
        const lTime = now.toLocaleTimeString();
        const uTime = now.toISOString().split('T')[1].split('.')[0] + 'Z';

        // Progress simulation
        if (scanProgress < 100) scanProgress += Math.random() * 5;
        const progressStr = scanProgress >= 100 ? "COMPLETE" : `${Math.floor(scanProgress)}%`;
        const healthIdx = scanProgress >= 100 ? (plant.health_index || "85") : "ANALYZING...";

        overlay.innerHTML = `
            <div class="sat-grid"></div>
            <div class="scanning-beam"></div>
            <div class="sat-ui-panel sat-ui-top-left">
                <div class="sat-status-dot active"></div>
                LIVE VIDEO FEED // ORBIT_LINK_7<br>
                SUBJECT: ${plant.name.toUpperCase()} (ID_${plant.id})<br>
                L-TIME: ${lTime}<br>
                U-TIME: ${uTime}
            </div>
            <div class="sat-ui-panel sat-ui-top-right">
                LAT: ${plant.coords[0].toFixed(7)}<br>
                LNG: ${plant.coords[1].toFixed(7)}<br>
                ENV: ${weatherInfo}<br>
                SOL: ${sunInfo}
            </div>
            <div class="sat-ui-panel sat-ui-bottom-left">
                SCANNING TISSUE... ${progressStr}<br>
                HEALTH_IDX: ${healthIdx} (${plant.status.toUpperCase()})<br>
                EST_ACCURACY: 99.8% (RTK-LVL)
            </div>
            <div class="sat-ui-panel sat-ui-bottom-right">
                <button id="exitSatBtn" style="pointer-events: auto; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 6px 12px; cursor: pointer; border-radius: 8px; font-weight: 800; font-size: 0.75rem;">EXIT</button>
            </div>
        `;

        document.getElementById("exitSatBtn").onclick = () => {
            clearInterval(missionUpdateInterval);
            mapContainer.classList.remove("live-video-feed");
            mapContainer.classList.remove("night-mode");
            overlay.classList.remove("active");
            state.mapInstance.setZoom(17);
            toast("Deep Link Terminated");
        };
    };

    updateTelemetry();
    missionUpdateInterval = setInterval(updateTelemetry, 1000);

    overlay.classList.add("active");
    toast("Establishing Real-time Satellite Link...");
}

function showPremiumLock() {
    const mapContainer = document.getElementById("farmMap");
    let lock = document.getElementById("premLockOverlay");

    if (!lock) {
        lock = document.createElement("div");
        lock.id = "premLockOverlay";
        lock.className = "premium-lock-overlay";
        lock.innerHTML = `
            <div class="lock-icon-lg">💎</div>
            <h2>Premium Satellite View</h2>
            <p>Access high-resolution live satellite imagery and advanced plant scanning. Available exclusively for Stewards and Premium members.</p>
            <div style="display: flex; gap: 12px; pointer-events: auto;">
                <button class="btn btn-primary" onclick="localStorage.setItem('pm_currentPage', 'subscription'); window.location.reload();">UPGRADE NOW</button>
                <button class="btn btn-outline" style="color: white; border-color: white;" onclick="this.parentElement.parentElement.remove()">CLOSE</button>
            </div>
        `;
        mapContainer.appendChild(lock);
    }
}

