let currentUsername = "Steward";
let currentAvatar = "👤";
let currentScheduleDate = new Date();

document.addEventListener("DOMContentLoaded", async () => {
    const email = localStorage.getItem("pm_user_email");
    const token = localStorage.getItem("pm_token");

    if (!email || !token) {
        window.location.href = "index.html?error=unauthorized";
        return;
    }

    // Immediate UI sync
    const localName = localStorage.getItem("pm_user_name");
    const localAvatar = localStorage.getItem("pm_user_avatar");
    if (localName || localAvatar) {
        if (typeof updateStewardProfileUI === 'function') {
            updateStewardProfileUI({ username: localName, avatar: localAvatar });
        } else if (typeof updateStewardUI === 'function') {
            updateStewardUI({ username: localName, avatar: localAvatar });
        }
    }

    // ATTACH LISTENERS IMMEDIATELY so UI isn't dead during fetches
    setupListeners(email);

    // Global click listener for dropdowns
    document.addEventListener("click", () => {
        document.getElementById("profileDropdown")?.classList.remove("active");
    });

    // Global ESC key listener for modals
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const activeModal = document.querySelector(".modal.active");
            if (activeModal) closeActiveModal(activeModal);
        }
    });

    // This checks status and updates the view (enrollment vs dashboard)
    await checkStewardStatus(email);

    // System Communications (Dynamic import for non-module script)
    try {
        const { initSystemCommunications } = await import('./ui.js');
        initSystemCommunications();
        setInterval(() => initSystemCommunications(), 60000);
    } catch (err) {
        console.error("Failed to load System Communications in Steward portal:", err);
    }
});

function closeActiveModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    setTimeout(() => {
        if (!modal.classList.contains('active')) {
            modal.style.display = "none";
            modal.style.zIndex = ""; // Reset z-index
        }
    }, 300);
}

async function checkStewardStatus(email) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/user-profile?email=${encodeURIComponent(email)}`);
        if (resp.ok) {
            const profile = await resp.json();

            if (profile.is_steward) {
                showDashboard(profile);
            } else {
                showEnrollment();
            }
        }
    } catch (err) {
        console.error("Status check failed:", err);
        showEnrollment();
    }
}

function showEnrollment() {
    document.getElementById("enrollmentView").style.display = "flex";
    document.getElementById("dashboardView").style.display = "none";
}

function showDashboard(profile) {
    document.getElementById("enrollmentView").style.display = "none";
    document.getElementById("dashboardView").style.display = "block";

    // Update UI elements
    updateStewardUI(profile);

    // Apply theme
    if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
    }

    // Store state
    currentUsername = profile.username || "Steward";
    if (profile.avatar) {
        currentAvatar = profile.avatar;
        selectAvatar(profile.avatar);
    }
}

function updateStewardUI(profile) {
    const avatar = document.getElementById("stewardAvatar");
    const label = document.querySelector(".dropdown-label");
    if (avatar) {
        avatar.textContent = profile.avatar || profile.username?.charAt(0).toUpperCase() || "?";
        if (profile.subscription_tier === 'premium') {
            avatar.style.border = '2px solid #a855f7';
            avatar.style.boxShadow = '0 0 8px rgba(168, 85, 247, 0.3)';
        } else {
            avatar.style.border = 'none';
            avatar.style.boxShadow = 'none';
        }
    }
    if (label) {
        let labelText = profile.role === 'admin' ? 'Administrator Account' : 'Steward Account';
        if (profile.subscription_tier === 'premium') labelText = '💎 Premium ' + labelText;
        label.textContent = labelText;
    }
}

function selectAvatar(icon) {
    currentAvatar = icon;
    document.querySelectorAll(".avatar-option").forEach(opt => {
        opt.classList.toggle("selected", opt.getAttribute("data-avatar") === icon);
    });
}

function setupListeners(email) {
    // Enrollment
    const btnEnroll = document.getElementById("btnEnroll");
    if (btnEnroll) {
        btnEnroll.addEventListener("click", async () => {
            btnEnroll.disabled = true;
            btnEnroll.textContent = "Processing...";
            try {
                const apiHost = location.port === '3001' ? '' : 'http://127.0.0.1:3001';
                const resp = await fetch(`${apiHost}/api/enroll-steward`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (resp.ok) {
                    toast("Welcome to the team, Steward!");
                    setTimeout(() => location.reload(), 1500);
                } else {
                    const errData = await resp.json().catch(() => ({}));
                    toast(`Enrollment failed: ${errData.error || 'Server error'}`);
                    btnEnroll.disabled = false;
                    btnEnroll.textContent = "Become a Steward";
                }
            } catch (err) {
                console.error("[Steward] Enrollment exception:", err);
                toast("Enrollment failed. Please check your connection.");
                btnEnroll.disabled = false;
                btnEnroll.textContent = "Become a Steward";
            }
        });
    }

    // Profile Dropdown Toggle
    const trigger = document.getElementById("userProfileTrigger");
    const dropdown = document.getElementById("profileDropdown");
    if (trigger && dropdown) {
        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });
    }



    document.getElementById("btnLogout")?.addEventListener("click", () => {
        ui.handleLogout();
    });

    // Notifications Modal
    const btnNotif = document.getElementById("btnNotifications");
    const notifModal = document.getElementById("notificationsModal");
    const closeNotif = document.getElementById("closeNotifications");

    if (btnNotif && notifModal) {
        btnNotif.addEventListener("click", () => {
            notifModal.style.display = "flex";
            setTimeout(() => notifModal.classList.add("active"), 10);
            markNotificationsRead();
        });
    }


    // Initial load of data
    loadStewardData(email);
    // Start polling
    setInterval(loadNotifications, 5000);
    loadNotifications();

    // Sync stats
    setInterval(() => {
        updateAchievementRing(email);
    }, 30000);
    updateAchievementRing(email);

    // Operation Center Listeners
    setupOpCenter();
}


async function updateAchievementRing(email) {
    const bar = document.getElementById("tasksProgressBar");
    const text = document.getElementById("ringPercent");
    if (!bar || !text) return;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/task-stats?email=${encodeURIComponent(email)}`);
        const stats = await resp.json();

        const total = stats.total || 0;
        const completed = stats.completed || 0;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

        bar.style.width = `${percent}%`;
        text.textContent = `${percent}%`;
    } catch (e) { }
}

function setupOpCenter() {
    const email = localStorage.getItem("pm_user_email");

    // Modal Selectors
    const modTasks = document.getElementById("tasksModal");
    const modSchedule = document.getElementById("scheduleModal");
    const modGrove = document.getElementById("groveModal");
    const modInventory = document.getElementById("inventoryModal");
    const modClients = document.getElementById("clientsModal");

    // Close buttons logic
    document.querySelectorAll(".modal .close-modal, .modal-backdrop, #btnCancelEdit, #btnConfirmCancel").forEach(el => {
        el.addEventListener("click", () => {
            closeActiveModal(el.closest(".modal"));
        });
    });

    // Button Listeners
    document.getElementById("btnTasks")?.addEventListener("click", () => openOpModal(modTasks, () => loadFullTasks(email, 'urgent')));
    document.getElementById("btnSchedule")?.addEventListener("click", () => openOpModal(modSchedule, () => loadSchedule(email)));
    document.getElementById("btnMyGrove")?.addEventListener("click", () => openOpModal(modGrove, () => loadGroveAnalytics(email)));
    document.getElementById("btnInventory")?.addEventListener("click", () => openOpModal(modInventory, () => loadInventory(email)));
    document.getElementById("btnClients")?.addEventListener("click", () => openOpModal(modClients, () => loadClients(email)));

    // Add Inventory Modal
    const modAddInv = document.getElementById("addInventoryModal");
    document.getElementById("btnOpenAddInventory")?.addEventListener("click", () => {
        modAddInv.style.display = "flex";
        setTimeout(() => modAddInv.classList.add("active"), 10);
    });
    document.getElementById("closeAddInventory")?.addEventListener("click", () => {
        closeActiveModal(modAddInv);
    });
    document.getElementById("addInventoryForm")?.addEventListener("submit", (e) => handleAddInventory(e, email));

    // Task Filter Listeners
    document.querySelectorAll("#tasksModal .filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#tasksModal .filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            loadFullTasks(email, btn.getAttribute("data-filter"));
        });
    });

    // Steward's Map
    const modMap = document.getElementById("stewardsMapModal");
    document.getElementById("btnStewardsMap")?.addEventListener("click", () => {
        openOpModal(modMap);
        // Reset UI for Add Mode
        const formPanel = modMap.querySelector(".form-panel");
        if (formPanel) formPanel.style.display = "block";
        const mapPanel = modMap.querySelector(".map-panel");
        if (mapPanel) mapPanel.style.gridColumn = "auto";

        initStewardMapPicker(email);
        loadClientsForDropdown(email);
    });

    // Handle Plant Submission
    document.getElementById("addPlantForm")?.addEventListener("submit", handleAddPlant);

    // Express Task creation
    const expressInput = document.getElementById("expressTaskInput");
    const expressBtn = document.getElementById("btnExpressAdd");

    if (expressInput && expressBtn) {
        const submitFn = async () => {
            const title = expressInput.value.trim();
            if (!title) return;

            expressBtn.disabled = true;
            try {
                const resp = await fetch(`${API_BASE_URL}/api/steward/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        steward_email: email,
                        title: title,
                        type: 'express',
                        due_date: new Date().toISOString()
                    })
                });
                if (resp.ok) {
                    expressInput.value = "";
                    toast("Task added!");
                    loadFullTasks(email, document.querySelector("#tasksModal .filter-btn.active")?.getAttribute("data-filter") || 'urgent');
                    updateAchievementRing(email);
                }
            } catch (e) { }
            expressBtn.disabled = false;
        };

        expressBtn.addEventListener("click", submitFn);
        expressInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") submitFn();
        });
    }
}

function openOpModal(modal, loadFn) {
    if (!modal) return;
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("active"), 10);
    if (loadFn) loadFn();
}

async function loadStewardData(email) {
    await loadTasks(email);
}

async function loadTasks(email) {
    const list = document.getElementById("stewardActivityList");
    const countEl = document.querySelector(".op-count");

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/tasks?email=${encodeURIComponent(email)}`);
        if (resp.ok) {
            const tasks = await resp.json();
            window.TASKS_DATA = tasks; // Bridge to legacy data
            if (countEl) countEl.textContent = `${tasks.length} Pending`;
            renderTaskList(list, tasks);
        }
    } catch (err) {
        console.error("Failed to load tasks:", err);
    }
}

const COMMON_TASKS = [
    { title: "Watering", emoji: "💧", type: "water" },
    { title: "Fertilizing", emoji: "🌿", type: "fertilize" },
    { title: "Pest Inspection", emoji: "🔍", type: "inspect" },
    { title: "Pruning", emoji: "✂️", type: "prune" },
    { title: "Harvesting", emoji: "🧺", type: "harvest" },
    { title: "Soil Check", emoji: "🧪", type: "soil" }
];

async function loadFullTasks(email, filter) {
    const list = document.getElementById("fullTasksList");
    if (!list) return;

    if (filter === 'common') {
        renderCommonTasksList(list, email);
        return;
    }

    list.innerHTML = `<div class="empty-state">Loading tasks...</div>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/tasks?email=${encodeURIComponent(email)}&filter=${filter}`);
        const tasks = await resp.json();

        // Update dashboard count
        const pendingCount = tasks.length; // Since API filters for pending by default if not 'urgent'/'today'
        const elCount = document.getElementById("taskPendingCount");
        if (elCount) elCount.textContent = `${pendingCount} Pending`;

        renderTaskList(list, tasks, true);
    } catch (err) {
        list.innerHTML = `<div class="empty-state">Failed to load tasks</div>`;
    }
}

function renderCommonTasksList(container, email) {
    container.innerHTML = `
        <div class="common-task-list">
            ${COMMON_TASKS.map(t => `
                <div class="common-task-item" onclick="addCommonTask('${t.title}', '${t.type}', '${email}')">
                    <span class="item-icon">${t.emoji}</span>
                    <span class="item-label">${t.title}</span>
                </div>
            `).join('')}
        </div>
    `;
}

async function addCommonTask(title, type, email) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steward_email: email,
                title: title,
                type: type,
                due_date: new Date().toISOString()
            })
        });
        if (resp.ok) {
            toast(`${title} task added!`);
            // Switch back to "All Pending" or "Today" to show the new task?
            // User requested click-to-add, so staying on Common might be okay if they want to add multiple.
            // But let's refresh the counts/stats.
            updateAchievementRing(email);
            loadTasks(email);
        }
    } catch (e) {
        toast("Failed to add common task.");
    }
}

async function loadInventory(email) {
    const list = document.getElementById("inventoryList");
    if (!list) return;
    list.innerHTML = `<div class="empty-state">Loading inventory...</div>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/inventory?email=${encodeURIComponent(email)}`);
        const items = await resp.json();
        renderInventory(list, items);
    } catch (err) {
        list.innerHTML = `<div class="empty-state">Failed to load inventory</div>`;
    }
}

async function loadGroveAnalytics(email) {
    const statsContainer = document.getElementById("groveStats");
    const plantsContainer = document.getElementById("assignedPlantsList");
    if (!statsContainer || !plantsContainer) return;

    try {
        const [statsResp, plantsResp] = await Promise.all([
            fetch(`${API_BASE_URL}/api/steward/stats?email=${encodeURIComponent(email)}`),
            fetch(`${API_BASE_URL}/api/plants?email=${encodeURIComponent(email)}`)
        ]);

        const stats = await statsResp.json();
        const plants = await plantsResp.json();

        // Correct coords if string and sync legacy global
        const parsedPlants = plants.map(p => {
            if (p.coords && typeof p.coords === 'string') {
                try { return { ...p, coords: JSON.parse(p.coords) }; }
                catch (e) { return p; }
            }
            return p;
        });
        window.plantsData = parsedPlants; // Bridge to legacy map_functions.js

        statsContainer.innerHTML = `
            <div class="stat-grid">
                <div class="stat-item"><span class="stat-val">${stats.plantCount || 0}</span><span class="stat-lbl">Plants</span></div>
                <div class="stat-item"><span class="stat-val">${stats.healthScore || 0}%</span><span class="stat-lbl">Health</span></div>
                <div class="stat-item"><span class="stat-val">${stats.tasksDone || 0}</span><span class="stat-lbl">Done</span></div>
            </div>
        `;

        renderPlants(plantsContainer, plants);
    } catch (err) {
        console.error(err);
    }
}

function renderPlants(container, plants) {
    if (plants.length === 0) {
        container.innerHTML = `<div class="empty-state">No plants in your grove</div>`;
        return;
    }

    container.innerHTML = plants.map(p => {
        const hasCoords = p.coords && p.coords !== 'null';
        return `
        <div class="steward-list-item plant-item">
            <div class="item-icon">${p.emoji || '🌿'}</div>
            <div class="item-info">
                <h4>${p.name}</h4>
                <p>
                   ${p.location} · ${p.status} <br>
                   <small style="color: var(--text-tertiary);">Owner: ${p.owner_email}</small>
                </p>
            </div>
            ${hasCoords ?
                `<div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" style="min-width: 60px;" onclick='viewPlantOnMap(${JSON.stringify(p).replace(/'/g, "&#39;")})'>View</button>
                    <button class="btn btn-sm btn-primary" style="min-width: 60px;" onclick='viewPlantDetails(${JSON.stringify(p).replace(/'/g, "&#39;")}, "edit")'>Update</button>
                </div>`
                : ''}
        </div>
    `}).join('');
}

function viewPlantOnMap(plant) {
    const modMap = document.getElementById("stewardsMapModal");
    modMap.style.zIndex = "2200"; // Ensure it's above other modals
    openOpModal(modMap);

    // Switch UI to view mode (hide form)
    const formPanel = modMap.querySelector(".form-panel");
    if (formPanel) formPanel.style.display = "none";

    const mapPanel = modMap.querySelector(".map-panel");
    if (mapPanel) mapPanel.style.gridColumn = "1 / -1"; // Full width

    initStewardMapPicker(plant.caretaker_email, plant);
}

function viewPlantDetails(plant, mode = 'view') {
    const mod = document.getElementById("plantDetailsModal");
    openOpModal(mod);
    loadPlantDetails(plant, mode);
}

async function loadSchedule(email) {
    const mainView = document.getElementById("scheduleMainView");
    if (!mainView) return;

    // View toggles (Only those with data-view)
    const filterBtns = document.querySelectorAll("#scheduleModal .filter-btn[data-view]");
    filterBtns.forEach(btn => {
        btn.onclick = () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            switchScheduleView(btn.getAttribute("data-view"), email);
        };
    });

    switchScheduleView('calendar', email);
}

async function switchScheduleView(view, email, direction = 0) {
    const mainView = document.getElementById("scheduleMainView");
    mainView.innerHTML = `<div class="empty-state">Loading ${view}...</div>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/schedule?email=${encodeURIComponent(email)}`);
        const tasks = await resp.json();

        // Apply transition animation
        mainView.classList.remove('view-animate-slide', 'view-slide-in-right', 'view-slide-in-left');
        void mainView.offsetWidth; // Trigger reflow

        if (direction === 1) mainView.classList.add('view-slide-in-right');
        else if (direction === -1) mainView.classList.add('view-slide-in-left');
        else mainView.classList.add('view-animate-slide');

        if (view === 'calendar') renderCalendarView(mainView, tasks, email);
        else if (view === 'timeline') renderTimelineView(mainView, tasks, email);
        else if (view === 'routines') renderRoutinesView(mainView, email);

        // Toggle Month Navigation Visibility
        const navControls = document.getElementById("scheduleNavControls");
        if (navControls) {
            navControls.style.display = (view === 'calendar') ? 'flex' : 'none';
        }

    } catch (err) {
        mainView.innerHTML = `<div class="empty-state">Failed to load ${view}</div>`;
    }
}

function renderCalendarView(container, tasks, email) {
    const month = currentScheduleDate.getMonth();
    const year = currentScheduleDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Smooth text transition for header
    const header = document.getElementById("scheduleMonthHeader");
    header.style.opacity = '0';
    setTimeout(() => {
        header.textContent = `${monthNames[month]} ${year}`;
        header.style.opacity = '1';
    }, 150);

    let html = `
        <div class="calendar-grid">
            <div class="cal-day-header">Sun</div><div class="cal-day-header">Mon</div><div class="cal-day-header">Tue</div>
            <div class="cal-day-header">Wed</div><div class="cal-day-header">Thu</div><div class="cal-day-header">Fri</div>
            <div class="cal-day-header">Sat</div>
    `;

    // Empty slots
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));
        const now = new Date();
        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();

        html += `
            <div class="cal-day ${isToday ? 'today' : ''}" onclick="showDayDetails('${dateStr}', '${email}')">
                <div class="cal-date">${day}</div>
                <div class="cal-task-list">
                    ${dayTasks.slice(0, 3).map(t => {
            const typeClass = t.type ? `task-${t.type.toLowerCase()}` : 'task-general';
            return `<div class="cal-task-pill ${typeClass}">${t.title}</div>`;
        }).join('')}
                    ${dayTasks.length > 3 ? `<div style="font-size:9px; color:#667e66; font-weight:700; margin-left:4px;">+${dayTasks.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function changeMonth(delta) {
    const email = localStorage.getItem("pm_user_email");
    currentScheduleDate.setMonth(currentScheduleDate.getMonth() + delta);
    switchScheduleView('calendar', email, delta);
}

async function showDayDetails(dateStr, email) {
    const mainView = document.getElementById("scheduleMainView");
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    mainView.innerHTML = `<div class="empty-state">Loading tasks for ${dayName}...</div>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/schedule?email=${encodeURIComponent(email)}`);
        const tasks = await resp.json();
        const dayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(dateStr));

        let html = `
            <div class="day-details-view">
                <div class="day-details-header">
                    <button class="filter-btn" style="margin-bottom:12px; padding: 6px 12px;" onclick="switchScheduleView('calendar', '${email}')">← Back to Grid</button>
                    <h2 style="margin:0; font-size:22px; font-weight:800; color:var(--text-primary);">${dayName}</h2>
                    <p style="color:var(--text-tertiary); margin:4px 0 0;">${dayTasks.length} tasks scheduled for this day</p>
                </div>
                <div class="day-tasks-list">
                    ${dayTasks.length === 0 ? '<div class="empty-state">No tasks scheduled</div>' : dayTasks.map(t => {
            const initials = t.owner_name ? t.owner_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
            return `
                            <div class="task-detail-item">
                                <div>
                                    <div style="font-weight:800; font-size:16px; color:var(--text-primary);">${t.title}</div>
                                    <div style="font-size:13px; color:var(--text-tertiary); margin-top:2px;">📍 ${t.plant_name || 'General Task'} · ${t.location || 'Central'}</div>
                                </div>
                                <div style="width:32px; height:32px; border-radius:50%; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:var(--primary);" title="Client: ${t.owner_name}">${initials}</div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
        mainView.innerHTML = html;
    } catch (err) {
        mainView.innerHTML = `<div class="empty-state">Error loading day details</div>`;
    }
}

function renderTimelineView(container, tasks, email) {
    const blocks = {
        "Morning (6am - 11am)": tasks.filter(t => t.timing_block === 'Morning' || (!t.timing_block && t.due_date?.includes('T08'))),
        "Afternoon (12pm - 4pm)": tasks.filter(t => t.timing_block === 'Afternoon'),
        "Evening (5pm - 9pm)": tasks.filter(t => t.timing_block === 'Evening')
    };

    let html = ``;
    for (const [title, blockTasks] of Object.entries(blocks)) {
        html += `<div class="shift-header">${title}</div>`;
        if (blockTasks.length === 0) {
            html += `<div class="timeline-empty">No tasks scheduled</div>`;
            continue;
        }

        html += `
            <div class="timeline-container">
                <div class="timeline-row">
                    ${blockTasks.map(t => {
            const initials = t.owner_name ? t.owner_name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
            let weatherWarning = "";
            if (window.currentWeather && window.currentWeather.condition?.toLowerCase().includes('rain') && t.type === 'water') {
                weatherWarning = `<div class="weather-warning">⚠️ Rain Expected</div>`;
            } else if (window.currentWeather && window.currentWeather.temp > 32 && t.type === 'inspect') {
                weatherWarning = `<div class="weather-warning">🔥 High Heat</div>`;
            }

            return `
                            <div class="timeline-block">
                                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                                    <span style="font-weight:800; font-size:16px; color:var(--text-primary); line-height:1.2;">${t.title}</span>
                                    <div style="width:32px; height:32px; min-width:32px; border-radius:50%; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:var(--primary); border: 2px solid var(--gray-200); box-shadow: 0 4px 10px rgba(0,0,0,0.05);" title="Client: ${t.owner_name}">${initials}</div>
                                </div>
                                <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-tertiary);">
                                    <span>📍</span>
                                    <span>${t.plant_name || 'General Task'} · ${t.location || 'Central'}</span>
                                </div>
                                ${weatherWarning}
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function renderRoutinesView(container, email) {
    // Fetch routines from a hypothetical endpoint or just show the UI for now
    container.innerHTML = `
        <div style="padding:24px;">
            <h4 style="margin-bottom:16px; color:var(--text-primary);">Set Recurring Routine</h4>
            <div class="express-task-bar" style="margin-bottom:20px; padding:12px 20px;">
                <input type="text" id="routineTitle" placeholder="Task Title (e.g. Water Mango #4)" style="padding:0; background:transparent;" />
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px;">
                <select id="routineFreq" class="filter-btn" style="width:100%; text-align:left;">
                    <option value="1">Every Day</option>
                    <option value="2">Every 2 Days</option>
                    <option value="3">Every 3 Days</option>
                    <option value="7">Every Week</option>
                </select>
                <select id="routineBlock" class="filter-btn" style="width:100%; text-align:left;">
                    <option value="Morning">Morning (6am - 11am)</option>
                    <option value="Afternoon">Afternoon (12pm - 4pm)</option>
                    <option value="Evening">Evening (5pm - 9pm)</option>
                </select>
            </div>
            <button class="btn btn-primary" style="width:100%; padding:14px; border-radius:12px;" onclick="saveRoutine('${email}')">✨ Automate This Routine</button>

            <h4 style="margin: 32px 0 16px; color:var(--text-primary);">Active Routines</h4>
            <div id="activeRoutinesList">Loading routines...</div>
        </div>
    `;
    loadActiveRoutines(email);
}

async function saveRoutine(email) {
    const title = document.getElementById("routineTitle").value;
    const freq = document.getElementById("routineFreq").value;
    const block = document.getElementById("routineBlock").value;

    if (!title) return toast("Please enter a routine title");

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/routines`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steward_email: email,
                title: title,
                frequency_days: parseInt(freq),
                timing_block: block,
                type: 'routine',
                plant_id: 1 // Default or selected plant
            })
        });
        if (resp.ok) {
            toast("Routine automated!");
            loadActiveRoutines(email);
        }
    } catch (e) { }
}

async function loadActiveRoutines(email) {
    const list = document.getElementById("activeRoutinesList");
    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/routines?email=${encodeURIComponent(email)}`);
        const routines = await resp.json();

        if (routines.length === 0) {
            list.innerHTML = `<div class="empty-state" style="height:100px;">No active routines found</div>`;
            return;
        }

        list.innerHTML = routines.map(r => `
            <div style="background:var(--bg-tertiary); padding:12px 16px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; border: 1px solid var(--gray-100);">
                <div>
                    <div style="font-weight:700; font-size:14px; color:var(--text-primary);">${r.title}</div>
                    <div style="font-size:12px; color:var(--text-tertiary);">Every ${r.frequency_days} days · ${r.timing_block}</div>
                </div>
                <button class="filter-btn" style="padding:6px 12px; color:var(--danger); border-color:rgba(239,68,68,0.2);" onclick="deleteRoutine(${r.id}, '${email}')">Delete</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<div class="empty-state" style="height:100px;">Failed to load routines</div>`;
    }
}

async function deleteRoutine(id, email) {
    confirmAction("Stop this routine?", "This will verify your routine.", async () => {
        try {
            await fetch(`${API_BASE_URL}/api/steward/routines/${id}`, { method: 'DELETE' });
            toast("Routine stopped");
            loadActiveRoutines(email);
        } catch (e) { }
    });
}

function renderInventory(container, items) {
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">No inventory items. Click "+ Add Item" to start.</div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const isLow = item.quantity <= item.threshold;
        const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
        const expiryDate = item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '';

        return `
        <div class="inventory-item ${isLow ? 'low-stock' : ''}" style="position: relative;">
            <div class="inventory-info">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span class="category-badge ${item.category?.toLowerCase() || 'general'}">${item.category || 'General'}</span>
                    <h4 style="margin:0;">${item.item_name}</h4>
                    ${isLow ? '<span class="badge-low">LOW STOCK</span>' : ''}
                    ${isExpired ? '<span class="badge-expired" style="background: #ffebee; color: #c62828; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">EXPIRED</span>' : ''}
                </div>
                
                <div class="inventory-meta" style="font-size: 12px; color: #666; display: flex; flex-wrap: wrap; gap: 12px;">
                     <span>📦 Stock: <b>${item.quantity} ${item.unit}</b> (Min: ${item.threshold})</span>
                     ${item.storage_location ? `<span>📍 ${item.storage_location}</span>` : ''}
                     ${item.cost_per_unit ? `<span>💰 $${item.cost_per_unit}/${item.unit}</span>` : ''}
                     ${expiryDate ? `<span style="${isExpired ? 'color: #c62828; font-weight: 700;' : ''}">⏳ Exp: ${expiryDate}</span>` : ''}
                </div>
            </div>

            <div class="quantity-control">
                <button class="btn btn-sm btn-outline" onclick="updateInventory(${item.id}, ${item.quantity - 1})">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button class="btn btn-sm btn-outline" onclick="updateInventory(${item.id}, ${item.quantity + 1})">+</button>
                <button class="btn btn-sm btn-primary" onclick="requestRestock(${item.id}, '${item.item_name}', '${item.owner_email}')">Request</button>
                <button class="btn btn-sm btn-outline" style="color: #e74c3c; border-color: #e74c3c20;" onclick="deleteInventoryItem(${item.id}, '${item.steward_email}')" title="Delete Item">🗑️</button>
            </div>
        </div>
    `}).join('');
}

async function handleAddInventory(e, email) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Adding...";

    const data = {
        steward_email: email,
        item_name: document.getElementById("invName").value,
        category: document.getElementById("invCategory").value,
        quantity: parseFloat(document.getElementById("invQty").value),
        unit: document.getElementById("invUnit").value,
        threshold: parseFloat(document.getElementById("invThreshold").value) || 0,
        cost_per_unit: parseFloat(document.getElementById("invCost").value) || 0,
        storage_location: document.getElementById("invLocation").value,
        expiry_date: document.getElementById("invExpiry").value || null
    };

    try {
        const resp = await fetch(API_BASE_URL + '/api/steward/inventory/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            toast("Item added successfully!");
            document.getElementById("addInventoryForm").reset();
            closeActiveModal(document.getElementById("addInventoryModal"));
            loadInventory(email);
        } else {
            toast("Failed to add item.");
        }
    } catch (err) {
        toast("Error adding item.");
    }
    btn.disabled = false;
    btn.textContent = "Add Item";
}

async function deleteInventoryItem(id, email) {
    confirmAction("Delete Item", "Are you sure you want to delete this item permanently?", async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/api/steward/inventory/${id}`, { method: 'DELETE' });
            if (resp.ok) {
                toast("Item deleted.");
                loadInventory(email); // Refresh list
            } else {
                toast("Failed to delete item.");
            }
        } catch (e) {
            toast("Error deleting item.");
        }
    });
}


async function updateInventory(id, newQty) {
    if (newQty < 0) return;
    try {
        const resp = await fetch(API_BASE_URL + '/api/steward/inventory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, quantity: newQty })
        });
        if (resp.ok) {
            loadInventory(localStorage.getItem("pm_user_email"));
        }
    } catch (err) { }
}

async function requestRestock(id, itemName, ownerEmail) {
    const stewardName = currentUsername;
    const stewardEmail = localStorage.getItem("pm_user_email");

    try {
        const resp = await fetch(API_BASE_URL + '/api/steward/inventory/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steward_email: stewardEmail, owner_email: ownerEmail, item_name: itemName, steward_name: stewardName })
        });
        if (resp.ok) {
            toast("Restock request sent to owner!");
        }
    } catch (err) { }
}

function renderTaskList(container, tasks, isModal = false) {
    if (!container) return;

    if (tasks.length === 0) {
        container.innerHTML = `<div class="empty-state">No pending tasks found</div>`;
        return;
    }

    container.innerHTML = tasks.map(t => {
        const isUrgent = t.status === 'pending' && (t.type === 'express' || t.title.toLowerCase().includes('urgent'));
        let weatherAdvice = "";

        // Dynamic advice based on retrieved state (no hardcoding)
        if (window.currentWeather?.condition.includes("Rain") && t.title.toLowerCase().includes("water")) {
            weatherAdvice = `<div style="font-size:10px; color:#2980b9; margin-top:4px;">🌧️ Rain expected. Consider delaying watering.</div>`;
        } else if (window.currentWeather?.temp > 32 && t.title.toLowerCase().includes("inspect")) {
            weatherAdvice = `<div style="font-size:10px; color:#e67e22; margin-top:4px;">🔥 High heat. Inspect for wilting.</div>`;
        }

        return `
            <div class="steward-list-item task-item">
                <div class="item-icon">${t.plant_emoji || '🌿'}</div>
                <div class="item-info">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h4>${t.title}</h4>
                        ${isUrgent ? `<span class="priority-badge priority-urgent">⏱️ Priority</span>` : ''}
                    </div>
                    <p>${t.plant_name || 'General Task'} ${t.due_date ? '· Due: ' + new Date(t.due_date).toLocaleDateString() : ''}</p>
                    ${weatherAdvice}
                </div>
                <button class="btn btn-sm btn-primary" onclick="handleCompleteTask(${t.id}, ${isModal})">Complete</button>
            </div>
        `;
    }).join('');
}

async function handleCompleteTask(taskId, isModal = false) {
    confirmAction("Complete Task", "Confirm task completion? Client will be notified.", async () => {
        try {
            const resp = await fetch(`${API_BASE_URL}/api/steward/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photo_url: null })
            });

            if (resp.ok) {
                toast("Task completed! Client notified.");
                const email = localStorage.getItem("pm_user_email");
                loadTasks(email);
                if (isModal) {
                    const activeFilter = document.querySelector("#tasksModal .filter-btn.active")?.getAttribute("data-filter") || 'all';
                    loadFullTasks(email, activeFilter);
                }
                updateAchievementRing(email);
            } else {
                toast("Failed to complete task");
            }
        } catch (e) {
            toast("Error completing task");
        }
    });
}

function confirmAction(title, message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmTitle");
    const msgEl = document.getElementById("confirmMessage");
    const btnYes = document.getElementById("btnConfirmYes");

    if (!modal || !titleEl || !msgEl || !btnYes) {
        // Fallback
        if (confirm(`${title}\n${message}`)) onConfirm();
        return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;

    // Remove old listeners to prevent stacking
    const newBtn = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtn, btnYes);

    newBtn.addEventListener("click", () => {
        onConfirm();
        closeActiveModal(modal);
    });

    openOpModal(modal);
}


async function loadClients(email) {
    const list = document.getElementById("clientsList");
    if (!list) return;
    list.innerHTML = `<div class="empty-state">Finding your clients...</div>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/clients?email=${encodeURIComponent(email)}`);
        const clients = await resp.json();
        renderClients(list, clients);
    } catch (err) {
        list.innerHTML = `<div class="empty-state">Failed to load clients</div>`;
    }
}

function renderClients(container, clients) {
    if (clients.length === 0) {
        container.innerHTML = `<div class="empty-state">You don't have any clients yet</div>`;
        return;
    }

    container.innerHTML = clients.map(client => `
        <div class="client-item">
            <div class="client-avatar">${client.avatar || '👤'}</div>
            <div class="client-info">
                <h4>${client.username || 'Client'}</h4>
                <p>${client.email}</p>
            </div>
            <div class="client-actions">
                <button class="btn btn-sm btn-primary" onclick="navigateToMessage('${client.email}')">Message</button>
            </div>
        </div>
    `).join('');
}

function navigateToMessage(email) {
    window.location.href = `dashboard.html?page=messages&contact=${encodeURIComponent(email)}`;
}

async function promptClientMessage(clientEmail, clientName) {
    const msg = prompt(`Send a message to ${clientName || clientEmail}:`);
    if (!msg) return;

    try {
        const resp = await fetch(API_BASE_URL + '/api/steward/clients/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steward_name: currentUsername,
                client_email: clientEmail,
                message: msg
            })
        });

        if (resp.ok) {
            toast(`Message sent to ${clientName}!`);
        } else {
            toast("Failed to send message.");
        }
    } catch (err) {
        toast("Network error.");
    }
}

async function loadNotifications() {
    if (isNotifyingActing) return;
    const email = localStorage.getItem("pm_user_email");
    const container = document.getElementById("notificationsList");
    const badge = document.getElementById("notifBadge");

    try {
        const res = await fetch(`${API_BASE_URL}/api/notifications?email=${email}`);
        const notifs = await res.json();

        const unread = notifs.filter(n => !n.is_read).length;
        if (badge) badge.style.display = unread > 0 ? 'block' : 'none';

        if (!container) return;

        if (notifs.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>No new notifications</p></div>`;
            return;
        }

        container.innerHTML = notifs.map(n => {
            const isConnReq = n.type === 'connection_request';
            let icon = '🔔';
            if (isConnReq) icon = '🤝';
            else if (n.type === 'task_complete') icon = '✅';
            else if (n.type === 'update_request') icon = '💡';
            else if (n.type === 'restock_request') icon = '📦';

            return `
                <div class="notification-item ${n.is_read ? 'read' : 'unread'} ${isConnReq ? 'connection-req' : ''}">
                    <div class="notif-icon-box">${icon}</div>
                    <div class="notif-content">
                        <p><strong>${n.sender_name}</strong> ${n.message}</p>
                        ${isConnReq ? `
                            <div class="notif-actions">
                                <button class="btn-notif-accept" onclick="acceptConnection(${n.id}, '${n.meta}', '${n.sender_name}', this)">
                                    <span>Accept Connection</span>
                                </button>
                                <button class="btn-notif-dismiss" onclick="dismissNotification(${n.id}, this)">Dismiss</button>
                            </div>
                        ` : `
                            <div class="notif-actions">
                                <button class="btn-notif-dismiss" onclick="dismissNotification(${n.id}, this)">Got it</button>
                            </div>
                        `}
                        <span class="notif-time">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Notif error", e);
    }
}

async function acceptConnection(notifId, userEmail, userName, btn) {
    if (isNotifyingActing) return;
    const stewardEmail = localStorage.getItem("pm_user_email");
    const stewardName = currentUsername;

    isNotifyingActing = true;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>Processing...</span>';
    }

    try {
        const resp = await fetch(API_BASE_URL + '/api/connections/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notif_id: notifId,
                user_email: userEmail,
                steward_email: stewardEmail,
                steward_name: stewardName
            })
        });

        if (resp.ok) {
            if (btn) {
                btn.classList.add('accepted');
                btn.innerHTML = '<span>✅ Accepted</span>';

                // Start disappearance after animation
                setTimeout(() => {
                    const item = btn.closest('.notification-item');
                    if (item) {
                        item.classList.add('disappearing');
                        setTimeout(() => {
                            item.remove();
                            isNotifyingActing = false;
                            loadNotifications(); // Refresh to update count/state
                        }, 500); // Wait for CSS transition
                    } else {
                        isNotifyingActing = false;
                        loadNotifications();
                    }
                }, 1200);
            } else {
                toast(`You are now connected with ${userName}!`);
                loadNotifications();
            }
        } else {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>Accept Connection</span>';
            }
            isNotifyingActing = false;
            toast("Failed to accept connection.");
        }
    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span>Accept Connection</span>';
        }
        isNotifyingActing = false;
        ui.alert("Error", "Network error.");
    }
}

async function markNotificationsRead() {
    const email = localStorage.getItem("pm_user_email");
    await fetch(API_BASE_URL + '/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    }).catch(() => { });
    loadNotifications();
}

let isNotifyingActing = false;

async function dismissNotification(notifId, btn) {
    if (isNotifyingActing) return;
    const item = btn.closest('.notification-item');
    if (!item) return;

    isNotifyingActing = true;

    try {
        // Call API to delete permanently
        const resp = await fetch(`${API_BASE_URL}/api/notifications/${notifId}`, { method: 'DELETE' });
        if (!resp.ok) throw new Error("Delete failed");

        item.classList.add('disappearing');
        setTimeout(() => {
            const container = item.parentElement;
            item.remove();
            if (container && container.querySelectorAll('.notification-item').length === 0) {
                container.innerHTML = `<div class="empty-state"><p>No new notifications</p></div>`;
                const badge = document.getElementById("notifBadge");
                if (badge) badge.style.display = 'none';
            }
            isNotifyingActing = false;
        }, 500);
    } catch (err) {
        console.error("Dismiss failed", err);
        isNotifyingActing = false;
        toast("Failed to dismiss notification.");
    }
}

function toast(msg) {
    const host = document.getElementById("toastHost");
    if (!host) {
        alert(msg);
        return;
    }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<div class="toast-row"><span>${msg}</span></div>`;
    host.appendChild(t);
    setTimeout(() => {
        t.style.opacity = "0";
        t.style.transition = "all 0.3s";
        setTimeout(() => t.remove(), 300);
    }, 4000);
}

// ===================================
// STEWARD MAP & PLANT REGISTRY
// ===================================

let pickerMap = null;
let pickerMarker = null;

function initStewardMapPicker(email, selectedPlant = null) {
    setTimeout(() => {
        if (!pickerMap) {
            pickerMap = L.map('stewardMapPick').setView([14.5995, 120.9842], 13); // Default Manila
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(pickerMap);

            pickerMap.on('click', (e) => {
                // Only allow picking if form is visible (Add Mode)
                const formPanel = document.querySelector("#stewardsMapModal .form-panel");
                if (formPanel && formPanel.style.display !== "none") {
                    const { lat, lng } = e.latlng;
                    document.getElementById("plantLat").value = lat;
                    document.getElementById("plantLng").value = lng;

                    if (pickerMarker) {
                        pickerMarker.setLatLng([lat, lng]);
                    } else {
                        pickerMarker = L.marker([lat, lng]).addTo(pickerMap);
                    }
                }
            });
        }

        pickerMap.invalidateSize();

        // Clear existing layers except tiles
        pickerMap.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
                pickerMap.removeLayer(layer);
            }
        });

        if (selectedPlant && selectedPlant.coords) {
            try {
                const [lat, lng] = JSON.parse(selectedPlant.coords);
                pickerMap.setView([lat, lng], 16);
                L.marker([lat, lng])
                    .addTo(pickerMap)
                    .bindPopup(`
                    <b>${selectedPlant.name}</b><br>
                    User: ${selectedPlant.owner_username || 'Unknown'}<br>
                    Owner: ${selectedPlant.owner_email}<br>
                    Loc: ${selectedPlant.location}
                 `)
                    .openPopup();
            } catch (e) { }
        } else {
            // Add Mode: show context
            loadStewardMapContext(email);
        }

    }, 300); // Delay for modal animation
}

async function loadStewardMapContext(email) {
    if (!pickerMap) return;
    try {
        // Load existing plants to show on map (as reference)
        const resp = await fetch(`${API_BASE_URL}/api/plants?email=${encodeURIComponent(email)}`);
        const plants = await resp.json();

        plants.forEach(p => {
            if (p.coords) {
                try {
                    const [lat, lng] = JSON.parse(p.coords);
                    L.circleMarker([lat, lng], { radius: 5, color: '#27ae60', fillOpacity: 0.5 })
                        .bindPopup(`Existing: ${p.name}`)
                        .addTo(pickerMap);
                } catch (e) { }
            }
        });
    } catch (e) { }
}

async function loadClientsForDropdown(email) {
    const select = document.getElementById("plantOwnerSelect");
    select.innerHTML = '<option value="">Loading...</option>';

    try {
        const resp = await fetch(`${API_BASE_URL}/api/steward/clients?email=${encodeURIComponent(email)}`);
        const clients = await resp.json();

        if (clients.length === 0) {
            select.innerHTML = '<option value="">No connected clients</option>';
            return;
        }

        // Add Self option
        let html = `<option value="">Select Client...</option>`;
        html += `<option value="${email}">Myself (Steward)</option>`;

        clients.forEach(c => {
            html += `<option value="${c.email}">${c.username || c.email}</option>`;
        });
        select.innerHTML = html;

    } catch (e) {
        select.innerHTML = '<option value="">Error loading clients</option>';
    }
}

async function handleAddPlant(e) {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const lat = document.getElementById("plantLat").value;
    const lng = document.getElementById("plantLng").value;

    if (!lat || !lng) {
        toast("Please select a location on the map first!");
        return;
    }

    const ownerEmail = document.getElementById("plantOwnerSelect").value;
    if (!ownerEmail) {
        toast("Please select an Owner/Client for this plant.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Planting...";

    const data = {
        name: document.getElementById("plantName").value,
        type: document.getElementById("plantType").value || "Tree",
        status: document.getElementById("plantStatus").value || "healthy",
        location: document.getElementById("plantLocationName").value || "Farm",
        coords: JSON.stringify([parseFloat(lat), parseFloat(lng)]),
        owner_email: ownerEmail,
        caretaker_email: localStorage.getItem("pm_user_email"),
        emoji: "🌱" // Dynamic emoji based on type could be added later
    };

    // Emoji mapping
    const typeEmoji = {
        'Tree': '🌳', 'Shrub': '🌿', 'Vegetable': '🥕', 'Flower': '🌻'
    };
    if (typeEmoji[data.type]) data.emoji = typeEmoji[data.type];

    try {
        const resp = await fetch(API_BASE_URL + '/api/plants/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            toast("Plant successfully added to registry!");
            e.target.reset();
            if (pickerMarker) pickerMap.removeLayer(pickerMarker);
            pickerMarker = null;
            document.getElementById("stewardsMapModal").classList.remove("active");
            setTimeout(() => document.getElementById("stewardsMapModal").style.display = "none", 300);

            // Refresh stats if open
            loadGroveAnalytics(data.caretaker_email);
        } else {
            const errData = await resp.json().catch(() => ({}));
            toast(`Failed to add plant: ${errData.error || 'Server error'}`);
        }
    } catch (err) {
    } finally {
        btn.disabled = false;
        btn.textContent = "🌱 Plant It";
    }
}

// ===================================
// PLANT DETAILS & UPDATE
// ===================================

let currentPlantDetailsMap = null;

function loadPlantDetails(plant, mode = "view") {
    // Fill basic info
    document.getElementById("pdName").textContent = plant.name;
    document.getElementById("pdLocation").textContent = `📍 ${plant.location}`;
    document.getElementById("pdOwner").textContent = plant.owner_email;
    if (document.getElementById("pdOwnerUsername")) {
        document.getElementById("pdOwnerUsername").textContent = plant.owner_username || 'Unknown';
    }

    // Fill form inputs
    const sizeInp = document.getElementById("pdSize");
    const heightInp = document.getElementById("pdHeight");
    const ageInp = document.getElementById("pdAge");
    const soilInp = document.getElementById("pdSoil");
    const wateredInp = document.getElementById("pdLastWatered");
    const statusInp = document.getElementById("pdStatus");

    sizeInp.value = plant.size || '';
    heightInp.value = plant.height || '';
    ageInp.value = plant.age || '';
    soilInp.value = plant.soil_type || '';
    wateredInp.value = plant.last_watered || '';
    statusInp.value = plant.status || 'healthy';

    // Store ID for update
    const form = document.getElementById("plantDetailsForm");
    if (form) form.dataset.id = plant.id;

    // Toggle Read-Only / Edit Mode
    const isEdit = mode === 'edit';
    const inputs = [sizeInp, heightInp, ageInp, soilInp, wateredInp, statusInp];
    const submitBtn = form?.querySelector("button[type=submit]");
    const requestUpdateBtn = document.getElementById("pdBtnUpdate");

    inputs.forEach(inp => {
        if (inp) inp.disabled = !isEdit;
        if (inp) {
            if (!isEdit) inp.classList.add("input-readonly");
            else inp.classList.remove("input-readonly");
        }
    });

    if (submitBtn) submitBtn.style.display = isEdit ? "block" : "none";
    if (requestUpdateBtn) {
        requestUpdateBtn.textContent = isEdit ? "Cancel Update" : "Update Info";
        requestUpdateBtn.onclick = () => {
            // Toggle mode
            const newMode = isEdit ? "view" : "edit";
            loadPlantDetails(plant, newMode);
        };
    }

    // Mini Map
    setTimeout(() => {
        if (!currentPlantDetailsMap) {
            currentPlantDetailsMap = L.map('pdMapPreview').setView([0, 0], 1);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(currentPlantDetailsMap);
        }

        currentPlantDetailsMap.invalidateSize();

        if (plant.coords) {
            try {
                const [lat, lng] = JSON.parse(plant.coords);
                currentPlantDetailsMap.setView([lat, lng], 15);

                // Clear existing
                currentPlantDetailsMap.eachLayer((layer) => {
                    if (layer instanceof L.Marker) currentPlantDetailsMap.removeLayer(layer);
                });

                L.marker([lat, lng]).addTo(currentPlantDetailsMap);
            } catch (e) { }
        }
    }, 300);
}

// Plant Image Upload
let plantImages = [];

document.getElementById('btnAddPlantImage')?.addEventListener('click', () => {
    document.getElementById('plantImageInput').click();
});

document.getElementById('plantImageInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const plantId = document.getElementById('plantDetailsForm').dataset.id;
    if (!plantId) {
        toast('Error: Plant ID is missing. Please reopen the plant details.');
        return;
    }

    const formData = new FormData();
    formData.append('plant_id', plantId); // Text fields FIRST
    formData.append('image', file);

    try {
        const resp = await fetch(API_BASE_URL + '/api/plants/upload-image', {
            method: 'POST',
            body: formData
        });

        if (resp.ok) {
            const data = await resp.json();
            plantImages.push(data.image_url);
            renderPlantImages();
            toast('Image uploaded successfully!');
        } else {
            const errData = await resp.json().catch(() => ({}));
            console.error('[Upload] Error response:', errData);
            toast(`Upload failed: ${errData.error || 'Server error'}`);
        }
    } catch (err) {
        console.error('Upload error:', err);
        toast('Network error');
    }

    e.target.value = '';
});

function renderPlantImages() {
    const container = document.getElementById('plantImagePreview');
    container.innerHTML = plantImages.map((url, idx) => `
        <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 2px solid #e0e0e0;">
            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
            <button onclick="removePlantImage(${idx})" 
                style="position: absolute; top: 4px; right: 4px; background: rgba(255,0,0,0.8); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px;">
                ×
            </button>
        </div>
    `).join('');
}

function removePlantImage(idx) {
    plantImages.splice(idx, 1);
    renderPlantImages();
}

// Handle Update Submission
document.getElementById("plantDetailsForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    const id = e.target.dataset.id;

    btn.disabled = true;
    btn.textContent = "Saving...";

    const data = {
        id: parseInt(id),
        size: document.getElementById("pdSize").value,
        height: document.getElementById("pdHeight").value,
        age: document.getElementById("pdAge").value,
        soil_type: document.getElementById("pdSoil").value,
        last_watered: document.getElementById("pdLastWatered").value,
        status: document.getElementById("pdStatus").value
    };

    try {
        const resp = await fetch(API_BASE_URL + '/api/plants/update-details', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            toast("Plant details updated successfully!");
            document.getElementById("plantDetailsModal").classList.remove("active");
            setTimeout(() => document.getElementById("plantDetailsModal").style.display = "none", 300);

            // Refresh list
            loadGroveAnalytics(localStorage.getItem("pm_user_email"));
        } else {
            toast("Failed to update details.");
        }
    } catch (err) {
        toast("Network error.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Save Changes";
    }
});
