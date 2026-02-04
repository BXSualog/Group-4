import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';

export function setupChatEvents() {
    document.getElementById("sendBtn")?.addEventListener("click", handleSendMessage);
    document.getElementById("messageInput")?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSendMessage();
    });

    document.addEventListener('select-contact', async (e) => {
        const contactId = e.detail;
        const contact = state.contactsData.find(c => c.id === contactId);
        if (contact) {
            state.selectedContact = contact;
            selectContact(contactId);
        }
    });

    // Bridge global
    window.sendConnectionRequest = sendConnectionRequest;
}

export async function selectContact(contactId) {
    const contact = state.contactsData.find(c => c.id === contactId);
    if (!contact) return;
    state.selectedContact = contact;
    contact.unread = 0;

    const chatHeader = document.getElementById("chatHeader");
    if (chatHeader) {
        chatHeader.innerHTML = `
            <div class="contact-avatar">${contact.initials}</div>
            <div class="chat-contact-info">
                <h4>${contact.name}</h4>
                <p>${contact.role}</p>
            </div>
        `;
    }

    // Load messages
    const msgs = await api.fetchMessages(localStorage.getItem("pm_user_email"), contact.email);
    ui.renderMessages(msgs);

    const inputArea = document.getElementById("messageInputArea");
    if (inputArea) inputArea.style.display = "flex";

    ui.renderContactsUI(); // Re-render to update active and unread
    if (window.innerWidth <= 768) ui.showChatPanelMobile();
}

async function handleSendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text || !state.selectedContact) return;

    const success = await api.sendMessage(localStorage.getItem("pm_user_email"), state.selectedContact.email, text);
    if (success) {
        input.value = "";
        ui.toast("Message sent");
        // Reload
        selectContact(state.selectedContact.id);
    } else {
        ui.toast("Failed to send");
    }
}

async function sendConnectionRequest(stewardEmail) {
    return await api.requestConnection(stewardEmail);
}

export function handleIncomingMessage(msg) {
    console.log("[Chat] Handling incoming message:", msg);
    // If the sender is the currently selected contact, reload the chat
    if (state.selectedContact && state.selectedContact.email === msg.sender_email) {
        // Refresh messages in the current view
        api.fetchMessages(localStorage.getItem("pm_user_email"), msg.sender_email).then(msgs => {
            ui.renderMessages(msgs);
        });
    } else {
        // Otherwise, update the contacts list to show unread badge
        if (state.contactsData) {
            const contact = state.contactsData.find(c => c.email === msg.sender_email);
            if (contact) {
                contact.unread = (contact.unread || 0) + 1;
                ui.renderContactsUI();
            }
        }
        ui.toast(`New message from ${msg.sender_email}`);
    }
}
