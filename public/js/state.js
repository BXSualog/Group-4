
// State Management
// State Management
class Store {
    constructor(initialState) {
        this._data = initialState;
        this.subscribers = new Set();

        // Proxy to intercept and log changes (Encapsulation/Control)
        this.data = new Proxy(this._data, {
            set: (target, key, value) => {
                const oldValue = target[key];
                target[key] = value;

                // Notify subscribers
                this.notify(key, value, oldValue);
                return true;
            },
            get: (target, key) => {
                return target[key];
            }
        });
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    notify(key, value, oldValue) {
        this.subscribers.forEach(callback => callback(key, value, oldValue));
    }

    // Helper to update state safely
    setState(key, value) {
        this.data[key] = value;
    }
}

const initialState = {
    plantsData: [],
    contactsData: [],
    weatherData: {},
    tasksData: [],
    financialData: {},
    mapData: { zones: [] },
    issuesData: [],

    // UI State
    currentPage: "dashboard",
    selectedContact: null,
    currentPlantId: null,
    plantQuery: "",
    contactQuery: "",
    plantStatusFilter: "all",
    plantSort: "name-asc",
    lastSeenBroadcast: null,
    pendingMapFocusPlantId: null,

    // Community State
    communityFilter: "All",
    communitySearchQuery: "",
    communitySort: "Newest",
    communityData: [],
    selectedMediaFile: null,

    // Pagination State
    plantsPageOffset: 0,
    appendingPlants: false,

    // Map State
    mapInstance: null,
    baseLayers: {},
    currentBaseLayer: null,
    drawControl: null,
    drawnItems: null,
    markerClusterGroup: null,
    heatmapLayer: null,
    plantMarkers: [],
    zoneCircles: [],
    currentPlantFilter: 'all',
    clusteringEnabled: false,

    // Steward Discovery State
    availableStewards: [],
    stewardSearchQuery: ""
};

// Singleton Instance
export const store = new Store(initialState);

// Export 'state' as the Proxy to maintain strict backward compatibility
// with all existing code that does `import { state } from './state.js'`
export const state = store.data;

// Export legacy helper if used
export function subscribe(callback) {
    return store.subscribe(callback);
}

export function setState(key, value) {
    store.setState(key, value);
}
