import { state } from './state.js';
import { toast } from './ui.js';
import { API_BASE_URL } from './config.js';

// ===================================
// API CALLS
// ===================================

export async function fetchPlants() {
    const email = localStorage.getItem("pm_user_email");
    if (!email) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/plants?email=${encodeURIComponent(email)}`);
        if (resp.ok) {
            const rawPlants = await resp.json();
            state.plantsData = rawPlants.map(p => {
                if (p.coords && typeof p.coords === 'string') {
                    try { return { ...p, coords: JSON.parse(p.coords) }; }
                    catch (e) { return p; }
                }
                return p;
            });
        }
    } catch (err) {
        console.error("Failed to fetch plants:", err);
    }
}

export async function fetchContacts() {
    const email = localStorage.getItem("pm_user_email");
    try {
        const resp = await fetch(`${API_BASE_URL}/api/connections?email=${encodeURIComponent(email)}`);
        if (!resp.ok) return;
        const connections = await resp.json();

        // Map connections to the format expected by the existing UI
        state.contactsData = connections.map(c => ({
            id: c.email,
            name: c.username || 'Steward',
            role: (c.role === 'steward' || c.is_steward) ? 'Steward' : 'Client',
            initials: (c.username || 'S').substring(0, 2).toUpperCase(),
            email: c.email,
            messages: [],
            unread: 0
        }));
    } catch (err) {
        console.error("Failed to load contacts:", err);
    }
}

export async function fetchWeather() {
    // Return data for the UI to interpret, or store in state
    try {
        let lat = 10.7202; // Default: Iloilo
        let lon = 122.5621;

        // Try to get user location
        if (navigator.geolocation) {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            }).catch(() => null);
            if (pos) {
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
            }
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day&daily=weather_code,temperature_2m_max,sunrise,sunset,uv_index_max&hourly=temperature_2m,weather_code&timezone=auto`;

        const res = await fetch(url);
        const data = await res.json();

        state.weatherData = data;
        return data; // Return for immediate rendering if needed
    } catch (err) {
        console.error("Weather fetch error:", err);
        return null;
    }
}

export async function fetchTasks() {
    // In original code this was reading from window.TASKS_DATA mostly, or maybe fetching?
    // Original code: const tasksData = (window.TASKS_DATA || [])...
    // There was no fetch in original loadTasks? 
    // Wait, original loadTasks just rendered tasksData.
    // If there is no API call, we just use state.

    // Logic: if window.TASKS_DATA is defined, we use it.
    // state.tasksData is already initialized from window.TASKS_DATA if we did that in state.js...
    // But state.js initialized it to empty array.
    // We should probably sync it on init.
    // Or we leave it empty if there is no backend for tasks yet.
    // Assuming no new API needed unless original had it.
}

export async function fetchFinancials() {
    // Similarly, check if original had fetch.
    // Original code: const financialData = window.FINANCIAL_DATA || {};
    // No fetch in loadFinancials.
}

export async function fetchCommunityFeed() {
    const email = localStorage.getItem("pm_user_email");
    const url = new URL(`${API_BASE_URL}/api/community/posts`);
    url.searchParams.append('email', email);
    if (state.communitySearchQuery) url.searchParams.append('search', state.communitySearchQuery);
    if (state.communityFilter !== 'All') url.searchParams.append('type', state.communityFilter);
    url.searchParams.append('sort', state.communitySort);

    try {
        const res = await fetch(url);
        if (res.ok) {
            state.communityData = await res.json();
        } else {
            state.communityData = [];
        }
    } catch (err) {
        console.error("Feed error", err);
        state.communityData = [];
    }
}

export async function fetchTopContributors() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/top-contributors`);
        if (res.ok) return await res.json();
        return [];
    } catch (e) {
        console.error("Top contributors error", e);
        return [];
    }
}

export async function submitCommunityPost(formData) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts`, {
            method: 'POST',
            body: formData
        });
        return res.ok;
    } catch (e) {
        console.error("Post error", e);
        return false;
    }
}

export async function likePost(id) {
    const email = localStorage.getItem("pm_user_email");
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts/${id}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        if (res.ok) return await res.json();
        return null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function fetchComments(postId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts/${postId}/comments`);
        if (res.ok) return await res.json();
        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function submitComment(postId, content, authorInfo) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...authorInfo,
                content: content
            })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

export async function fetchNotifications() {
    const email = localStorage.getItem("pm_user_email");
    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications?email=${email}`);
        if (res.ok) return await res.json();
        return [];
    } catch (e) {
        console.error("Notif error", e);
        return [];
    }
}

export async function dismissNotification(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) {
        console.error("Dismiss notif error", e);
        return false;
    }
}


export async function deletePost(id) {
    const email = localStorage.getItem("pm_user_email");
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts/${id}?email=${email}`, { method: 'DELETE' });
        return res.ok;
    } catch (e) { return false; }
}

export async function pinPost(id) {
    const email = localStorage.getItem("pm_user_email");
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/posts/${id}/pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        return res.ok;
    } catch (e) { return false; }
}

export async function fetchTrends() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/community/trends`);
        if (res.ok) return await res.json();
        return [];
    } catch (e) {
        console.error("Trends error", e);
        return [];
    }
}

export async function fetchPlantDetails(plantId) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/plants/${plantId}`);
        if (resp.ok) {
            return await resp.json();
        }
        return null;
    } catch (err) {
        console.error("Fetch details error:", err);
        return null;
    }
}

export async function sendUpdateRequest(plantId, email, name) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/client/request-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plant_id: plantId, user_email: email, user_name: name })
        });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

export async function fetchMessages(user1, user2) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/messages?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`);
        if (!resp.ok) throw new Error('Failed to load messages');
        return await resp.json();
    } catch (err) {
        console.error('Error loading messages:', err);
        return [];
    }
}

export async function sendMessage(sender, receiver, text) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_email: sender,
                receiver_email: receiver,
                message_text: text
            })
        });
        return resp.ok;
    } catch (err) {
        console.error('Error sending message:', err);
        return false;
    }
}

export async function fetchUserProfile(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            }
        }
    } catch (e) {
        console.error("Profile check error", e);
    }
    return null;
}

export async function updateProfile(data) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return resp.ok;
    } catch (e) {
        return false;
    }
}

export async function updatePassword(email, currentPassword, newPassword) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/account/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, currentPassword, newPassword })
        });
        const data = await resp.json();
        return { ok: resp.ok, data };
    } catch (e) {
        return { ok: false, data: { error: 'Network error' } };
    }
}

export function exportUserData(email) {
    const token = localStorage.getItem("pm_token");
    window.location.href = `${API_BASE_URL}/api/account/export?email=${encodeURIComponent(email)}&token=${token}`;
}

export async function markNotificationRead() {
    const email = localStorage.getItem("pm_user_email");
    try {
        await fetch(`${API_BASE_URL}/api/notifications/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
    } catch (err) { }
}

export async function fetchAvailableStewards() {
    const email = localStorage.getItem("pm_user_email");
    try {
        const resp = await fetch(`${API_BASE_URL}/api/stewards/available?email=${encodeURIComponent(email || "")}`);
        if (resp.ok) {
            state.availableStewards = await resp.json();
            return state.availableStewards;
        }
    } catch (err) {
        console.error("Failed to fetch available stewards:", err);
    }
    return [];
}

export async function requestConnection(stewardEmail) {
    const email = localStorage.getItem("pm_user_email");
    const name = localStorage.getItem("pm_user_name") || "Client";
    try {
        const resp = await fetch(`${API_BASE_URL}/api/connections/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: email,
                steward_email: stewardEmail,
                user_name: name
            })
        });
        return resp.ok;
    } catch (err) {
        console.error("Connection request failed:", err);
        return false;
    }
}

// Plant Doctor
export async function diagnosePlant(formData) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/doctor/diagnose`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("pm_token")}`
            },
            body: formData
        });
        if (resp.ok) return await resp.json();

        try {
            const errorData = await resp.json();
            console.error("Diagnosis API Error:", errorData);
            return { error: errorData.error || "Server Error", details: errorData.details };
        } catch (e) {
            console.error("Diagnosis API Error (status):", resp.status);
            return { error: "Diagnosis Failed", status: resp.status };
        }
    } catch (err) {
        console.error("Diagnosis error:", err);
        return { error: "Network Error", details: err.message };
    }
}

export async function fetchDiagnoses() {
    const email = localStorage.getItem("pm_user_email");
    try {
        const resp = await fetch(`${API_BASE_URL}/api/doctor/diagnoses?email=${encodeURIComponent(email)}`);
        if (resp.ok) return await resp.json();
        return [];
    } catch (err) {
        console.error("Fetch diagnoses error:", err);
        return [];
    }
}

export async function fetchBroadcast() {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/broadcast`);
        if (resp.ok) return await resp.json();
        return null;
    } catch (err) {
        console.error("Fetch broadcast error:", err);
        return null;
    }
}

export async function deleteAccount() {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/account`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("pm_token")}`
            }
        });
        return resp.ok;
    } catch (e) {
        console.error("Delete account error:", e);
        return false;
    }
}

export async function upgradeTier(tier, cycle) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/account/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier, cycle })
        });
        return await resp.json();
    } catch (e) {
        return { error: 'Upgrade failed' };
    }
}

export async function fetchQuotas() {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/doctor/quotas`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem("pm_token")}`
            }
        });
        if (resp.ok) return await resp.json();
        return null;
    } catch (err) {
        console.error("Fetch quotas error:", err);
        return null;
    }
}
