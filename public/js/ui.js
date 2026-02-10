import { state } from './state.js';
import * as api from './api.js';
import { getStatusColor } from './map.js';
import { API_BASE_URL } from './config.js';

// ===================================
// DOM HELPER
// ===================================

function el(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);

    for (const [key, value] of Object.entries(attributes)) {
        if (value === null || value === undefined || value === false) continue;

        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'dataset' && typeof value === 'object') {
            for (const [dKey, dValue] of Object.entries(value)) {
                element.dataset[dKey] = dValue;
            }
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === 'html') {
            element.innerHTML = value; // Use sparingly!
        } else {
            element.setAttribute(key, value);
        }
    }

    children.flat().forEach(child => {
        if (child === null || child === undefined || child === false) return;
        if (typeof child === 'string' || typeof child === 'number') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });

    return element;
}

// ===================================
// UTILS
// ===================================

function toast(message) {
    const host = document.getElementById("toastHost");
    if (!host) return;
    const element = el('div', { className: 'toast' }, message);
    host.appendChild(element);

    setTimeout(() => {
        element.style.opacity = "0";
        element.style.transform = "translateY(6px)";
        element.style.transition = "all 0.2s ease";
        setTimeout(() => element.remove(), 220);
    }, 2200);
}

function renderSkeleton(id, count) {
    const host = document.getElementById(id);
    if (!host) return;
    host.innerHTML = '';
    host.style.display = "grid";
    for (let i = 0; i < count; i++) {
        const card = el('div', {
            className: 'skeleton-card',
            style: { background: 'var(--bg-tertiary)', border: '1px solid var(--gray-100)', padding: '16px', borderRadius: '12px' }
        },
            el('div', { className: 'skeleton', style: { height: '120px', marginBottom: '16px' } }),
            el('div', { className: 'skeleton skeleton-text', style: { width: '70%', height: '20px' } }),
            el('div', { className: 'skeleton skeleton-text', style: { width: '40%', height: '14px' } }),
            el('div', { className: 'skeleton', style: { width: '100%', height: '36px', marginTop: '16px', borderRadius: '6px' } })
        );
        host.appendChild(card);
    }
}

function hideSkeleton(id) {
    const host = document.getElementById(id);
    if (host) {
        host.style.opacity = "0";
        setTimeout(() => {
            host.style.display = "none";
            host.innerHTML = "";
        }, 300);
    }
}

function showSkeleton(id) {
    const host = document.getElementById(id);
    if (host) host.style.display = "grid";
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

function timeAgo(dateStr) {
    if (!dateStr) return "";
    let date;
    if (dateStr.includes("T") && dateStr.endsWith("Z")) {
        date = new Date(dateStr);
    } else {
        date = new Date(dateStr.replace(" ", "T") + "Z");
    }
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return (seconds < 10) ? "just now" : Math.floor(seconds) + "s ago";
}

// NOTE: With el(), we don't need linkify returning HTML string properly.
// But we might still want to parse links in text content.
// For now, we'll keep it simple or implement a text parser if critical.
// We'll use a safe innerHTML injection ONLY for linkified content if needed, 
// or split string by regex and create nodes.
function createLinkifiedContent(text) {
    if (!text) return "";
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map(part => {
        if (part.match(/^https?:\/\//)) {
            return el('a', { href: part, target: '_blank' }, part);
        }
        return part;
    });
}

export function showTyping(on) {
    const el = document.getElementById("typingIndicator");
    if (el) el.style.display = on ? "block" : "none";
}

export function isTypingInInput() {
    const el = document.activeElement;
    if (!el) return false;
    return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.getAttribute("contenteditable") === "true"
    );
}

// ===================================
// NAVIGATION & LAYOUT
// ===================================

function updateBreadcrumbs(plant = null) {
    const crumbs = document.getElementById("crumbs");
    if (!crumbs) return;
    const map = {
        dashboard: "Dashboard",
        plants: "Dashboard › My Plants",
        messages: "Dashboard › Messages",
        tasks: "Dashboard › Care Tasks",
        financials: "Dashboard › Financial Analytics",
        map: "Dashboard › Farm Map",
        stewards: "Find a Steward"
    };

    const base = map[state.currentPage] || "Dashboard";
    crumbs.textContent = plant ? `${base} › ${plant.name}` : base;
}

export function showContactsPanelMobile() {
    const contacts = document.querySelector(".contacts-panel");
    const chat = document.querySelector(".chat-panel");
    if (!contacts || !chat) return;
    contacts.classList.add("show-mobile");
    chat.classList.remove("show-mobile");
}

export function showChatPanelMobile() {
    const contacts = document.querySelector(".contacts-panel");
    const chat = document.querySelector(".chat-panel");
    const back = document.getElementById("chatMobileBack");
    if (!contacts || !chat) return;
    contacts.classList.remove("show-mobile");
    chat.classList.add("show-mobile");
    if (back) back.style.display = "block";
}

function updateStats() {
    const total = state.plantsData.length;
    const healthy = state.plantsData.filter(p => (p.status || '').toLowerCase() === 'healthy').length;
    const growing = state.plantsData.filter(p => (p.status || '').toLowerCase() === 'growing').length;

    const elTotal = document.getElementById("statTotal");
    const elHealthy = document.getElementById("statHealthy");
    const elGrowing = document.getElementById("statGrowing");

    if (elTotal) elTotal.textContent = total;
    if (elHealthy) elHealthy.textContent = healthy;
    if (elGrowing) elGrowing.textContent = growing;
}

function updateNavProfile(profile) {
    if (!profile) return;
    const nameEl = document.getElementById("navUserName");
    const avatarEl = document.getElementById("navUserAvatar");
    const roleLabel = document.getElementById("dropdownRoleLabel");

    if (nameEl) {
        let nameHtml = profile.username || "Setup Profile";
        if (profile.subscription_tier === 'premium') {
            nameHtml += ' <span class="premium-badge-mini" title="Premium Subscriber" style="font-size: 0.8em; color: #a855f7;">💎</span>';
        }
        nameEl.innerHTML = nameHtml;

        // Custom: If it says Setup Profile, make it clickable to open modal
        if (!profile.username) {
            nameEl.style.cursor = 'pointer';
            nameEl.onclick = (e) => {
                e.stopPropagation();
                openProfileSetupModal();
            };
            if (avatarEl) {
                avatarEl.style.cursor = 'pointer';
                avatarEl.onclick = (e) => {
                    e.stopPropagation();
                    openProfileSetupModal();
                };
            }
        }
    }
    if (avatarEl) {
        avatarEl.textContent = profile.avatar || profile.username?.charAt(0).toUpperCase() || "?";
        if (profile.subscription_tier === 'premium') {
            avatarEl.style.border = '2px solid #a855f7';
            avatarEl.style.boxShadow = '0 0 8px rgba(168, 85, 247, 0.3)';
        } else {
            avatarEl.style.border = 'none';
            avatarEl.style.boxShadow = 'none';
        }
    }
    if (roleLabel) {
        let roleText = profile.role === 'admin' ? 'Administrator' : (profile.role === 'steward' ? 'Professional Steward' : 'Plant Owner');
        if (profile.subscription_tier === 'premium') roleText = '💎 Premium ' + roleText;
        roleLabel.textContent = roleText;
    }

    const adminBtn = document.getElementById("btnAdminPanel");
    if (adminBtn) {
        adminBtn.style.display = profile.role === 'admin' ? 'flex' : 'none';
        adminBtn.onclick = () => window.location.href = 'admin.html';
    }
}

function openProfileSetupModal() {
    const modal = document.getElementById("profileSetupModal");
    if (!modal) return;
    modal.classList.add("active");

    const saveBtn = document.getElementById("btnSaveProfile");
    const usernameInput = document.getElementById("setupUsername");

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const username = usernameInput.value.trim();
            if (!username) {
                toast("Please enter your name");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            const email = localStorage.getItem("pm_user_email");
            const success = await api.updateProfile({ email, username });

            if (success) {
                toast("Profile set up successfully!");
                modal.classList.remove("active");
                localStorage.setItem("pm_user_name", username);
                // Refresh profile in navbar
                const updatedProfile = await api.fetchUserProfile(email);
                updateNavProfile(updatedProfile);
            } else {
                toast("Failed to save profile. Try again.");
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Profile";
            }
        };
    }

    const backdrop = modal.querySelector(".modal-backdrop");
    const closeBtn = modal.querySelector(".close-modal");
    if (backdrop) backdrop.onclick = () => modal.classList.remove("active");
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove("active");
}

// ===================================
// RENDERING UI
// ===================================

function renderPlants(isFiltered = false) {
    const gridId = isFiltered ? "allPlantsGrid" : "plantsGrid";
    const plantsGrid = document.getElementById(gridId);
    if (!plantsGrid) return;

    // Reset grid if we are starting fresh (not appending)
    // If state.appendingPlants is true, we keep existing content
    if (!state.appendingPlants) {
        plantsGrid.innerHTML = "";
    }

    let displayPlants = [];

    if (!isFiltered) {
        // "Recent Plants" - just show top 3, no pagination needed usually
        displayPlants = state.plantsData.slice(0, 3);
        displayPlants.forEach((plant) => {
            plantsGrid.appendChild(createPlantCard(plant));
        });
    } else {
        // "All Plants" - Filtered List with Pagination
        const empty = document.getElementById("plantsEmpty");

        // 1. Filter & Sort (Ideally this should be cached if list is huge, but filtering 500 items is fast enough)
        let filteredPlants = state.plantsData.filter((p) => {
            if (!state.plantQuery) return true;
            return `${p.name} ${p.location} ${p.status}`.toLowerCase().includes(state.plantQuery);
        });

        if (state.plantStatusFilter !== "all") {
            filteredPlants = filteredPlants.filter((p) => p.status === state.plantStatusFilter);
        }
        filteredPlants = sortPlants(filteredPlants, state.plantSort);

        // 2. Pagination Logic
        const PAGE_SIZE = 20;
        // If not appending, reset offset
        if (!state.plantsPageOffset) state.plantsPageOffset = 0;

        const start = state.plantsPageOffset;
        const end = start + PAGE_SIZE;
        const pagedPlants = filteredPlants.slice(start, end);

        if (empty) {
            empty.style.display = (filteredPlants.length === 0) ? "block" : "none";
        }

        pagedPlants.forEach((plant) => {
            plantsGrid.appendChild(createPlantCard(plant));
        });

        // 3. Handle "Load More" Button
        // Remove existing load more button if any
        const existingBtn = document.getElementById("loadMorePlantsBtn");
        if (existingBtn) existingBtn.remove();

        if (end < filteredPlants.length) {
            const loadMoreBtn = el('button', {
                className: 'btn btn-outline',
                id: 'loadMorePlantsBtn',
                style: { margin: '20px auto', display: 'block', width: 'fit-content' },
                onclick: () => {
                    state.plantsPageOffset += PAGE_SIZE;
                    state.appendingPlants = true;
                    renderPlants(true);
                    state.appendingPlants = false; // Reset for next time
                }
            }, 'Load More Plants');

            // Append after grid (or inside container? The grid is the container.)
            // We can't append button TO the grid if the grid is CSS grid, it will look like a card.
            // Better to append to the parent of the grid or have a container.
            // But the HTML structure is: <div id="plantsContent"> ... <div id="allPlantsGrid"></div> </div>
            // So we should append to plantsContent.
            const container = document.getElementById("plantsContent");
            if (container) {
                // Ensure button is at bottom
                container.appendChild(loadMoreBtn);
            }
        }
    }
}

function createPlantCard(plant) {
    const statusClass = `status-${plant.status || 'healthy'}`;
    const statusText = plant.status
        ? plant.status.charAt(0).toUpperCase() + plant.status.slice(1)
        : 'Healthy';

    return el('div', { className: 'plant-card', onclick: () => document.dispatchEvent(new CustomEvent('show-plant-details', { detail: plant.id })) },
        el('div', { className: 'plant-image' }, plant.emoji || '🌱'),
        el('div', { className: 'plant-card-body' },
            el('h3', { className: 'plant-name' }, plant.name),
            el('span', { className: `plant-status ${statusClass}` }, statusText),
            el('p', { className: 'plant-info' },
                `📍 ${plant.location}`,
                el('br'),
                `📏 Height: ${plant.height} cm`,
                el('br'),
                (plant.owner_username || plant.owner_email) ? el('small', { style: 'color: var(--text-tertiary)' }, `👤 Owner: ${plant.owner_username || plant.owner_email}`) : null
            ),
            el('div', { className: 'card-actions', style: { display: 'flex', gap: '8px' } },
                el('button', { className: 'view-details-btn', style: { flex: 1 } }, 'View Details'),
                plant.coords ? el('button', {
                    className: 'btn btn-outline btn-sm',
                    title: 'Live Satellite',
                    onclick: (e) => {
                        e.stopPropagation();
                        // Navigate to map and trigger live mode
                        localStorage.setItem('pm_currentPage', 'map');
                        localStorage.setItem('pm_pending_live_sat_id', plant.id);
                        window.location.reload();
                    }
                }, '📡') : null,
                plant.coords ? el('button', {
                    className: 'btn btn-outline btn-sm',
                    onclick: (e) => {
                        e.stopPropagation();
                        document.dispatchEvent(new CustomEvent('view-plant-on-map', { detail: plant.id }));
                    }
                }, '📍') : null
            )
        )
    );
}

function renderPlantDetailsUI(plant) {
    const container = document.getElementById("plantDetailsContainer");
    container.innerHTML = ""; // Clear

    const statusClass = `status-${plant.status || 'healthy'}`;
    const statusText = plant.status ? plant.status.charAt(0).toUpperCase() + plant.status.slice(1) : 'Healthy';

    const card = el('div', { className: 'plant-details-card' },
        el('div', { className: 'plant-details-header' },
            el('div', {},
                el('h2', {}, plant.name),
                el('div', { className: 'details-sub' }, `📍 ${plant.location}`)
            ),
            el('div', { className: 'details-actions' },
                el('span', { className: `plant-status ${statusClass}` }, statusText),
                el('button', {
                    className: 'btn btn-sm',
                    id: 'markInspected',
                    onclick: () => document.dispatchEvent(new CustomEvent('mark-inspected', { detail: plant.id }))
                }, 'Mark Inspected'),
                el('button', {
                    className: 'btn btn-outline btn-sm',
                    id: 'requestUpdate',
                    onclick: () => document.dispatchEvent(new CustomEvent('request-update', { detail: plant }))
                }, 'Request Update')
            )
        ),
        el('div', { className: 'details-layout' },
            el('div', {},
                el('div', { className: 'tabs', role: 'tablist' },
                    createTab('Overview', 'overview', true),
                    createTab('Timeline', 'timeline'),
                    createTab('Gallery', 'gallery')
                ),
                // Overview Panel
                el('div', { className: 'tab-panel active', dataset: { panel: 'overview' }, role: 'tabpanel' },
                    el('h3', { className: 'section-title' }, 'Plant Information'),
                    el('div', { className: 'plant-attributes' },
                        createAttr('Size', `${plant.size} x ${plant.height} cm`),
                        createAttr('Height', `${plant.height} cm`),
                        createAttr('Age', plant.age),
                        createAttr('Soil Type', plant.soil_type),
                        createAttr('Last Watered', formatDateTime(plant.last_watered))
                    )
                ),
                // Timeline Panel
                el('div', { className: 'tab-panel', dataset: { panel: 'timeline' }, role: 'tabpanel' },
                    el('div', { className: 'timeline-section' },
                        el('h3', {}, 'Development Timeline'),
                        el('div', { className: 'timeline' },
                            (plant.timeline || []).map(item => el('div', { className: 'timeline-item' },
                                el('div', { className: 'timeline-date' }, formatDateTime(item.created_at)),
                                el('div', { className: 'timeline-content' },
                                    el('div', { className: 'timeline-title' }, item.event_type || 'Update'),
                                    el('div', { className: 'timeline-description' }, item.description || '-'),
                                    item.media_url ?
                                        el('img', {
                                            src: `${API_BASE_URL}${item.media_url}`,
                                            className: 'timeline-media clickable-image',
                                            style: { width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' },
                                            onclick: () => openImageModal(`${API_BASE_URL}${item.media_url}`)
                                        }) :
                                        el('div', {
                                            className: 'timeline-image clickable-image',
                                            onclick: () => openImageModal(item.emoji || '📝')
                                        }, item.emoji || '📝')
                                )
                            ))
                        )
                    )
                ),
                // Gallery Panel
                el('div', { className: 'tab-panel', dataset: { panel: 'gallery' }, role: 'tabpanel' },
                    el('h3', { className: 'section-title' }, 'Gallery'),
                    el('div', { className: 'plant-gallery' },
                        (plant.images || []).length > 0 ? (plant.images || []).map(img =>
                            el('div', { className: 'gallery-image-container', style: { position: 'relative' } },
                                el('img', {
                                    src: `${API_BASE_URL}${img.image_url}`,
                                    className: 'clickable-image',
                                    style: { width: '100%', height: '200px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' },
                                    onclick: () => openImageModal(`${API_BASE_URL}${img.image_url}`)
                                }),
                                el('div', {
                                    style: { position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }
                                }, formatDateTime(img.created_at))
                            )
                        ) : el('p', { style: { color: 'var(--text-tertiary)', textAlign: 'center', padding: '40px' } }, 'No images uploaded yet')
                    )
                )
            ),
            el('aside', { className: 'sticky-card' },
                el('h3', {}, 'Key Stats'),
                createStickyRow('Status', statusText),
                createStickyRow('Height', `${plant.height} cm`),
                createStickyRow('Last Watered', formatDateTime(plant.last_watered)),
                createStickyRow('Soil', plant.soil_type),
                plant.coords ? el('button', {
                    className: 'btn btn-primary',
                    style: { width: '100%', marginTop: '16px', background: '#6366f1', justifyContent: 'center' },
                    onclick: () => {
                        localStorage.setItem('pm_currentPage', 'map');
                        localStorage.setItem('pm_pending_live_sat_id', plant.id);
                        window.location.reload();
                    }
                }, '📡 LIVE SATELLITE') : null
            )
        )
    );

    container.appendChild(card);
    setupTabListeners();
}

function createTab(label, name, active = false) {
    return el('button', {
        className: `tab ${active ? 'active' : ''}`,
        type: 'button',
        dataset: { tab: name },
        role: 'tab'
    }, label);
}

function createAttr(label, value) {
    return el('div', { className: 'attribute-item' },
        el('div', { className: 'attribute-label' }, label),
        el('div', { className: 'attribute-value' }, value || '-')
    );
}

function createStickyRow(label, value) {
    return el('div', { className: 'sticky-row' },
        el('span', {}, label),
        el('strong', {}, value || '-')
    );
}

function setupTabListeners() {
    document.querySelectorAll("[data-tab]").forEach((t) => {
        t.addEventListener("click", () => {
            document.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === t));
            const tab = t.getAttribute("data-tab");
            document.querySelectorAll("[data-panel]").forEach((p) => {
                p.classList.toggle("active", p.getAttribute("data-panel") === tab);
            });
        });
    });
}

// Contacts Element Builder
function renderContactsUI() {
    const contactsList = document.getElementById("contactsList");
    if (!contactsList) return;
    contactsList.innerHTML = "";

    const filtered = (state.contactsData || []).filter((c) => {
        if (!state.contactQuery) return true;
        const hay = `${c.name} ${c.role}`.toLowerCase();
        return hay.includes(state.contactQuery);
    });

    if (filtered.length === 0) {
        contactsList.appendChild(el('div', { className: 'empty-state-message', style: { padding: '20px', textAlign: 'center', color: 'var(--text-light)' } },
            'No contacts yet. Connect with a steward to start messaging!'
        ));
        return;
    }

    filtered.forEach((contact) => {
        const last = contact.messages?.[contact.messages.length - 1];
        const preview = last ? last.text : "Connected! Start a conversation.";
        const time = last ? last.time : "";
        const isActive = state.selectedContact && state.selectedContact.id === contact.id;

        const item = el('div', {
            className: `contact-item ${isActive ? 'active' : ''}`,
            onclick: () => document.dispatchEvent(new CustomEvent('select-contact', { detail: contact.id }))
        },
            el('div', { className: 'contact-avatar' }, contact.initials),
            el('div', { className: 'contact-info' },
                el('div', { className: 'contact-name' }, contact.name),
                el('div', { className: 'contact-role' }, `${contact.role} ${time ? '· ' + time : ''}`),
                el('div', { className: 'contact-preview' }, preview)
            ),
            contact.unread ? el('span', { className: 'pill', title: `${contact.unread} unread` }, contact.unread.toString()) : null
        );
        contactsList.appendChild(item);
    });
}

// Render Messages
function renderMessages(messages) {
    const area = document.getElementById("messagesArea");
    if (!area) return;
    area.innerHTML = "";

    if (messages.length === 0) {
        area.appendChild(el('div', { className: 'empty-state-message' }, 'No messages yet. Start the conversation!'));
        return;
    }

    const currentUserEmail = localStorage.getItem("pm_user_email");
    const myInitials = (localStorage.getItem("pm_user_name") || "Me").substring(0, 2).toUpperCase();

    const fragment = document.createDocumentFragment();

    messages.forEach(dbMsg => {
        const isSent = dbMsg.sender_email === currentUserEmail;

        // Avatar
        let avatarEl = null;
        if (!isSent && state.selectedContact) {
            avatarEl = el('div', { className: 'message-avatar' }, state.selectedContact.initials || "?");
        } else if (isSent) {
            avatarEl = el('div', { className: 'message-avatar' }, myInitials);
        }

        const date = new Date(dbMsg.created_at);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const msgEl = el('div', { className: `message ${isSent ? 'sent' : 'received'}` },
            avatarEl,
            el('div', {},
                el('div', { className: 'message-bubble' }, dbMsg.message_text),
                el('div', { className: 'message-time' }, timeStr)
            )
        );

        fragment.appendChild(msgEl);
    });

    area.appendChild(fragment);
    area.scrollTop = area.scrollHeight;
}


// ===================================
// RENDERERS
// ===================================

function renderWeather(data) {

    const container = document.getElementById("weatherWidget");
    if (!container || !data) return;

    // Helper functions for weather
    function getWeatherEmoji(code) {
        if (code === 0) return "☀️";
        if (code <= 3) return "⛅";
        if (code === 45 || code === 48) return "🌫️";
        if (code <= 55) return "🌦️";
        if (code <= 65) return "🌧️";
        if (code <= 75) return "❄️";
        if (code <= 82) return "🌧️";
        if (code <= 99) return "⛈️";
        return "⛅";
    }

    function getWeatherTheme(code, isNight) {
        if (isNight) return "night-theme";
        if (code === 0 || code === 1) return "sunny-theme";
        if (code <= 3) return "cloudy-theme";
        if (code <= 65) return "rainy-theme";
        if (code >= 95) return "storm-theme";
        return "";
    }

    const current = {
        temp: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        code: data.current.weather_code,
        wind: data.current.wind_speed_10m,
        isDay: data.current.is_day,
        emoji: getWeatherEmoji(data.current.weather_code)
    };

    const todayDaily = data.daily;
    const uvIndex = todayDaily.uv_index_max[0];
    const sunrise = new Date(todayDaily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sunset = new Date(todayDaily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const currentHour = new Date().getHours();
    const hourlyData = [];
    for (let i = currentHour + 1; i < currentHour + 13; i++) {
        if (data.hourly.time[i]) {
            const d = new Date(data.hourly.time[i]);
            hourlyData.push({
                time: d.toLocaleTimeString([], { hour: 'numeric' }),
                temp: Math.round(data.hourly.temperature_2m[i]),
                emoji: getWeatherEmoji(data.hourly.weather_code[i])
            });
        }
    }

    container.className = `weather-widget ${getWeatherTheme(current.code, !current.isDay)}`;

    // Safety check: Weather data comes from API, not user. innerHTML is acceptable for speed in drafted code,
    // but cleaner to refactor later.
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const forecast = data.daily.time.slice(1, 5).map((time, i) => {
        const date = new Date(time);
        return {
            day: days[date.getDay()],
            temp: Math.round(data.daily.temperature_2m_max[i + 1]),
            emoji: getWeatherEmoji(data.daily.weather_code[i + 1])
        };
    });

    // Using string template heavily here still...
    container.innerHTML = "";
    container.appendChild(el('div', { style: { flex: '1' } },
        el('div', { className: 'weather-current', style: { marginBottom: '20px' } },
            el('div', { className: 'weather-icon-large' }, current.emoji),
            el('div', {},
                el('div', { className: 'weather-temp' }, `${current.temp}°C`),
                el('div', { className: 'weather-desc' }, `${current.isDay ? 'Daytime' : 'Night'} · Wind: ${current.wind} km/h`)
            )
        ),

        el('div', { className: 'weather-details-grid' },
            el('div', { className: 'weather-detail-item' }, el('span', {}, '💧'), ` H: ${current.humidity}%`),
            el('div', { className: 'weather-detail-item' }, el('span', {}, '☀️'), ` UV: ${uvIndex}`),
            el('div', { className: 'weather-detail-item' }, el('span', {}, '🌅'), ` ${sunrise}`),
            el('div', { className: 'weather-detail-item' }, el('span', {}, '🌇'), ` ${sunset}`)
        ),

        el('div', { className: 'weather-scroll-container' },
            el('div', { className: 'weather-hourly' },
                hourlyData.map(h => el('div', { className: 'hourly-item' },
                    el('div', { className: 'hourly-time' }, h.time),
                    el('div', { style: { fontSize: '18px' } }, h.emoji),
                    el('div', { className: 'hourly-temp' }, `${h.temp}°`)
                ))
            )
        )
    ));

    container.appendChild(el('div', {
        className: 'weather-side',
        style: { marginLeft: '24px', paddingLeft: '24px', borderLeft: '1px solid rgba(0,0,0,0.05)' }
    },
        el('div', {
            style: { fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }
        }, '4-Day Forecast'),
        el('div', {
            className: 'weather-forecast',
            style: { flexDirection: 'column', gap: '12px' }
        },
            forecast.map(d => el('div', {
                className: 'forecast-day',
                style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', textAlign: 'left' }
            },
                el('div', { className: 'forecast-date', style: { width: '30px', fontWeight: '600' } }, d.day),
                el('div', { className: 'forecast-icon' }, d.emoji),
                el('div', { className: 'forecast-temp' }, `${d.temp}°`)
            ))
        )
    ));
}

export function renderTasks() {
    const todoList = document.getElementById("todoList");
    if (todoList) {
        todoList.innerHTML = "";
        state.tasksData.forEach(task => {
            const item = el('div', { className: 'todo-item', id: `task-${task.id}` },
                el('div', {
                    className: `todo-check ${task.status === 'completed' ? 'checked' : ''}`,
                    onclick: () => window.toggleTask(task.id)
                }, task.status === 'completed' ? '✓' : ''),
                el('div', { className: 'todo-content' },
                    el('div', { className: 'todo-title' }, task.title),
                    el('div', { className: 'todo-meta' }, `Due: ${task.date} · ${task.zone}`)
                )
            );
            todoList.appendChild(item);
        });
    }

    // Simple Mini Calendar Mock (Static)
    const miniCalendar = document.getElementById("miniCalendar");
    if (miniCalendar) {
        miniCalendar.innerHTML = "";
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        const dates = Array.from({ length: 30 }, (_, i) => i + 1);

        const grid = el('div', { className: 'calendar-grid' });
        days.forEach(d => grid.appendChild(el('div', { style: { fontWeight: 'bold', color: '#aaa', fontSize: '12px' } }, d)));

        dates.forEach(date => {
            const hasTask = state.tasksData.some(t => t.date.includes(String(date)) || (date === 22 && t.date === 'Today'));
            const isActive = date === 22;
            grid.appendChild(el('div', { className: `cal-day ${isActive ? 'active' : ''} ${hasTask ? 'has-task' : ''}` }, date));
        });

        miniCalendar.appendChild(grid);
    }
}

export function renderFinancials() {
    if (document.getElementById("finCurrentVal")) {
        const data = state.financialData || {};
        document.getElementById("finCurrentVal").textContent = "$" + (data.currentValue || 0).toLocaleString();
        document.getElementById("finTotalInv").textContent = "$" + (data.totalInvestment || 0).toLocaleString();
        document.getElementById("finRoi").textContent = (data.roi || 0) + "%";
    }

    const projChart = document.getElementById("projectionChart");
    if (projChart && state.financialData.projections) {
        projChart.innerHTML = "";
        const max = Math.max(...state.financialData.projections.map(p => p.value));
        state.financialData.projections.forEach((p, i) => {
            const h = (p.value / max) * 100;
            const isProj = i === state.financialData.projections.length - 1;
            projChart.appendChild(el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } },
                el('div', { className: `chart-bar ${isProj ? 'projected' : ''}`, style: { height: `${h}%` }, title: `$${p.value}` }),
                el('span', { style: { fontSize: '12px', color: '#666' } }, p.month)
            ));
        });
    }

    const bdChart = document.getElementById("breakdownChart");
    if (bdChart && state.financialData.breakdown) {
        bdChart.innerHTML = "";
        state.financialData.breakdown.forEach(b => {
            bdChart.appendChild(el('div', { style: { marginBottom: '12px' } },
                el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' } },
                    el('span', {}, b.category),
                    el('strong', {}, `${b.percentage}%`)
                ),
                el('div', { style: { height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: `${b.percentage}%`, background: '#27ae60' } })
                )
            ));
        });
    }
}

export function renderNotifications(notifs) {
    const container = document.getElementById("notificationsList");
    const badge = document.getElementById("notifBadge");

    const unread = notifs.filter(n => !n.is_read).length;
    if (badge) badge.style.display = unread > 0 ? 'block' : 'none';

    if (!container) return;
    container.innerHTML = "";

    if (notifs.length === 0) {
        container.appendChild(el('div', { className: 'empty-state' }, el('p', {}, 'No notifications yet')));
        return;
    }

    notifs.forEach(n => {
        container.appendChild(el('div', {
            className: `notification-item ${n.is_read ? 'read' : 'unread'}`,
            onclick: () => window.handleNotifClick(n.post_id)
        },
            el('div', { className: 'notif-content' },
                el('p', {}, el('strong', {}, n.sender_name), ` ${n.message}`),
                el('span', {}, timeAgo(n.created_at))
            ),
            el('button', {
                className: 'btn-got-it',
                onclick: (e) => {
                    e.stopPropagation();
                    window.dismissNotification(n.id, e.currentTarget);
                }
            }, 'Got it')
        ));
    });
}

export function renderTopContributors(top) {
    const container = document.querySelector(".comm-card .contributor-row")?.parentElement;
    if (!container) return;

    const title = container.querySelector('h3');
    container.innerHTML = '';
    if (title) container.appendChild(title);

    const medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    top.forEach((user, i) => {
        container.appendChild(el('div', { className: 'contributor-row' },
            el('span', {}, medals[i] || '🏅'),
            el('span', {}, user.author),
            el('small', { style: { marginLeft: 'auto', color: '#999' } }, `${user.totalLikes} ❤️`)
        ));
    });

    if (top.length === 0) {
        container.appendChild(el('p', { style: { fontSize: '12px', color: '#999', padding: '10px' } }, 'Starting to grow...'));
    }
}

export function renderTrends(trends) {
    const list = document.querySelector(".trend-list");
    if (!list) return;

    list.innerHTML = "";
    if (trends.length === 0) {
        list.appendChild(el('li', { style: { color: '#999', fontSize: '12px' } }, 'No hot topics yet'));
        return;
    }

    trends.forEach(t => {
        list.appendChild(el('li', { onclick: () => window.filterByTrend(t.type) }, `#${t.type} (${t.count})`));
    });
}

export function renderStewards() {
    const list = document.getElementById("stewardsList");
    if (!list) return;

    list.innerHTML = "";

    const query = (state.stewardSearchQuery || "").toLowerCase();
    const currentUserEmail = localStorage.getItem("pm_user_email");
    const filtered = state.availableStewards.filter(s =>
        s.email !== currentUserEmail &&
        ((s.username || "").toLowerCase().includes(query) ||
            (s.role || "").toLowerCase().includes(query))
    );

    if (filtered.length === 0) {
        list.appendChild(el('div', { className: 'empty-state' },
            state.availableStewards.length === 0 ? 'No stewards found in the grove.' : 'No stewards match your search.'
        ));
        return;
    }

    filtered.forEach(s => {
        const item = el('div', { className: 'steward-card' },
            el('div', { className: 'steward-avatar' }, s.avatar || '👨‍🌾'),
            el('div', { className: 'steward-info' },
                el('h4', {}, s.username || 'Anonymous Steward'),
                el('p', { className: 'steward-role' }, s.bio || ''),
                el('div', { className: 'steward-badges' },
                    el('span', { className: 'badge' }, '✓ Verified'),
                    el('span', { className: 'badge' }, '⭐ 4.9')
                )
            ),
            el('div', { className: 'steward-actions' },
                s.connection_status === 'accepted' ?
                    el('button', { className: 'btn btn-outline', disabled: true }, 'Connected') :
                    s.connection_status === 'pending' ?
                        el('button', { className: 'btn btn-outline', disabled: true }, 'Request Sent') :
                        el('button', {
                            className: 'btn btn-primary',
                            onclick: async (e) => {
                                const btn = e.currentTarget;
                                btn.disabled = true;
                                btn.textContent = 'Sending...';
                                const ok = await window.sendConnectionRequest(s.email);
                                if (ok) {
                                    btn.textContent = 'Request Sent';
                                    toast("Request sent to " + (s.username || 'Steward'));
                                } else {
                                    btn.disabled = false;
                                    btn.textContent = 'Connect';
                                    toast("Failed to send request.");
                                }
                            }
                        }, 'Connect')
            )
        );
        list.appendChild(item);
    });
}

function sortPlants(plants, mode) {
    const parseHeight = (h) => {
        const m = String(h || "").match(/[\d.]+/);
        return m ? Number(m[0]) : 0;
    };
    const arr = [...plants];
    if (mode === "name-asc")
        arr.sort((a, b) => a.name.localeCompare(b.name));
    if (mode === "name-desc")
        arr.sort((a, b) => b.name.localeCompare(a.name));
    if (mode === "height-asc")
        arr.sort((a, b) => parseHeight(a.height) - parseHeight(b.height));
    if (mode === "height-desc")
        arr.sort((a, b) => parseHeight(b.height) - parseHeight(a.height));
    return arr;
}

function openImageModal(srcOrEmoji) {
    const modal = document.getElementById("imageModal");
    const modalImage = document.getElementById("modalImage");

    if (!modal || !modalImage) {
        console.error("[UI] imageModal or modalImage elements missing");
        return;
    }

    if (typeof srcOrEmoji !== 'string') return;

    if (srcOrEmoji.startsWith('http') || srcOrEmoji.startsWith('data:') || srcOrEmoji.startsWith('/') || srcOrEmoji.includes('.')) {
        modalImage.src = srcOrEmoji;
    } else {
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#E8F5E9";
        ctx.fillRect(0, 0, 400, 400);
        ctx.font = "200px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(srcOrEmoji, 200, 200);

        modalImage.src = canvas.toDataURL();
    }

    modal.style.display = "flex";
    modal.style.zIndex = "9999"; // Force top
    setTimeout(() => {
        modal.classList.add("active");
    }, 10);
}

// Expose globally for event handlers if needed
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

function closeImageModal() {
    const m = document.getElementById("imageModal");
    if (m) {
        m.classList.remove("active");
        setTimeout(() => {
            if (!m.classList.contains('active')) {
                m.style.display = "none";
            }
        }, 300);
    }
}

function escapeHtml(str) {
    return String(str || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function initSystemCommunications() {
    try {
        const { fetchBroadcast } = await import('./api.js');
        const data = await fetchBroadcast();
        if (!data) return;

        // 1. Handle Alert Banner
        const banner = document.getElementById("globalAlertBanner");
        const bannerText = document.getElementById("alertBannerText");
        const closeBtn = document.getElementById("closeAlertBanner");

        if (banner && data.alert && data.alert.active && data.alert.message) {
            const currentAlertId = data.alert.timestamp || data.alert.message;
            const isDismissed = sessionStorage.getItem('alert_banner_dismissed_id') === currentAlertId;

            if (!isDismissed) {
                bannerText.textContent = data.alert.message;
                banner.style.display = "flex";
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        banner.style.display = "none";
                        sessionStorage.setItem('alert_banner_dismissed_id', currentAlertId);
                    };
                }
            } else {
                banner.style.display = "none";
            }
        } else if (banner) {
            banner.style.display = "none";
        }

        // 2. Handle Broadcast Modal
        if (data.broadcast && data.broadcast.active && data.broadcast.message) {
            const currentId = data.broadcast.timestamp || data.broadcast.message;
            const lastShown = localStorage.getItem('last_broadcast_id');

            if (lastShown !== currentId) {
                alertModal(data.broadcast.message);
                localStorage.setItem('last_broadcast_id', currentId);
            }
        }
    } catch (err) {
        console.error("[UI] Init System Communications Error:", err);
    }
}

function alertModal(message) {
    const modal = el('div', { class: 'modal active', style: 'display: flex; z-index: 10000;' },
        el('div', { class: 'modal-backdrop' }),
        el('div', { class: 'modal-content', style: 'max-width: 500px; text-align: center; padding: 40px;' },
            el('h3', { style: 'margin-bottom: 20px;' }, '📢 System Broadcast'),
            el('p', { style: 'margin-bottom: 30px; line-height: 1.6; color: var(--text-primary); font-weight: 600; font-size: 1.1rem;' }, message),
            el('button', {
                class: 'btn btn-primary',
                style: 'width: 100%; display: flex; justify-content: center; align-items: center;',
                onclick: (e) => {
                    const m = e.target.closest('.modal');
                    m.classList.remove('active');
                    setTimeout(() => m.remove(), 300);
                }
            }, 'Understood')
        )
    );
    document.body.appendChild(modal);
}

export {
    el,
    toast,
    renderSkeleton,
    hideSkeleton,
    showSkeleton,
    formatDateTime,
    timeAgo,
    updateBreadcrumbs,
    updateStats,
    updateNavProfile,
    renderPlants,
    renderPlantDetailsUI,
    renderContactsUI,
    renderMessages,
    renderCommunityFeed,
    renderComments,
    renderWeather,
    sortPlants,
    escapeHtml,
    initSystemCommunications,
    openImageModal,
    closeImageModal
};
// ===================================
// CSS INJECTION FOR DYNAMIC COMPONENTS
// ===================================

const UI_STYLES = `
.ui-dialog {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    align-items: center;
    justify-content: center;
}
.ui-dialog.active {
    display: flex;
}
.ui-dialog-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
}
.ui-dialog-card {
    position: relative;
    width: min(420px, calc(100vw - 32px));
    background: var(--bg-primary);
    border-radius: 20px;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    z-index: 1;
    border: 1px solid var(--gray-200);
    animation: ui-scale-in 0.2s ease-out;
}
@keyframes ui-scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.ui-dialog-header {
    padding: 24px 24px 20px;
    background: var(--bg-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--gray-100);
}
.ui-dialog-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
}
.ui-dialog-body {
    padding: 24px;
}
.ui-dialog-msg {
    color: var(--text-secondary);
    font-size: 16px;
    line-height: 1.5;
    margin: 0 0 24px;
}
.ui-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
.ui-btn {
    padding: 10px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-family: inherit;
}
.ui-btn-outline {
    background: transparent;
    border: 1px solid var(--primary);
    color: var(--primary);
}
.ui-btn-outline:hover {
    background: var(--primary-light);
    color: white;
}
.ui-btn-danger {
    background: #ef4444;
    color: #fff;
    box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2), 0 2px 4px -1px rgba(239, 68, 68, 0.06);
}
.ui-btn-danger:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
}
.ui-prompt-input {
    width: 100%;
    min-height: 100px;
    padding: 12px;
    margin-top: 12px;
    border: 1px solid var(--gray-200);
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border-radius: 12px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
}
.ui-prompt-input:focus {
    border-color: var(--primary);
}
`;

function injectStyles() {
    if (document.getElementById("ui-dynamic-styles")) return;
    const style = document.createElement("style");
    style.id = "ui-dynamic-styles";
    style.textContent = UI_STYLES;
    document.head.appendChild(style);
}

// ===================================
// CUSTOM DIALOGS
// ===================================

export function confirm(title, message, okText = "Confirm", cancelText = "Cancel") {
    injectStyles();

    return new Promise((resolve) => {
        let dialog = document.getElementById("uiConfirmDialog");
        if (!dialog) {
            dialog = el('div', { id: 'uiConfirmDialog', className: 'ui-dialog' },
                el('div', { className: 'ui-dialog-backdrop' }),
                el('div', { className: 'ui-dialog-card' },
                    el('div', { className: 'ui-dialog-header' },
                        el('h3', { id: 'uiConfirmTitle' }, title)
                        // Close button removed as requested
                    ),
                    el('div', { className: 'ui-dialog-body' },
                        el('p', { id: 'uiConfirmMsg', className: 'ui-dialog-msg' }, message),
                        el('div', { className: 'ui-dialog-actions' },
                            el('button', { className: 'ui-btn ui-btn-outline', id: 'uiConfirmCancel' }, cancelText),
                            el('button', { className: 'ui-btn ui-btn-danger', id: 'uiConfirmOk' }, okText)
                        )
                    )
                )
            );
            document.body.appendChild(dialog);
        } else {
            document.getElementById("uiConfirmTitle").textContent = title;
            document.getElementById("uiConfirmMsg").textContent = message;
            document.getElementById("uiConfirmOk").textContent = okText;
            document.getElementById("uiConfirmCancel").textContent = cancelText;
        }

        const onCancel = () => {
            dialog.classList.remove("active");
            resolve(false);
        };

        const onOk = () => {
            dialog.classList.remove("active");
            resolve(true);
        };

        const okBtn = document.getElementById("uiConfirmOk");
        const cancelBtn = document.getElementById("uiConfirmCancel");
        const backdrop = dialog.querySelector(".ui-dialog-backdrop");

        // Use onclick to overwrite previous listeners if dialog reused
        okBtn.onclick = onOk;
        cancelBtn.onclick = onCancel;
        backdrop.onclick = onCancel;

        dialog.classList.add("active");
    });
}

export function alert(title, message, okText = "OK") {
    injectStyles();

    return new Promise((resolve) => {
        let dialog = document.getElementById("uiAlertDialog");
        if (!dialog) {
            dialog = el('div', { id: 'uiAlertDialog', className: 'ui-dialog' },
                el('div', { className: 'ui-dialog-backdrop' }),
                el('div', { className: 'ui-dialog-card' },
                    el('div', { className: 'ui-dialog-header' },
                        el('h3', { id: 'uiAlertTitle' }, title)
                    ),
                    el('div', { className: 'ui-dialog-body' },
                        el('p', { id: 'uiAlertMsg', className: 'ui-dialog-msg' }, message),
                        el('div', { className: 'ui-dialog-actions' },
                            el('button', { className: 'ui-btn ui-btn-danger', id: 'uiAlertOk' }, okText)
                        )
                    )
                )
            );
            document.body.appendChild(dialog);
        } else {
            document.getElementById("uiAlertTitle").textContent = title;
            document.getElementById("uiAlertMsg").textContent = message;
            document.getElementById("uiAlertOk").textContent = okText;
        }

        const onOk = () => {
            dialog.classList.remove("active");
            resolve();
        };

        const okBtn = document.getElementById("uiAlertOk");
        const backdrop = dialog.querySelector(".ui-dialog-backdrop");

        okBtn.onclick = onOk;
        backdrop.onclick = onOk;

        dialog.classList.add("active");
    });
}

export function prompt(title, message, placeholder = "", okText = "Submit", cancelText = "Cancel") {
    injectStyles();

    return new Promise((resolve) => {
        let dialog = document.getElementById("uiPromptDialog");
        if (!dialog) {
            dialog = el('div', { id: 'uiPromptDialog', className: 'ui-dialog' },
                el('div', { className: 'ui-dialog-backdrop' }),
                el('div', { className: 'ui-dialog-card' },
                    el('div', { className: 'ui-dialog-header' },
                        el('h3', { id: 'uiPromptTitle' }, title)
                    ),
                    el('div', { className: 'ui-dialog-body' },
                        el('p', { id: 'uiPromptMsg', className: 'ui-dialog-msg' }, message),
                        el('textarea', { id: 'uiPromptInput', className: 'ui-prompt-input', placeholder: placeholder }),
                        el('div', { className: 'ui-dialog-actions' },
                            el('button', { className: 'ui-btn ui-btn-outline', id: 'uiPromptCancel' }, cancelText),
                            el('button', { className: 'ui-btn ui-btn-danger', id: 'uiPromptOk' }, okText)
                        )
                    )
                )
            );
            document.body.appendChild(dialog);
        } else {
            document.getElementById("uiPromptTitle").textContent = title;
            document.getElementById("uiPromptMsg").textContent = message;
            document.getElementById("uiPromptInput").value = "";
            document.getElementById("uiPromptInput").placeholder = placeholder;
            document.getElementById("uiPromptOk").textContent = okText;
            document.getElementById("uiPromptCancel").textContent = cancelText;
        }

        const onCancel = () => {
            dialog.classList.remove("active");
            resolve(null);
        };

        const onOk = () => {
            const val = document.getElementById("uiPromptInput").value;
            dialog.classList.remove("active");
            resolve(val);
        };

        const okBtn = document.getElementById("uiPromptOk");
        const cancelBtn = document.getElementById("uiPromptCancel");
        const backdrop = dialog.querySelector(".ui-dialog-backdrop");

        okBtn.onclick = onOk;
        cancelBtn.onclick = onCancel;
        backdrop.onclick = onCancel;

        dialog.classList.add("active");
        document.getElementById("uiPromptInput").focus();
    });
}

// ===================================
// AUTH ACTIONS
// ===================================

export async function handleLogout() {
    const ok = await confirm("Logout?", "Are you sure you want to logout?", "Logout", "Cancel");
    if (ok) {
        // Clear all session data
        localStorage.removeItem("pm_token");
        localStorage.removeItem("pm_user_email");
        localStorage.removeItem("pm_user_role");
        localStorage.removeItem("pm_user_name");
        localStorage.removeItem("pm_user_avatar");
        localStorage.removeItem("pm_steward_status");

        window.location.href = "index.html";
    }
}

// Expose to window for non-module scripts
window.ui = {
    handleLogout,
    confirm,
    alert,
    prompt,
    toast,
    renderPlants,
    renderPlantDetailsUI,
    updateNavProfile
};
export async function renderSubscriptionPage() {
    const host = document.getElementById("subscriptionDetails");
    if (!host) return;

    host.innerHTML = '<div class="loading">Fetching plan details...</div>';

    const email = localStorage.getItem("pm_user_email");
    const profile = await api.fetchUserProfile(email);

    if (!profile) {
        host.innerHTML = '<div class="error">Failed to load subscription data.</div>';
        return;
    }

    const tier = profile.subscription_tier || 'free';
    const isPremium = tier === 'premium';
    const billingCycle = profile.billing_cycle || 'monthly';

    // State for selection (shared via closure or state)
    if (!state.selectedBillingCycle) state.selectedBillingCycle = 'monthly';

    // Quotas
    const imgUsed = profile.ai_img_count || 0;
    const deepUsed = profile.ai_deep_scan_count || 0;

    const quotas = await api.fetchQuotas() || {};
    const userTier = isPremium ? 'premium' : (profile.is_steward ? 'steward' : 'free');
    const myQuota = quotas[userTier] || { img_limit: 3, deep_scan_limit: 1 };

    const imgLimit = myQuota.img_limit === -1 ? 'Unlimited' : myQuota.img_limit;
    const deepLimit = myQuota.deep_scan_limit === -1 ? 'Unlimited' : (isPremium ? 'Unlimited' : myQuota.deep_scan_limit);

    const imgDisplay = (isPremium || imgLimit === 'Unlimited') ? 'Unlimited' : `${imgUsed} / ${imgLimit}`;
    const deepDisplay = (isPremium || deepLimit === 'Unlimited') ? 'Unlimited' : `${deepUsed} / ${deepLimit}`;

    host.innerHTML = '';
    host.appendChild(el('div', { className: 'subscription-dashboard', style: { display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px 0' } },
        // Plan Selection & Current Status
        el('div', {
            className: 'plan-card',
            style: {
                background: isPremium ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'white',
                color: isPremium ? 'white' : 'var(--text-primary)',
                padding: '30px',
                borderRadius: '24px',
                border: isPremium ? 'none' : '1px solid var(--gray-200)',
                boxShadow: isPremium ? '0 20px 40px -10px rgba(99, 102, 241, 0.4)' : 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }
        },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                el('div', {},
                    el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
                        el('h3', { style: { fontSize: '1.5em', margin: 0 } }, isPremium ? '💎 Premium Plan' : (profile.is_steward ? '🛡️ Steward Plan' : '🌿 Free Plan')),
                        (isPremium || profile.is_steward) ? el('span', { style: { background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7em', textTransform: 'uppercase', letterSpacing: '1px' } }, isPremium ? billingCycle : 'Role Benefit') : null
                    ),
                    el('p', { style: { opacity: 0.8, fontSize: '0.95em' } }, isPremium ? 'Unlimited Diagnostics & Advanced AI Support' : (profile.is_steward ? 'Enhanced Steward AI Quotas' : 'Basic Plant Health Monitoring')),
                    !isPremium ? el('div', { className: 'price-container' },
                        el('div', {
                            className: 'billing-toggle',
                            id: 'billingToggle',
                            dataset: { cycle: state.selectedBillingCycle || 'monthly' }
                        },
                            el('div', { className: 'toggle-indicator' }),
                            ['monthly', 'annually'].map(c => el('button', {
                                className: state.selectedBillingCycle === c ? 'active' : '',
                                onclick: (e) => {
                                    const container = document.getElementById('billingToggle');
                                    const priceEl = document.getElementById('priceDisplay');
                                    const buttons = container.querySelectorAll('button');

                                    state.selectedBillingCycle = c;
                                    container.dataset.cycle = c;

                                    buttons.forEach(btn => {
                                        btn.classList.toggle('active', btn.textContent.toLowerCase() === c);
                                    });

                                    priceEl.style.opacity = '0';
                                    priceEl.style.transform = 'translateY(-5px)';

                                    setTimeout(() => {
                                        priceEl.innerHTML = `
                                            <span class="price-val">${c === 'annually' ? '₱1,999' : '₱199'}</span>
                                            <span class="price-cycle">/${c === 'annually' ? 'yr' : 'mo'}</span>
                                            ${c === 'annually' ? '<span class="save-pill">Save ₱389</span>' : ''}
                                        `;
                                        priceEl.style.opacity = '1';
                                        priceEl.style.transform = 'translateY(0)';
                                    }, 150);
                                }
                            }, c.charAt(0).toUpperCase() + c.slice(1)))
                        ),
                        el('div', {
                            id: 'priceDisplay',
                            className: 'price-text'
                        },
                            el('span', { className: 'price-val' }, state.selectedBillingCycle === 'annually' ? '₱1,999' : '₱199'),
                            el('span', { className: 'price-cycle' }, `/${state.selectedBillingCycle === 'annually' ? 'yr' : 'mo'}`),
                            state.selectedBillingCycle === 'annually' ? el('span', { className: 'save-pill' }, 'Save ₱389') : null
                        )
                    ) : null
                ),
                el('button', {
                    className: 'btn',
                    style: {
                        background: isPremium ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        fontWeight: '800',
                        fontSize: '1em',
                        padding: '16px 32px',
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: isPremium ? 'none' : '0 12px 24px -8px rgba(16, 185, 129, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    },
                    onclick: async () => {
                        const nextTier = isPremium ? 'free' : 'premium';
                        const cycle = state.selectedBillingCycle || 'monthly';
                        const confirmMsg = isPremium ?
                            'Are you sure you want to cancel your Premium subscription?' :
                            `Upgrade to Premium (${cycle}) for limited time price of ${cycle === 'annually' ? '₱1,999' : '₱199'}?`;

                        const confirmed = await confirm("Subscription Change", confirmMsg);
                        if (confirmed) {
                            const res = await api.upgradeTier(nextTier, cycle);
                            if (res.message) {
                                toast(res.message);
                                const newProfile = await api.fetchUserProfile(email);
                                updateNavProfile(newProfile);
                                renderSubscriptionPage();
                            } else {
                                toast(res.error || "Upgrade failed");
                            }
                        }
                    }
                }, isPremium ? 'Manage Plan' : 'Get Premium Now')
            )
        ),

        // Quota Grid
        el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' } },
            el('div', { className: 'quota-card', style: { background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' } },
                el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                    el('div', { style: { fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Image Analysis'),
                    el('span', { style: { fontSize: '0.8em', background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '8px', color: 'var(--text-secondary)' } }, 'Weekly')
                ),
                el('div', { style: { fontSize: '2em', fontWeight: '800', color: 'var(--text-primary)' } }, imgDisplay),
                el('div', { className: 'progress-bg', style: { height: '8px', background: 'var(--gray-100)', borderRadius: '4px', marginTop: '16px', overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: imgLimit === 'Unlimited' ? '100%' : `${Math.min(100, (imgUsed / imgLimit) * 100)}%`, background: 'var(--primary)', borderRadius: '4px', transition: 'width 1s ease-out' } })
                )
            ),
            el('div', { className: 'quota-card', style: { background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' } },
                el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' } },
                    el('div', { style: { fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'AI Deep Scans'),
                    el('span', { style: { fontSize: '0.8em', background: 'var(--gray-100)', padding: '4px 8px', borderRadius: '8px', color: 'var(--text-secondary)' } }, 'Weekly')
                ),
                el('div', { style: { fontSize: '2em', fontWeight: '800', color: 'var(--text-primary)' } }, deepDisplay),
                el('div', { className: 'progress-bg', style: { height: '8px', background: 'var(--gray-100)', borderRadius: '4px', marginTop: '16px', overflow: 'hidden' } },
                    el('div', { style: { height: '100%', width: (isPremium || deepLimit === 'Unlimited' || deepLimit === -1) ? '100%' : `${Math.min(100, (deepUsed / deepLimit) * 100)}%`, background: '#a855f7', borderRadius: '4px', transition: 'width 1s ease-out' } })
                )
            )
        ),

        // Features Comparison
        el('div', { style: { background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' } },
            el('h4', { style: { fontSize: '1.25em', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' } }, 'Plan Details'),
            el('table', { style: { width: '100%', borderCollapse: 'collapse' } },
                el('thead', {},
                    el('tr', { style: { textAlign: 'left' } },
                        el('th', { style: { padding: '16px', fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase' } }, 'Feature Content'),
                        el('th', { style: { padding: '16px', fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase' } }, 'Free'),
                        el('th', { style: { padding: '16px', fontSize: '0.85em', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase' } }, 'Premium')
                    )
                ),
                el('tbody', {},
                    [
                        ['Plant Health Monitoring', '✅', '✅'],
                        ['Unlimited AI Chat', '✅', '✅'],
                        ['Image Analysis (Weekly)', (quotas.free?.img_limit || 3), 'Unlimited'],
                        ['Deep Scan Logic', (quotas.free?.deep_scan_limit || 1), 'Unlimited'],
                        ['Steward Priority', '❌', '✅'],
                        ['Ad-free Experience', '❌', '✅']
                    ].map((row, idx) => el('tr', { style: { background: idx % 2 === 0 ? 'var(--gray-50)' : 'transparent', borderRadius: '12px' } },
                        el('td', { style: { padding: '16px', fontSize: '0.95em', fontWeight: '500', color: 'var(--text-primary)', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' } }, row[0]),
                        el('td', { style: { padding: '16px', fontSize: '0.95em', color: row[1] === '❌' ? 'var(--gray-300)' : 'var(--primary)' } }, row[1]),
                        el('td', { style: { padding: '16px', fontSize: '0.95em', fontWeight: '700', color: 'var(--primary)', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' } }, row[2])
                    ))
                )
            )
        )
    ));
}
