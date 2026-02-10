import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import * as map from './map.js';
import * as chat from './chat.js';
import { initSocket } from './socket.js';

// --- DASHBOARD INITIALIZATION ---

async function initializeApp() {
  const email = localStorage.getItem("pm_user_email");
  const token = localStorage.getItem("pm_token");

  if (!email || !token) {
    console.warn("[AUTH] No session found. Redirecting to login.");
    window.location.href = "index.html?error=unauthorized";
    return;
  }

  // Immediate sync from localStorage
  const localName = localStorage.getItem("pm_user_name");
  const localAvatar = localStorage.getItem("pm_user_avatar");
  const localRole = localStorage.getItem("pm_user_role");
  if (localName || localAvatar) {
    ui.updateNavProfile({ username: localName, avatar: localAvatar, role: localRole });
  }

  // ATTACH LISTENERS
  setupEventListeners();
  ui.updateBreadcrumbs();

  // Initialize Modules
  // map.loadMap(); // Lazy loaded now
  chat.setupChatEvents();

  ui.renderSkeleton("plantsSkeleton", 6);

  if (email) {
    // Non-blocking fetches
    api.fetchContacts().then(() => ui.renderContactsUI());
    api.fetchWeather().then(data => ui.renderWeather(data));

    // This is the only critical blocking call
    await api.fetchPlants();
  }

  ui.hideSkeleton("plantsSkeleton");

  // Initial Renders
  ui.renderPlants(false); // Recent
  ui.renderPlants(true); // All
  ui.updateStats();

  // Check Onboarding status and sync latest profile
  if (email) {
    const profile = await api.fetchUserProfile(email);
    if (profile) {
      ui.updateNavProfile(profile);
      if (profile.role) {
        localStorage.setItem("pm_user_role", profile.role);
      }
      if (profile.avatar) localStorage.setItem("pm_user_avatar", profile.avatar);
      if (profile.username) localStorage.setItem("pm_user_name", profile.username);
      if (profile.steward_status) localStorage.setItem("pm_steward_status", profile.steward_status);
      if (profile.is_steward !== undefined) localStorage.setItem("pm_is_steward", profile.is_steward ? "1" : "0");

      // Apply User Theme
      if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
        const card = document.querySelector(`.theme-card[data-theme="${profile.theme}"]`);
        if (card) {
          document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
          card.classList.add("active");
        }
      }

      // Populate settings fields
      const bioInput = document.getElementById("settingsBio");
      if (bioInput) bioInput.value = profile.bio || "";
      const nameInput = document.getElementById("onboardingUsername");
      if (nameInput) nameInput.value = profile.username || "";
      const avatarOpt = document.querySelector(`.avatar-opt[data-avatar="${profile.avatar}"]`);
      if (avatarOpt) {
        document.querySelectorAll(".avatar-opt").forEach(o => o.classList.remove("selected"));
        avatarOpt.classList.add("selected");
      }
    }


    // Handle URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    const contactParam = urlParams.get("contact");

    if (pageParam) {
      navigateToPage(pageParam);
    } else {
      const storedPage = localStorage.getItem("pm_currentPage");
      if (storedPage) {
        navigateToPage(storedPage);
        localStorage.removeItem("pm_currentPage");
      }
    }
    if (pageParam === "messages" && contactParam) {
      setTimeout(() => {
        const contactEmail = decodeURIComponent(contactParam);
        const contact = (state.contactsData || []).find(c => c.email === contactEmail);
        if (contact) {
          state.selectedContact = contact;
          chat.selectContact(contact.id);
        }
      }, 500);
    }
  }

  // Initialize Real-time Socket
  initSocket(email, {
    onMessage: (msg) => chat.handleIncomingMessage(msg),
    onNotification: (notif) => {
      ui.toast(`New notification: ${notif.message}`);
      loadAndRenderNotifications();
    }
  });

  loadAndRenderNotifications();
}

// Unregister any existing Service Workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(() => console.log('[Service Worker] Unregistered existing SW'));
    }
  });
}

// System Communications
ui.initSystemCommunications();
setInterval(() => ui.initSystemCommunications(), 60000);


async function loadAndRenderNotifications() {
  const notifs = await api.fetchNotifications();
  ui.renderNotifications(notifs);
}

// ===================================
// EVENT LISTENERS
// ===================================

function setupEventListeners() {
  // Sidebar Menu items
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      const page = item.getAttribute("data-page");
      if (page) {
        e.preventDefault();
        navigateToPage(page);
      } else if (item.id === "logoutBtn" || item.id === "btnLogout") {
        e.preventDefault();
        handleLogout();
      }
    });
  });

  // Steward Search
  const stewardSearch = document.getElementById("stewardSearch");
  if (stewardSearch) {
    stewardSearch.addEventListener("input", debounce((e) => {
      state.stewardSearchQuery = e.target.value;
      ui.renderStewards();
    }, 300));
  }

  document.addEventListener('show-plant-details', async (e) => {
    const plantId = e.detail;
    state.currentPlantId = plantId;
    const plant = await api.fetchPlantDetails(plantId);
    if (plant) {
      state.plantsData = state.plantsData.map(p => p.id === plant.id ? plant : p);
      ui.renderPlantDetailsUI(plant);
      document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
      document.getElementById("plantDetailsContent").classList.add("active");
      ui.updateBreadcrumbs(plant);
    } else {
      ui.toast("Plant not found.");
    }
  });

  document.addEventListener('view-plant-on-map', (e) => {
    const plantId = e.detail;
    navigateToPage('map');
    map.loadMap(); // Ensure map loads
    setTimeout(() => {
      const plant = state.plantsData.find(p => p.id === plantId);
      if (plant && plant.coords && state.mapInstance) {
        state.mapInstance.flyTo(plant.coords, 18);
      }
    }, 300);
    state.pendingMapFocusPlantId = plantId;
  });

  document.getElementById("btnStewardship")?.addEventListener("click", () => {
    const status = localStorage.getItem("pm_steward_status") || "none";
    const role = localStorage.getItem("pm_user_role");
    const isSteward = localStorage.getItem("pm_is_steward") === "1" || localStorage.getItem("pm_is_steward") === "true";

    if (role === 'steward' || status === 'approved' || isSteward) {
      window.location.href = "steward.html";
    } else if (status === 'pending') {
      ui.alert("Application Pending", "Your stewardship application is currently under review.");
    } else {
      window.location.href = "steward-application.html";
    }
  });

  document.getElementById("btnLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    handleLogout();
  });
  document.getElementById("mobileMenuBtn")?.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("active"));
  document.getElementById("backToPlants")?.addEventListener("click", () => navigateToPage("plants"));

  // Plant Search/Filter
  document.getElementById("plantSearch")?.addEventListener("input", (e) => {
    state.plantQuery = e.target.value.trim().toLowerCase();
    ui.renderPlants(true);
  });

  document.getElementById("plantSort")?.addEventListener("change", (e) => {
    state.plantSort = e.target.value;
    ui.renderPlants(true);
  });

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.plantStatusFilter = btn.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach((b) => {
        b.classList.toggle("active", b === btn);
      });
      ui.renderPlants(true);
    });
  });

  document.getElementById("clearPlantFilters")?.addEventListener("click", resetPlantsFilters);
  document.getElementById("clearPlantsBtn")?.addEventListener("click", resetPlantsFilters);

  // Contact Search
  document.getElementById("contactSearch")?.addEventListener("input", (e) => {
    state.contactQuery = e.target.value.trim().toLowerCase();
    ui.renderContactsUI();
  });

  // Notifications Modal
  const notifModal = document.getElementById("notificationsModal");
  document.getElementById("btnNotifications")?.addEventListener("click", () => {
    if (notifModal) {
      notifModal.style.display = "flex";
      setTimeout(() => notifModal.classList.add("active"), 10);
      api.markNotificationRead().then(() => loadAndRenderNotifications());
    }
  });

  document.querySelectorAll(".modal .close-modal, .modal-backdrop").forEach(el => {
    el.addEventListener("click", () => {
      const modal = el.closest(".modal");
      if (modal) {
        modal.classList.remove("active");
        setTimeout(() => {
          if (!modal.classList.contains('active')) {
            modal.style.display = "none";
          }
        }, 300);
      }
    });
  });

  document.getElementById("chatMobileBack")?.addEventListener("click", ui.showContactsPanelMobile);

  // Shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !ui.isTypingInInput()) {
      e.preventDefault();
      const el =
        state.currentPage === "plants"
          ? document.getElementById("plantSearch")
          : state.currentPage === "messages"
            ? document.getElementById("contactSearch")
            : null;
      el?.focus();
    }
    if (e.key === "Escape") ui.closeImageModal();
  });

  // User Profile Trigger
  const trigger = document.getElementById("userProfileTrigger");
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const dropdown = document.getElementById("profileDropdown");
      dropdown.classList.toggle("active");
    });
    document.addEventListener('click', () => {
      const dropdown = document.getElementById("profileDropdown");
      if (dropdown) dropdown.classList.remove("active");
    });
  }
}

// ===================================
// ACTIONS / CONTROLLER LOGIC
// ===================================

function navigateToPage(page) {
  state.currentPage = page;
  const sectionMap = {
    dashboard: "dashboardContent",
    plants: "plantsContent",
    messages: "messagesContent",
    map: "mapContent",
    stewards: "stewardsContent",
  };

  const sectionId = sectionMap[page];
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  if (sectionId) document.getElementById(sectionId)?.classList.add("active");

  document.querySelectorAll(".menu-item").forEach(item => {
    item.classList.remove("active");
    if (item.getAttribute("data-page") === page) item.classList.add("active");
  });

  document.getElementById("sidebar")?.classList.remove("active");
  ui.updateBreadcrumbs();

  if (page === "messages" && window.innerWidth <= 768) {
    ui.showContactsPanelMobile();
  }

  if (page === 'map') {
    map.loadMap();
    if (state.mapInstance) {
      setTimeout(() => state.mapInstance.invalidateSize(), 100);
    }
  }

  if (page === 'stewards') {
    api.fetchAvailableStewards().then(() => ui.renderStewards());
  }
}

function handleLogout() {
  ui.handleLogout();
}

function resetPlantsFilters() {
  state.plantQuery = "";
  state.plantStatusFilter = "all";
  state.plantSort = "name-asc";

  const search = document.getElementById("plantSearch");
  if (search) search.value = "";
  const sortEl = document.getElementById("plantSort");
  if (sortEl) sortEl.value = "name-asc";

  document.querySelectorAll("[data-filter]").forEach((b) =>
    b.classList.toggle("active", b.getAttribute("data-filter") === "all")
  );
  ui.renderPlants(true);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Global Bridges
window.handleNotifClick = async function (type) {
  // Generic handler if needed
};

window.dismissNotification = async function (id, element) {
  if (await api.dismissNotification(id)) {
    if (element) {
      const item = element.closest('.notification-item');
      item.style.transition = 'all 0.3s ease';
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      setTimeout(() => {
        item.remove();
        // Check if list is empty
        const list = document.getElementById("notificationsList");
        if (list && list.children.length === 0) {
          list.innerHTML = '<div class="empty-state"><p>No notifications yet</p></div>';
        }
        // Update badge
        loadAndRenderNotifications();
      }, 300);
    }
  }
};

window.toggleTask = function (id) {
  // Tasks removed
};

// Initial Call
initializeApp();
