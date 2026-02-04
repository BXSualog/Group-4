// MAP FUNCTIONS - PASTE THIS INTO dashboard.js REPLACING THE loadMap FUNCTION

// ===================================
// MAP
// ===================================
let mapInstance = null;
let baseLayers = {};
let currentBaseLayer = null;
let drawControl = null;
let drawnItems = null;
let markerClusterGroup = null;
let heatmapLayer = null;
let plantMarkers = [];
let zoneCircles = [];
let currentPlantFilter = 'all';
let clusteringEnabled = false;

function loadMap() {
    const mapContainer = document.getElementById("farmMap");
    if (!mapContainer) return;

    // Prevent re-initialization
    if (mapInstance) {
        setTimeout(() => mapInstance.invalidateSize(), 100);
        return;
    }

    // Initialize Map
    const center = mapData.center || [10.7202, 122.5621];
    const zoom = mapData.zoom || 15;

    mapInstance = L.map('farmMap').setView(center, zoom);

    // Define Base Layers
    baseLayers = {
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '© Esri'
        })
    };

    // Add default layer
    currentBaseLayer = baseLayers.street;
    currentBaseLayer.addTo(mapInstance);

    // Initialize Drawing Tools
    drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);

    drawControl = new L.Control.Draw({
        edit: {
            featureGroup: drawnItems
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
    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true
    });

    // Removed zone circles as per user request (Zone analytics moved to plant markers)

    // Add Plant Markers
    renderPlantMarkers();

    // Setup Event Listeners for Controls
    setupMapControls();

    // Handle drawing events
    mapInstance.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        toast('Shape drawn successfully!');
    });
}

function renderPlantMarkers() {
    // Clear existing markers
    plantMarkers.forEach(m => {
        if (clusteringEnabled) {
            markerClusterGroup.removeLayer(m.marker);
        } else {
            mapInstance.removeLayer(m.marker);
        }
    });
    plantMarkers = [];

    if (typeof plantsData !== 'undefined') {
        plantsData.forEach(plant => {
            if (plant.coords && Array.isArray(plant.coords)) {
                // Apply filter
                if (currentPlantFilter !== 'all' && plant.status !== currentPlantFilter) {
                    return;
                }

                const marker = L.marker(plant.coords);
                marker.bindPopup(`
          <strong>${plant.name}</strong><br>
          ${plant.location}<br>
          Status: <span style="color: ${getStatusColor(plant.status)}">${plant.status}</span>
          <br><small style="color:#666">Click for Zone Analytics</small>
        `);

                // Update analytics and zoom on click
                marker.on('click', (e) => {
                    mapInstance.flyTo(e.latlng, mapInstance.getMaxZoom());
                    showDynamicZoneAnalytics(plant);
                });

                plantMarkers.push({ marker, plant });

                if (clusteringEnabled) {
                    markerClusterGroup.addLayer(marker);
                } else {
                    marker.addTo(mapInstance);
                }
            }
        });
    }

    // Add cluster group to map if clustering is enabled
    if (clusteringEnabled && !mapInstance.hasLayer(markerClusterGroup)) {
        mapInstance.addLayer(markerClusterGroup);
    }
}

function getStatusColor(status) {
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

function setupMapControls() {
    // Map Type Selector
    const mapTypeSelector = document.getElementById('mapTypeSelector');
    if (mapTypeSelector) {
        mapTypeSelector.addEventListener('change', (e) => {
            switchMapLayer(e.target.value);
        });
    }

    // Plant Filter Buttons
    document.querySelectorAll('[data-plant-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            currentPlantFilter = btn.getAttribute('data-plant-filter');
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
                mapInstance.addControl(drawControl);
                toggleDrawing.style.background = '#1e8a4c';
                toast('Drawing mode enabled');
            } else {
                mapInstance.removeControl(drawControl);
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
            clusteringEnabled = !clusteringEnabled;
            if (clusteringEnabled) {
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

function switchMapLayer(layerType) {
    if (currentBaseLayer) {
        mapInstance.removeLayer(currentBaseLayer);
    }
    currentBaseLayer = baseLayers[layerType];
    if (currentBaseLayer) {
        currentBaseLayer.addTo(mapInstance);
        toast(`Switched to ${layerType} view`);
    }
}

function showHeatmap() {
    if (typeof L.heatLayer === 'undefined') {
        toast('Heatmap library not available');
        return;
    }

    if (!plantsData || plantsData.length === 0) {
        toast('No plant data for heatmap');
        return;
    }

    // Generate dynamic data
    const heatData = plantsData.map(plant => {
        if (!plant.coords) return null;
        let intensity = 0.5;
        const status = (plant.status || "").toLowerCase();
        if (status === 'healthy') intensity = 1.0;
        else if (status === 'growing') intensity = 0.6;
        else if (status === 'attention' || status === 'alert') intensity = 0.2;
        return [plant.coords[0], plant.coords[1], intensity];
    }).filter(d => d !== null);

    heatmapLayer = L.heatLayer(heatData, {
        radius: 35,
        blur: 20,
        maxZoom: 17,
        max: 1.0,
        gradient: {
            0.0: '#e74c3c', // Red
            0.5: '#f1c40f', // Yellow
            1.0: '#27ae60'  // Green
        }
    }).addTo(mapInstance);

    toast('Plant health heatmap displayed');
}

function hideHeatmap() {
    if (heatmapLayer) {
        mapInstance.removeLayer(heatmapLayer);
        heatmapLayer = null;
        toast('Heatmap hidden');
    }
}

function showDynamicZoneAnalytics(plant) {
    const panel = document.getElementById('analyticsPanel');
    const content = document.getElementById('analyticsContent');

    if (!panel || !content) return;

    // Extract Zone from location (e.g., "Northern Farm, Zone A" -> "Zone A")
    const locationStr = plant.location || "";
    const zoneMatch = locationStr.match(/(Zone|Area|Section)\s+[A-Z0-9]+/i);
    const zoneName = zoneMatch ? zoneMatch[0] : (locationStr.includes(',') ? locationStr.split(',').pop().trim() : locationStr || "General Area");

    // Calculate dynamic stats from current plantsData (from database)
    const zonePlants = plantsData.filter(p => (p.location || "").includes(zoneName));
    const totalPlants = zonePlants.length;
    const healthyCount = zonePlants.filter(p => (p.status || "").toLowerCase() === 'healthy' || (p.status || "").toLowerCase() === 'good').length;
    const healthScore = totalPlants > 0 ? Math.round((healthyCount / totalPlants) * 100) : 0;

    // Determine status color based on health score
    let status = "Good";
    let statusColor = "#27ae60";

    if (totalPlants === 0) {
        status = "No Data";
        statusColor = "#94a3b8";
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
      <span class="stat-label">Last Checked</span>
      <span class="stat-value">${formatMapDateTime(plant.lastWatered || plant.last_watered) || 'Recently'}</span>
    </div>
  `;

    panel.style.display = 'flex';
}

function formatMapDateTime(dateTimeString) {
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

function showZoneAnalytics(zone) {
    // Legacy function updated to be dynamic
    const panel = document.getElementById('analyticsPanel');
    const content = document.getElementById('analyticsContent');

    if (!panel || !content) return;

    content.innerHTML = `
    <h4 style="color: #27ae60; margin-bottom: 16px;">${zone.name}</h4>
    <div class="stat-row">
      <span class="stat-label">Status</span>
      <span class="stat-value" style="color: ${zone.color}">${zone.status.toUpperCase()}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Plants</span>
      <span class="stat-value">${zone.plants || 0}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Health Score</span>
      <span class="stat-value">${zone.health || 'N/A'}%</span>
    </div>
  `;

    panel.style.display = 'flex';
}
