import { API_BASE_URL } from './config.js';

(function () {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options = {}) {
        // Only intercept internal API calls
        const urlStr = url.toString();
        // Check if relative /api or absolute current origin /api OR matches the configured backend URL
        const isInternal = urlStr.startsWith('/api') ||
            urlStr.startsWith(window.location.origin + '/api') ||
            urlStr.startsWith(API_BASE_URL) ||
            (!urlStr.startsWith('http') && urlStr.startsWith('api')); // For cases like fetch('api/...')

        if (isInternal) {
            const token = localStorage.getItem("pm_token");
            // Initialize headers if not present
            if (!options.headers) {
                options.headers = {};
            }

            // Add Authorization header if token exists
            if (token) {
                if (options.headers instanceof Headers) {
                    options.headers.set('Authorization', `Bearer ${token}`);
                } else {
                    options.headers['Authorization'] = `Bearer ${token}`;
                }
            }
        }

        try {
            const response = await originalFetch(url, options);

            // If unauthorized, clear token and redirect to login
            if (isInternal && response.status === 401) {
                console.warn("[AUTH] session expired or unauthorized. Redirecting to login.");
                localStorage.removeItem("pm_token");

                const isLoginPage = window.location.href.includes('index.html') ||
                    window.location.pathname === '/' ||
                    window.location.pathname === '';

                if (!isLoginPage) {
                    // Prevent infinite redirect if we're already on index.html
                    window.location.href = "index.html?error=session_expired";
                }
            }

            return response;
        } catch (err) {
            // Log error but don't intercept (pass through)
            console.error(`[API] Fetch Error for ${url}:`, err);
            throw err;
        }
    };
    console.log("[AUTH] Global Fetch Interceptor active.");
})();
