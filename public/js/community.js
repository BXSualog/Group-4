import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { validateField, clearError } from './validation.js';

export function setupCommunityEvents() {
    state.communityFilter = 'All'; // Default

    document.getElementById("communityPostBtn")?.addEventListener("click", handleCommunityPost);

    document.querySelectorAll("[data-feed-filter]").forEach(btn => {
        btn.addEventListener("click", () => {
            state.communityFilter = btn.getAttribute("data-feed-filter");
            document.querySelectorAll("[data-feed-filter]").forEach(b => b.classList.toggle("active", b === btn));
            refreshCommunity();
        });
    });

    const postTags = document.querySelectorAll(".tag-btn");
    postTags.forEach(btn => {
        btn.addEventListener("click", () => {
            postTags.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });

    document.getElementById("communitySearchInput")?.addEventListener("input", debounce(() => {
        state.communitySearchQuery = document.getElementById("communitySearchInput").value;
        refreshCommunity();
    }, 500));

    document.getElementById("communitySortSelect")?.addEventListener("change", (e) => {
        state.communitySort = e.target.value;
        refreshCommunity();
    });

    // Media Upload
    document.getElementById("btnUploadMedia")?.addEventListener("click", () => document.getElementById("communityMediaInput").click());
    document.getElementById("communityMediaInput")?.addEventListener("change", handleMediaSelect);
    document.getElementById("removeMediaBtn")?.addEventListener("click", clearMediaSelection);

    // Initial Load
    refreshCommunity();
    api.fetchTopContributors().then(data => ui.renderTopContributors(data));
    api.fetchTrends().then(data => ui.renderTrends(data));

    // Bridge Global Functions for Legacy HTML onclicks
    window.handleDeletePost = handleDeletePost;
    window.togglePin = togglePin;
    window.imgLike = imgLike;
    window.toggleComments = toggleComments;
    window.submitComment = submitComment;
    window.filterByTrend = filterByTrend;
}

export async function refreshCommunity() {
    await api.fetchCommunityFeed();
    ui.renderCommunityFeed();
}

async function handleCommunityPost() {
    const input = document.getElementById("communityPostInput");
    const activeTag = document.querySelector(".tag-btn.active");

    if (!input.value.trim() && !state.selectedMediaFile) {
        ui.toast("Please add text or media!");
        return;
    }

    if (input.value.trim() && !validateField(input, [{ min: 3, message: "Post must be at least 3 characters" }])) {
        return;
    }

    const formData = new FormData();
    formData.append('author', localStorage.getItem("pm_user_name") || "User");
    formData.append('author_email', localStorage.getItem("pm_user_email"));
    formData.append('avatar', localStorage.getItem("pm_user_avatar") || "👤");
    formData.append('content', input.value);
    formData.append('type', activeTag ? activeTag.textContent : "Tips");
    if (state.selectedMediaFile) formData.append('media', state.selectedMediaFile);

    const success = await api.submitCommunityPost(formData);
    if (success) {
        input.value = "";
        clearError(input);
        clearMediaSelection();
        refreshCommunity();
        ui.toast("Posted successfully!");
    } else {
        ui.toast("Failed to post");
    }
}

function handleMediaSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    state.selectedMediaFile = file;
    const container = document.getElementById("mediaPreviewContainer");
    container.style.display = "block";
    container.innerHTML = `<button id="removeMediaBtn" class="remove-media-btn">&times;</button>`;

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = document.createElement("img");
        img.src = ev.target.result;
        container.appendChild(img);
        document.getElementById("removeMediaBtn").onclick = clearMediaSelection;
    };
    reader.readAsDataURL(file);
}

function clearMediaSelection() {
    state.selectedMediaFile = null;
    document.getElementById("communityMediaInput").value = "";
    document.getElementById("mediaPreviewContainer").style.display = "none";
}

// --- Bridge Functions ---

async function handleDeletePost(id) {
    if (!confirm("Delete post?")) return;
    const s = await api.deletePost(id);
    if (s) {
        ui.toast("Post deleted");
        refreshCommunity();
    }
}

async function togglePin(id) {
    const s = await api.pinPost(id);
    if (s) {
        ui.toast("Pin updated");
        refreshCommunity();
    }
}

async function imgLike(id, btn) {
    const data = await api.likePost(id);
    if (data) {
        refreshCommunity();
    }
}

async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (section.style.display === 'none') {
        section.style.display = 'flex';
        const comments = await api.fetchComments(postId);
        ui.renderComments(postId, comments);
    } else {
        section.style.display = 'none';
    }
}

async function submitComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    if (!content) return;

    const author = {
        author: localStorage.getItem("pm_user_name") || "User",
        author_email: localStorage.getItem("pm_user_email"),
        avatar: localStorage.getItem("pm_user_avatar") || "👤"
    };

    const s = await api.submitComment(postId, content, author);
    if (s) {
        input.value = "";
        const comments = await api.fetchComments(postId);
        ui.renderComments(postId, comments);
        refreshCommunity();
    }
}

function filterByTrend(tag) {
    state.communitySearchQuery = "";
    state.communityFilter = tag;
    const filterBtns = document.querySelectorAll("[data-feed-filter]");
    filterBtns.forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-feed-filter") === tag);
    });
    const searchInput = document.getElementById("communitySearchInput");
    if (searchInput) searchInput.value = "";
    refreshCommunity();
}


function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
