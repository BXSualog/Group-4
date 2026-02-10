let plantsData = []; // To be populated from database
let usersData = []; // To be populated from database

let dialogMode = null; // "addUser" | "editUser" | "addPlant" | "editPlant"
let dialogEditingId = null;

let userQuery = "";
let userStatus = "all";
let plantQuery = "";
let plantStatus = "all";
let usersPage = 1;
let plantsPage = 1;
const PAGE_SIZE = 6;

let selectedUserIds = new Set();
let selectedPlantIds = new Set();

let confirmResolve = null;
let lastUndo = null; // { type, item, index }

let lastFocus = null;
let trapHandler = null;

// ===================================
// INIT
const API_BASE_URL = window.location.origin;

// ===================================

document.addEventListener("DOMContentLoaded", () => {
  // Admin Guard (Nuclear Mode)
  const userRole = localStorage.getItem("pm_user_role");
  const userEmail = localStorage.getItem("pm_user_email");
  const isAdmin = userRole === 'admin';

  if (!isAdmin) {
    console.warn("Unauthorized access attempt to admin page.");
    window.location.href = "dashboard.html";
    return;
  }

  // Initial data load and rendering
  loadAdminStats(); // Load dashboard statistics
  refreshUsers(); // Fetch real users and then render
  refreshPlants(); // Fetch real plants and then render
  renderApplications(); // New function
  setupEventListeners();
  initActivityLog();
});

// Load admin dashboard statistics
async function loadAdminStats() {
  try {
    // Fetch users count
    const usersResp = await fetch(`${API_BASE_URL}/api/admin/users`);
    if (usersResp.ok) {
      const users = await usersResp.json();
      document.getElementById('statUsersValue').textContent = users.length;
    }

    // Fetch plants count - use the new admin endpoint for ALL plants
    const plantsResp = await fetch(`${API_BASE_URL}/api/admin/plants`);
    if (plantsResp.ok) {
      const plants = await plantsResp.json();
      document.getElementById('statPlantsValue').textContent = plants.length;
    }

    // Fetch pending applications count
    const appsResp = await fetch(`${API_BASE_URL}/api/admin/applications`);
    if (appsResp.ok) {
      const apps = await appsResp.json();
      document.getElementById('statApplicationsValue').textContent = apps.length;
    }

    // Fetch active alerts count
    const broadcastResp = await fetch(`${API_BASE_URL}/api/broadcast`);
    if (broadcastResp.ok) {
      const broadcast = await broadcastResp.json();
      let activeCount = 0;
      if (broadcast.alert?.active) activeCount++;
      if (broadcast.broadcast?.active) activeCount++;
      document.getElementById('statAlertsValue').textContent = activeCount;
    }
  } catch (err) {
    console.error("Error loading admin stats:", err);
  }
}

async function refreshPlants() {
  try {
    // Use admin-specific endpoint to get ALL plants from database
    const resp = await fetch(`${API_BASE_URL}/api/admin/plants`);
    if (resp.ok) {
      plantsData = await resp.json();
      loadAdminPlants();
    } else {
      console.error("Failed to fetch plants");
    }
  } catch (err) {
    console.error("Error fetching plants:", err);
  }
}

async function refreshUsers() {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/admin/users`);
    if (resp.ok) {
      usersData = await resp.json();
      loadAdminUsers();
    } else {
      console.error("Failed to fetch users");
    }
  } catch (err) {
    console.error("Error fetching users:", err);
  }
}

function initActivityLog() {
  const logHost = document.getElementById("activityLogHost");
  if (!logHost) return;

  logHost.innerHTML = "";

  function addLog(msg, type = 'info') {
    const p = document.createElement("p");
    const time = new Date().toLocaleTimeString();
    p.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logHost.prepend(p);

    // Keep only last 50 entries
    while (logHost.children.length > 50) {
      logHost.removeChild(logHost.lastChild);
    }
  }

  // Log session start with real data
  const adminEmail = localStorage.getItem("pm_user_email");
  addLog(`Admin session started: ${adminEmail}`);
  addLog("Dashboard statistics loaded");
  addLog("Connected to database");

  // Expose the function globally for other actions to use
  window.logAdminAction = addLog;
}

function setupEventListeners() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("sidebar");
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Profile Dropdown Logic
  const trigger = document.getElementById("userProfileTrigger");
  const dropdown = document.getElementById("profileDropdown");

  if (trigger && dropdown) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    document.addEventListener("click", () => {
      if (dropdown.classList.contains("active")) {
        dropdown.classList.remove("active");
      }
    });
  }

  // Action Buttons in Dropdown
  const btnUserHome = document.getElementById("btnUserHome");
  if (btnUserHome) {
    btnUserHome.addEventListener("click", () => {
      window.location.href = "dashboard.html";
    });
  }

  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.stopPropagation();
      handleLogout();
    });
  }

  const addUserBtn = document.getElementById("addUserBtn");
  addUserBtn.addEventListener("click", () => openDialog("addUser"));

  const addPlantBtn = document.getElementById("addPlantBtn");
  addPlantBtn.addEventListener("click", () => openDialog("addPlant"));

  // Search / filters
  document.getElementById("userSearch")?.addEventListener("input", (e) => {
    userQuery = e.target.value.trim().toLowerCase();
    usersPage = 1;
    loadAdminUsers();
  });
  document.getElementById("userStatusFilter")?.addEventListener("change", (e) => {
    userStatus = e.target.value;
    usersPage = 1;
    loadAdminUsers();
  });
  document.getElementById("plantSearch")?.addEventListener("input", (e) => {
    plantQuery = e.target.value.trim().toLowerCase();
    plantsPage = 1;
    loadAdminPlants();
  });
  document.getElementById("plantStatusFilter")?.addEventListener("change", (e) => {
    plantStatus = e.target.value;
    plantsPage = 1;
    loadAdminPlants();
  });

  // Bulk controls
  document.getElementById("usersSelectAll")?.addEventListener("change", (e) => {
    toggleSelectAllUsers(Boolean(e.target.checked));
  });
  document.getElementById("plantsSelectAll")?.addEventListener("change", (e) => {
    toggleSelectAllPlants(Boolean(e.target.checked));
  });
  const btnClearSelPlants = document.getElementById("plantsClearSel");
  if (btnClearSelPlants) {
    btnClearSelPlants.addEventListener("click", () => {
      selectedPlantIds = new Set();
      updateBulkBars();
      loadAdminPlants();
    });
  }



  // --- System Communications Logic ---
  const alertIn = document.getElementById("alertInput");
  const bcastIn = document.getElementById("broadcastInput");

  // Initial Load
  loadCommStatus();

  // Alert Handlers
  document.getElementById("btnSendAlert")?.addEventListener("click", () => sendComm('alert', alertIn));
  document.getElementById("btnClearAlert")?.addEventListener("click", () => sendComm('alert', alertIn, false));

  // Broadcast Handlers
  // Broadcast Handlers
  document.getElementById("btnSendBroadcast")?.addEventListener("click", () => sendComm('broadcast', bcastIn));
  document.getElementById("btnClearBroadcast")?.addEventListener("click", () => sendComm('broadcast', bcastIn, false));

  async function sendComm(type, inputEl, active = true) {
    const msg = inputEl.value.trim();
    if (active && !msg) {
      toast("Please type a message first");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          message: active ? msg : "",
          active: active
        })
      });
      if (resp.ok) {
        if (!active) inputEl.value = "";

        // Dynamic success message
        const label = type === 'alert' ? 'Global Alert' : 'Global Broadcast';
        const action = active ? 'successfully sent' : 'successfully cleared';
        toast(`${label} ${action}!`);

        // Log to activity
        if (window.logAdminAction) {
          window.logAdminAction(`${label} ${active ? 'sent' : 'cleared'}: "${msg || 'N/A'}"`);
        }

        loadCommStatus(); // Update visual indicators
        loadAdminStats(); // Update stats
      }
    } catch (err) {
      console.error(`${type} error:`, err);
      toast(`Failed to ${active ? 'send' : 'clear'} ${type}`);
    }
  }

  function toast(msg) {
    console.log("TOASTED:", msg); // Backup log
    const host = document.getElementById("toastHost");
    if (!host) {
      alert(msg); // Ultimate fallback
      return;
    }

    const t = document.createElement("div");
    t.className = "toast";
    // Force some high-visibility styles directly for testing
    t.style.borderLeft = "4px solid #f97316";
    t.style.fontWeight = "bold";

    t.innerHTML = `
        <div class="toast-row">
            <span>${msg}</span>
            <button class="toast-action" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
    `;
    host.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(10px)";
      t.style.transition = "all 0.3s ease";
      setTimeout(() => t.remove(), 300);
    }, 4000);
  }

  async function loadCommStatus() {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/broadcast`);
      if (!resp.ok) return;
      const state = await resp.json();

      updateIndicator('alert', state.alert);
      updateIndicator('broadcast', state.broadcast);
    } catch (err) {
      console.error("Load comm status error:", err);
    }
  }

  function updateIndicator(type, data) {
    const badge = document.getElementById(`${type}StatusBadge`);
    const preview = document.getElementById(`${type}Status`);

    if (data && data.active && data.message) {
      if (badge) badge.classList.add('live');
      if (preview) {
        preview.classList.add('active');
        preview.textContent = `Live: "${data.message}"`;
      }
    } else {
      if (badge) badge.classList.remove('live');
      if (preview) {
        preview.classList.remove('active');
        preview.textContent = type === 'alert' ? 'No active banner' : 'No active broadcast';
      }
    }
  }
  document.getElementById("btnDebugToast")?.addEventListener("click", () => {
    toast("Manual Feedback Test: System is working!");
  });

  document.getElementById("usersBulkDelete")?.addEventListener("click", async () => {
    if (!selectedUserIds.size) return;
    const ok = await confirmDialog(
      "Delete users?",
      `Delete ${selectedUserIds.size} selected user(s)?`
    );
    if (!ok) return;
    const ids = Array.from(selectedUserIds);
    ids.forEach((id) => {
      const idx = usersData.findIndex((u) => u.id === id);
      if (idx !== -1) usersData.splice(idx, 1);
    });
    selectedUserIds = new Set();
    toast("Users deleted", { actionText: "Undo", onAction: undoLast });
    loadAdminUsers();
  });
  document.getElementById("plantsBulkDelete")?.addEventListener("click", async () => {
    if (!selectedPlantIds.size) return;
    const ok = await confirmDialog(
      "Delete plants?",
      `Delete ${selectedPlantIds.size} selected plant(s)?`
    );
    if (!ok) return;
    const ids = Array.from(selectedPlantIds);
    ids.forEach((id) => {
      const idx = plantsData.findIndex((p) => p.id === id);
      if (idx !== -1) plantsData.splice(idx, 1);
    });
    selectedPlantIds = new Set();
    toast("Plants deleted", { actionText: "Undo", onAction: undoLast });
    loadAdminPlants();
  });

  // Confirm dialog events
  wireConfirmDialog();

  const dialog = document.getElementById("dialog");
  const dialogCloseBtn = document.getElementById("dialogCloseBtn");
  const dialogForm = document.getElementById("dialogForm");

  dialogCloseBtn.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (e) => {
    if (e.target && e.target.getAttribute("data-close") === "true") {
      closeDialog();
    }
  });

  dialogForm.addEventListener("submit", (e) => {
    e.preventDefault();
    submitDialog();
  });

  document.addEventListener("click", (e) => {
    if (
      window.innerWidth <= 768 &&
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      !mobileMenuBtn.contains(e.target)
    ) {
      sidebar.classList.remove("active");
    }
  });
}

function handleLogout() {
  ui.handleLogout();
}

// --- APPLICATIONS MANAGEMENT ---
async function renderApplications() {
  const tbody = document.getElementById("adminApplicationsTableBody");
  if (!tbody) return;
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/applications`);
    const apps = await res.json();
    tbody.innerHTML = "";

    if (apps.length === 0) {
      tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:#999;'>No pending applications</td></tr>";
      return;
    }

    apps.forEach((app, index) => {
      // 1. Main Row
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.setAttribute("data-expanded", "false");
      tr.onclick = (e) => {
        // Prevent toggle if clicking a button
        if (e.target.tagName === 'BUTTON') return;
        toggleAppDetails(index);
      };

      tr.innerHTML = `
            <td>${escapeHtml(app.user_email)}</td>
            <td>${escapeHtml(app.full_name)}</td>
            <td>${app.experience_years} years</td>
            <td><small>${escapeHtml(app.reason).substring(0, 50)}...</small></td>
            <td>
                <button class="btn-primary btn-sm btn-pill" onclick="approveSteward('${app.user_email}')">Approve</button>
                <button class="btn-danger-fill btn-sm btn-pill" onclick="declineSteward('${app.user_email}')">Decline</button>
            </td>
        `;
      tbody.appendChild(tr);

      // 2. Details Row (Hidden by default)
      const trDetail = document.createElement("tr");
      trDetail.id = `app-details-${index}`;
      trDetail.style.display = "none";
      trDetail.style.backgroundColor = "#f9fafb";

      trDetail.innerHTML = `
        <td colspan="5" style="padding: 16px; border-bottom: 2px solid #e5e7eb;">
            <div style="display: grid; gap: 12px;">
                <div><strong>Full Reason:</strong> <p style="margin-top:4px">${escapeHtml(app.reason)}</p></div>
                <div><strong>Certifications:</strong> <p style="margin-top:4px">${app.certifications ? escapeHtml(app.certifications) : "None"}</p></div>
                <div><strong>Applied On:</strong> ${new Date(app.created_at).toLocaleDateString()}</div>
            </div>
        </td>
      `;
      tbody.appendChild(trDetail);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = "<tr><td colspan='5' style='color:red'>Error loading applications</td></tr>";
  }
}

function toggleAppDetails(index) {
  const detailRow = document.getElementById(`app-details-${index}`);
  if (detailRow) {
    const isHidden = detailRow.style.display === "none";
    detailRow.style.display = isHidden ? "table-row" : "none";
  }
}



window.approveSteward = async function (email) {
  const ok = await ui.confirm(`Approve stewardship for ${email}?`, "This user will gain steward permissions.", "Approve", "Cancel");
  if (!ok) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/steward/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (res.ok) {
      toast("Steward Approved!");
      if (window.logAdminAction) {
        window.logAdminAction(`Steward approved: ${email}`);
      }
      renderApplications(); // Refresh list
      refreshUsers(); // Refresh user list to show role change
      loadAdminStats(); // Update stats
    } else {
      ui.alert("Error", "Failed to approve steward application.");
    }
  } catch (err) {
    console.error(err);
    ui.alert("Error", "Network error occurred while approving steward.");
  }
};

window.declineSteward = async function (email) {
  const reason = await ui.prompt("Decline Application", `Enter reason for declining ${email}:`, "Reason for rejection...");
  if (reason === null) return; // Cancelled

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/steward/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, reason })
    });

    if (res.ok) {
      toast("Steward Application Declined.");
      if (window.logAdminAction) {
        window.logAdminAction(`Steward application declined: ${email}. Reason: ${reason}`);
      }
      renderApplications(); // Refresh list
      loadAdminStats(); // Update stats
    } else {
      ui.alert("Error", "Failed to decline steward application.");
    }
  } catch (err) {
    console.error(err);
    ui.alert("Error", "Network error occurred while declining steward.");
  }
};

// ===================================
// ADMIN - PLANT TABLE
// ===================================

function loadAdminPlants() {
  const tbody = document.getElementById("adminPlantsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = plantsData
    .filter((p) => {
      if (!plantQuery) return true;
      return `${p.name} ${p.location} ${p.status}`.toLowerCase().includes(plantQuery);
    })
    .filter((p) => (plantStatus === "all" ? true : p.status === plantStatus));

  const page = paginate(filtered, plantsPage, PAGE_SIZE);

  page.items.forEach((plant) => {
    const tr = document.createElement("tr");
    const statusClass = `badge-${plant.status === "healthy"
      ? "success"
      : plant.status === "growing"
        ? "info"
        : "warning"
      }`;
    const statusText =
      plant.status.charAt(0).toUpperCase() + plant.status.slice(1);

    tr.innerHTML = `
      <td><input type="checkbox" data-sel="plant" data-id="${plant.id}" ${selectedPlantIds.has(plant.id) ? "checked" : ""
      } /></td>
      <td>${plant.name}</td>
      <td>${plant.location}</td>
      <td>${plant.height}</td>
      <td><span class="badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn-text" data-action="edit-plant" data-id="${plant.id}">Edit</button>
        <button class="btn-text btn-danger" data-action="delete-plant" data-id="${plant.id}">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      if (action === "edit-plant") openDialog("editPlant", id);
      if (action === "delete-plant") deletePlant(id);
    });
  });

  tbody.querySelectorAll('[data-sel="plant"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = Number(cb.getAttribute("data-id"));
      if (cb.checked) selectedPlantIds.add(id);
      else selectedPlantIds.delete(id);
      updateBulkBars();
      syncSelectAll("plantsSelectAll", page.items.map((p) => p.id), selectedPlantIds);
    });
  });

  renderPager("plantsPager", page, (next) => {
    plantsPage = next;
    loadAdminPlants();
  });
  updateBulkBars();
  syncSelectAll("plantsSelectAll", page.items.map((p) => p.id), selectedPlantIds);
}

function loadAdminUsers() {
  const tbody = document.getElementById("adminUsersTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = usersData
    .filter((u) => {
      if (!userQuery) return true;
      return `${u.name} ${u.role} ${u.status}`.toLowerCase().includes(userQuery);
    })
    .filter((u) => (userStatus === "all" ? true : u.status.toLowerCase() === userStatus));

  const page = paginate(filtered, usersPage, PAGE_SIZE);

  page.items.forEach((user) => {
    let badgeClass = "badge-warning"; // Default/Offline
    if (user.status.toLowerCase() === "online") {
      badgeClass = "badge-success";
    } else if (user.status.toLowerCase() === "offline") {
      badgeClass = "badge-secondary"; // Using a gray badge if defined, else we can fall back to danger or keep custom
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" data-sel="user" data-id="${user.id}" ${selectedUserIds.has(user.id) ? "checked" : ""
      } /></td>
      <td>${user.name}</td>
      <td>${user.role}</td>
      <td><span class="badge ${badgeClass}">${user.status}</span></td>
      <td>
        <button class="btn-text" data-action="edit-user" data-id="${user.id}">Edit</button>
        <button class="btn-text btn-danger" data-action="delete-user" data-id="${user.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = Number(btn.getAttribute("data-id"));
      if (action === "edit-user") openDialog("editUser", id);
      if (action === "delete-user") deleteUser(id);
    });
  });

  tbody.querySelectorAll('[data-sel="user"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const id = Number(cb.getAttribute("data-id"));
      if (cb.checked) selectedUserIds.add(id);
      else selectedUserIds.delete(id);
      updateBulkBars();
      syncSelectAll("usersSelectAll", page.items.map((u) => u.id), selectedUserIds);
    });
  });

  renderPager("usersPager", page, (next) => {
    usersPage = next;
    loadAdminUsers();
  });
  updateBulkBars();
  syncSelectAll("usersSelectAll", page.items.map((u) => u.id), selectedUserIds);
}

function openDialog(mode, id = null) {
  dialogMode = mode;
  dialogEditingId = id;
  const dialog = document.getElementById("dialog");
  const title = document.getElementById("dialogTitle");
  const form = document.getElementById("dialogForm");

  if (mode === "addUser") title.textContent = "Add User";
  if (mode === "editUser") title.textContent = "Edit User";
  if (mode === "addPlant") title.textContent = "Add Plant";
  if (mode === "editPlant") title.textContent = "Edit Plant";

  const user =
    mode === "editUser" ? usersData.find((u) => u.id === id) : null;
  const plant =
    mode === "editPlant" ? plantsData.find((p) => p.id === id) : null;

  if (mode === "addUser" || mode === "editUser") {
    const isEdit = mode === "editUser";
    form.innerHTML = `
      <div class="field">
        <label for="u_name">Full Name</label>
        <input id="u_name" name="name" required value="${user?.name || ""}" placeholder="John Doe" />
      </div>
      <div class="field">
        <label for="u_email">Email Address</label>
        <input id="u_email" name="email" type="email" required ${isEdit ? "disabled" : ""} value="${user?.email || ""}" placeholder="john@example.com" />
      </div>
      ${!isEdit ? `
      <div class="field">
        <label for="u_password">Password</label>
        <input id="u_password" name="password" type="password" required placeholder="Min 6 characters" />
      </div>
      ` : ""}
      <div class="field">
        <label for="u_role">Account Role</label>
        <select id="u_role" name="role" required>
          <option value="user" ${user?.role === "user" ? "selected" : ""}>User (Investor/Farmer)</option>
          <option value="steward" ${user?.role === "steward" ? "selected" : ""}>Steward (Expert)</option>
          <option value="admin" ${user?.role === "admin" ? "selected" : ""}>Admin (Full Access)</option>
        </select>
      </div>
      <div class="field">
        <label for="u_status">Account Status</label>
        <select id="u_status" name="status" required>
          <option value="Active" ${user?.dbStatus === "Active" ? "selected" : ""}>Active</option>
          <option value="Pending" ${user?.dbStatus === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Banned" ${user?.dbStatus === "Banned" ? "selected" : ""}>Banned</option>
        </select>
        <small style="color: var(--gray-500); margin-top: 4px; display: block;">Users active in last 5m will show as Online unless Banned.</small>
      </div>
      <div class="dialog-actions">
        <button class="btn-outline" type="button" id="cancelBtn">Cancel</button>
        <button class="btn-primary" type="submit">${isEdit ? "Update User" : "Create User"}</button>
      </div>
    `;
  } else {
    form.innerHTML = `
      <div class="field">
        <label for="p_name">Name</label>
        <input id="p_name" name="name" required value="${plant?.name || ""}" />
      </div>
      <div class="field">
        <label for="p_location">Location</label>
        <input id="p_location" name="location" required value="${plant?.location || ""}" />
      </div>
      <div class="field">
        <label for="p_height">Height</label>
        <input id="p_height" name="height" required value="${plant?.height || ""}" />
      </div>
      <div class="field">
        <label for="p_status">Status</label>
        <select id="p_status" name="status" required>
          <option value="healthy" ${plant?.status === "healthy" ? "selected" : ""}>Healthy</option>
          <option value="growing" ${plant?.status === "growing" ? "selected" : ""}>Growing</option>
          <option value="attention" ${plant?.status === "attention" ? "selected" : ""}>Attention</option>
        </select>
      </div>
      <div class="dialog-actions">
        <button class="btn-outline" type="button" id="cancelBtn">Cancel</button>
        <button class="btn-primary" type="submit">Save</button>
      </div>
    `;
  }

  const cancelBtn = document.getElementById("cancelBtn");
  cancelBtn.addEventListener("click", closeDialog);

  dialog.classList.add("active");
  dialog.setAttribute("aria-hidden", "false");
  trapFocus(dialog);
}

function closeDialog() {
  const dialog = document.getElementById("dialog");
  dialog.classList.remove("active");
  dialog.setAttribute("aria-hidden", "true");
  dialogMode = null;
  dialogEditingId = null;
  releaseFocusTrap();
  lastFocus?.focus?.();
}

async function submitDialog() {
  const form = document.getElementById("dialogForm");
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    let url = "";
    let method = "POST";
    let message = "";

    if (dialogMode === "addUser") {
      url = `${API_BASE_URL}/api/admin/users`;
      message = "User created successfully!";
    } else if (dialogMode === "editUser") {
      url = `${API_BASE_URL}/api/admin/users/${dialogEditingId}`;
      message = "User updated successfully!";
    } else if (dialogMode === "addPlant") {
      url = `${API_BASE_URL}/api/admin/plants`;
      message = "Plant added successfully!";
    } else if (dialogMode === "editPlant") {
      url = `${API_BASE_URL}/api/admin/plants/${dialogEditingId}`;
      message = "Plant updated successfully!";
    }

    const resp = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (resp.ok) {
      toast(message);
      const currentMode = dialogMode; // Cache mode before closing dialog (which nullifies it)
      closeDialog();
      if (currentMode && currentMode.includes("User")) {
        refreshUsers();
      } else {
        refreshPlants();
      }
      loadAdminStats(); // Update counters
    } else {
      const errData = await resp.json();
      toast(`Error: ${errData.error || "Operation failed"}`);
    }
  } catch (err) {
    console.error("Submit error:", err);
    toast("Network error occurred");
  }
}

async function deleteUser(id) {
  confirmDialog("Delete user?", "Are you sure you want to permanently delete this user?").then(async (ok) => {
    if (!ok) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        toast("User deleted");
        refreshUsers();
        loadAdminStats();
      } else {
        toast("Failed to delete user");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      toast("Network error");
    }
  });
}

async function deletePlant(id) {
  confirmDialog("Delete plant?", "Are you sure you want to permanently delete this plant?").then(async (ok) => {
    if (!ok) return;
    try {
      const resp = await fetch(`${API_BASE_URL}/api/admin/plants/${id}`, {
        method: "DELETE"
      });
      if (resp.ok) {
        toast("Plant deleted");
        refreshPlants();
        loadAdminStats();
      } else {
        toast("Failed to delete plant");
      }
    } catch (err) {
      console.error("Delete plant error:", err);
      toast("Network error");
    }
  });
}

function toast(message, opts = null) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  const el = document.createElement("div");
  el.className = "toast";
  if (opts?.actionText) {
    el.innerHTML = `<div class="toast-row"><span>${escapeHtml(
      message
    )}</span><button class="toast-action" type="button">${escapeHtml(
      opts.actionText
    )}</button></div>`;
    el.querySelector(".toast-action").addEventListener("click", () => {
      opts.onAction?.();
      el.remove();
    });
  } else {
    el.textContent = message;
  }
  host.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    el.style.transition = "all 0.2s ease";
    setTimeout(() => el.remove(), 220);
  }, 2200);
}

function undoLast() {
  if (!lastUndo) return;
  if (lastUndo.type === "user") {
    usersData.splice(lastUndo.index, 0, lastUndo.item);
    loadAdminUsers();
    toast("Undo: user restored");
  }
  if (lastUndo.type === "plant") {
    plantsData.splice(lastUndo.index, 0, lastUndo.item);
    loadAdminPlants();
    toast("Undo: plant restored");
  }
  lastUndo = null;
}

function paginate(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: items.slice(start, end),
    total,
    page: safePage,
    totalPages,
  };
}

function renderPager(id, page, onChange) {
  const host = document.getElementById(id);
  if (!host) return;
  host.innerHTML = `
    <span>Page ${page.page} of ${page.totalPages} · ${page.total} total</span>
    <div>
      <button type="button" ${page.page === 1 ? "disabled" : ""} data-step="-1">Prev</button>
      <button type="button" ${page.page === page.totalPages ? "disabled" : ""} data-step="1">Next</button>
    </div>
  `;
  host.querySelectorAll("button[data-step]").forEach((b) => {
    b.addEventListener("click", () => {
      const step = Number(b.getAttribute("data-step"));
      onChange(page.page + step);
    });
  });
}

function updateBulkBars() {
  const ub = document.getElementById("usersBulkbar");
  const pb = document.getElementById("plantsBulkbar");
  const uc = document.getElementById("usersSelectedCount");
  const pc = document.getElementById("plantsSelectedCount");
  if (ub && uc) {
    ub.style.display = selectedUserIds.size ? "flex" : "none";
    uc.textContent = `${selectedUserIds.size} selected`;
  }
  if (pb && pc) {
    pb.style.display = selectedPlantIds.size ? "flex" : "none";
    pc.textContent = `${selectedPlantIds.size} selected`;
  }
}

function syncSelectAll(selectAllId, visibleIds, set) {
  const el = document.getElementById(selectAllId);
  if (!el) return;
  if (!visibleIds.length) {
    el.checked = false;
    el.indeterminate = false;
    return;
  }
  const checkedCount = visibleIds.filter((id) => set.has(id)).length;
  el.checked = checkedCount === visibleIds.length;
  el.indeterminate = checkedCount > 0 && checkedCount < visibleIds.length;
}

function toggleSelectAllUsers(on) {
  // selects only visible rows (current page)
  document.querySelectorAll('[data-sel="user"]').forEach((cb) => {
    cb.checked = on;
    const id = Number(cb.getAttribute("data-id"));
    if (on) selectedUserIds.add(id);
    else selectedUserIds.delete(id);
  });
  updateBulkBars();
}

function toggleSelectAllPlants(on) {
  document.querySelectorAll('[data-sel="plant"]').forEach((cb) => {
    cb.checked = on;
    const id = Number(cb.getAttribute("data-id"));
    if (on) selectedPlantIds.add(id);
    else selectedPlantIds.delete(id);
  });
  updateBulkBars();
}

function wireConfirmDialog() {
  const dialog = document.getElementById("confirmDialog");
  const closeBtn = document.getElementById("confirmCloseBtn");
  const cancelBtn = document.getElementById("confirmCancelBtn");
  const okBtn = document.getElementById("confirmOkBtn");
  const backdrop = dialog?.querySelector(".dialog-backdrop");

  closeBtn?.addEventListener("click", () => finishConfirm(false));
  cancelBtn?.addEventListener("click", () => finishConfirm(false));
  okBtn?.addEventListener("click", () => finishConfirm(true));
  backdrop?.addEventListener("click", (e) => {
    if (e.target && e.target.getAttribute("data-close") === "true") {
      finishConfirm(false);
    }
  });
}

function confirmDialog(title, message) {
  const dialog = document.getElementById("confirmDialog");
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMessage").textContent = message;
  lastFocus = document.activeElement;
  dialog.classList.add("active");
  dialog.setAttribute("aria-hidden", "false");
  trapFocus(dialog);
  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function finishConfirm(result) {
  const dialog = document.getElementById("confirmDialog");
  dialog.classList.remove("active");
  dialog.setAttribute("aria-hidden", "true");
  releaseFocusTrap();
  lastFocus?.focus?.();
  confirmResolve?.(result);
  confirmResolve = null;
}

function trapFocus(container) {
  releaseFocusTrap();
  lastFocus = document.activeElement;
  const focusables = () =>
    Array.from(
      container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.disabled && el.offsetParent !== null);

  trapHandler = (e) => {
    if (e.key !== "Tab") return;
    const list = focusables();
    if (!list.length) return;
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", trapHandler);
  setTimeout(() => {
    focusables()[0]?.focus?.();
  }, 0);
}

function releaseFocusTrap() {
  if (trapHandler) document.removeEventListener("keydown", trapHandler);
  trapHandler = null;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
