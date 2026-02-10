// AUTOMATIC ENVIRONMENT SWITCHING
// If running on localhost, use local backend.
// If running on Netlify (or other public web host), use the hosted backend.

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// ⚠️ REPLACE THIS URL WITH YOUR ACTUAL RENDER/RAILWAY URL AFTER DEPLOYING BACKEND ⚠️
const PROD_BACKEND_URL = 'https://bx-plant-monitoring.onrender.com';

export const API_BASE_URL = isLocal ? 'http://localhost:3001' : PROD_BACKEND_URL;

console.log(`[Config] Running on ${isLocal ? 'Localhost' : 'Production'}. API: ${API_BASE_URL}`);

// Expose to window for non-module scripts
window.API_BASE_URL = API_BASE_URL;
