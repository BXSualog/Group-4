/**
 * Socket.io Client Implementation
 */

import { API_BASE_URL } from './config.js';

let socket = null;

export function initSocket(userEmail, callbacks = {}) {
    if (socket) return socket;

    // Initialize socket connection
    // Note: io is globally available from the script tag in dashboard.html
    socket = io(API_BASE_URL);

    socket.on('connect', () => {
        console.log('%c[Socket] Connected to real-time server', 'color: #27ae60; font-weight: bold;');
        socket.emit('join', userEmail);
    });

    socket.on('new_message', (msg) => {
        console.log('[Socket] New message received:', msg);
        if (callbacks.onMessage) callbacks.onMessage(msg);
    });

    socket.on('new_notification', (notif) => {
        console.log('[Socket] New notification received:', notif);
        if (callbacks.onNotification) callbacks.onNotification(notif);
    });

    socket.on('disconnect', () => {
        console.warn('[Socket] Disconnected');
    });

    return socket;
}

export function getSocket() {
    return socket;
}
