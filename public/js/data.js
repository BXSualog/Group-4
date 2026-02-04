// This file previously contained hardcoded mock data.
// All data is now fetched from the database via API calls.
// This file is kept for backwards compatibility but contains no data.

// Initialize empty global objects for legacy code that might reference them
window.PLANTS_DATA = [];
window.CONTACTS_DATA = [];
window.USERS_DATA = [];
window.TASKS_DATA = [];
window.WEATHER_DATA = null;
window.FINANCIAL_DATA = null;
window.MAP_DATA = { zones: [] };
window.HEATMAP_DATA = null;
window.ISSUES_DATA = [];

// All data should now be fetched from:
// - /api/plants (for plants data)
// - /api/connections (for contacts data)
// - /api/admin/users (for users data)
// - /api/steward/tasks (for tasks data)
// - Open-Meteo API (for weather data)
// - Database queries (for financial data)
// - Plants API with coords (for map data)
