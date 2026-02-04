import * as api from './api.js';
import * as ui from './ui.js';
import { validateField, validateForm } from './validation.js';

// Initialization
async function initializeSettings() {
    const email = localStorage.getItem("pm_user_email");
    if (!email) {
        window.location.href = "index.html";
        return;
    }

    setupEventListeners();

    // Fetch and apply profile data from database
    const profile = await api.fetchUserProfile(email);
    if (profile) {
        applyProfileToUI(profile);
    }

    // Set Profile Sidebar Info
    ui.updateNavProfile(profile);
}

function applyProfileToUI(profile) {
    // Navigation Profile Sync
    const navName = document.getElementById("navUserName");
    const navAvatar = document.getElementById("navUserAvatar");
    const roleLabel = document.getElementById("dropdownRoleLabel");

    if (navName) navName.textContent = profile.username || "Setup Profile";
    if (navAvatar) navAvatar.textContent = profile.avatar || profile.username?.charAt(0).toUpperCase() || "?";
    if (roleLabel && profile.role) {
        roleLabel.textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1) + " Account";
    }

    // Form Fields
    const usernameInput = document.getElementById("settingsUsername");
    const bioInput = document.getElementById("settingsBio");
    if (usernameInput) usernameInput.value = profile.username || "";
    if (bioInput) bioInput.value = profile.bio || "";

    // Avatar Selection
    if (profile.avatar) {
        const avatarOpt = document.querySelector(`.avatar-opt[data-avatar="${profile.avatar}"]`);
        if (avatarOpt) {
            document.querySelectorAll(".avatar-opt").forEach(o => o.classList.remove("selected"));
            avatarOpt.classList.add("selected");
        }
    }

    // Theme Preference
    if (profile.theme) {
        document.documentElement.setAttribute("data-theme", profile.theme);
        const themeCard = document.querySelector(`.theme-card[data-theme="${profile.theme}"]`);
        if (themeCard) {
            document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
            themeCard.classList.add("active");
        }
    }
}

function setupEventListeners() {
    const email = localStorage.getItem("pm_user_email");

    // 1. Tab Switching
    const tabs = document.querySelectorAll(".settings-tab");
    const sections = document.querySelectorAll(".settings-section");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.tab;
            tabs.forEach(t => t.classList.toggle("active", t === tab));
            sections.forEach(s => s.classList.toggle("active", s.id === `tab-${target}`));
        });
    });

    // 2. Avatar Selection
    const avatarOpts = document.querySelectorAll(".avatar-opt");
    avatarOpts.forEach(opt => {
        opt.addEventListener("click", () => {
            avatarOpts.forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
        });
    });

    // 3. Profile Form Submission
    const profileForm = document.getElementById("settingsProfileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const config = {
                settingsBio: [{ max: 200, message: "Bio must be under 200 characters" }]
            };

            if (!validateForm("settingsProfileForm", config)) return;

            const username = document.getElementById("settingsUsername").value;
            const bio = document.getElementById("settingsBio").value;
            const avatar = document.querySelector(".avatar-opt.selected")?.dataset.avatar;

            const success = await api.updateProfile({ email, username, bio, avatar });
            if (success) {
                ui.toast("Profile updated successfully!");
                // Refresh local UI
                const updatedProfile = await api.fetchUserProfile(email);
                if (updatedProfile) {
                    applyProfileToUI(updatedProfile);
                    // Update localStorage for other pages
                    if (updatedProfile.username) localStorage.setItem("pm_user_name", updatedProfile.username);
                    if (updatedProfile.avatar) localStorage.setItem("pm_user_avatar", updatedProfile.avatar);
                }
            } else {
                ui.toast("Failed to update profile.");
            }
        });

        // Real-time validation
        document.getElementById("settingsBio")?.addEventListener("input", (e) => {
            validateField(e.target, [{ max: 200, message: "Bio must be under 200 characters" }]);
        });
    }

    // 4. Password Form Submission
    const passwordForm = document.getElementById("passwordForm");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const config = {
                currentPass: [{ required: true, message: "Current password is required" }],
                newPass: [{ required: true, message: "New password is required" }, { min: 6, message: "Minimum 6 characters" }]
            };

            if (!validateForm("passwordForm", config)) return;

            const currentPass = document.getElementById("currentPass").value;
            const newPass = document.getElementById("newPass").value;

            const { ok, data } = await api.updatePassword(email, currentPass, newPass);
            if (ok) {
                ui.toast("Password updated successfully!");
                passwordForm.reset();
            } else {
                ui.toast(data.error || "Failed to update password.");
            }
        });
    }

    // 5. Theme Selection
    const themeCards = document.querySelectorAll(".theme-card");
    themeCards.forEach(card => {
        card.addEventListener("click", async () => {
            const theme = card.dataset.theme;
            document.documentElement.setAttribute("data-theme", theme);
            themeCards.forEach(c => c.classList.toggle("active", c === card));

            // Save theme to database
            await api.updateProfile({ email, theme });
            ui.toast(`Theme set to ${theme}`);
        });
    });

    // 6. Data Export
    const exportBtn = document.getElementById("btnExportData");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            api.exportUserData(email);
            ui.toast("Preparing your data archive...");
        });
    }

    // 7. Logout
    const logoutBtn = document.getElementById("btnLogout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ui.handleLogout();
        });
    }

    // 8. Delete Account
    const deleteBtn = document.getElementById("btnDeleteAccount");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            const confirmed = confirm("WARNING: This will permanently delete your account and all associated data (plants, messages, history). This action cannot be undone.\n\nAre you sure you want to proceed?");
            if (confirmed) {
                const secondConfirm = confirm("FINAL CONFIRMATION: Please confirm one last time that you wish to ERASE all your data.");
                if (secondConfirm) {
                    const success = await api.deleteAccount();
                    if (success) {
                        await ui.alert("Account Deleted", "Your account and all associated data have been permanently deleted.");
                        ui.handleLogout();
                    } else {
                        ui.toast("Failed to delete account. Please try again or contact support.");
                    }
                }
            }
        });
    }

    // 9. Mobile Menu
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.getElementById("sidebar");
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
        });
    }

    // 9. Profile Dropdown
    const profileTrigger = document.getElementById("userProfileTrigger");
    const profileDropdown = document.getElementById("profileDropdown");
    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle("active");
        });
        document.addEventListener("click", () => {
            profileDropdown.classList.remove("active");
        });
    }
}

// Start Initialization
initializeSettings();
