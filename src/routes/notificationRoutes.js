const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// Get Notifications (Protected)
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        // Users can only view their own notifications
        if (email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot view other user\'s notifications' });
        }

        const rows = await db.all(`SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 20`, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Notifications Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Notification (Protected)
router.delete('/notifications/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[API] Deleting notification ID ${id} per request`);

        // First verify the notification belongs to the user
        const notif = await db.get(`SELECT user_email FROM notifications WHERE id = ?`, [id]);
        if (!notif) return res.status(404).json({ error: 'Notification not found' });

        if (notif.user_email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot delete other user\'s notification' });
        }

        await db.run(`DELETE FROM notifications WHERE id = ?`, [id]);
        res.status(200).json({ message: 'Notification deleted' });
    } catch (err) {
        console.error("[API] Deletion error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Mark Notifications as Read (Protected)
router.post('/notifications/read', verifyToken, async (req, res) => {
    try {
        const email = req.body.email || req.user.email;

        // Users can only mark their own notifications as read
        if (email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot modify other user\'s notifications' });
        }

        await db.run(`UPDATE notifications SET is_read = 1 WHERE user_email = ?`, [email]);
        res.status(200).json({ message: 'Notifications marked as read' });
    } catch (err) {
        console.error("[API] Mark Read Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
