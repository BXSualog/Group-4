const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendMessageSchema } = require('../validation/schemas');

// Send Message (Protected)
router.post('/messages/send', verifyToken, validate(sendMessageSchema), async (req, res) => {
    try {
        const { sender_email, receiver_email, message_text } = req.body;
        console.log(`[API] Message from ${sender_email} to ${receiver_email}`);

        // Verify sender is the authenticated user
        if (sender_email !== req.user.email) {
            return res.status(403).json({ error: 'Cannot send message as another user' });
        }

        const result = await db.run(`INSERT INTO messages(sender_email, receiver_email, message_text) VALUES(?, ?, ?)`,
            [sender_email, receiver_email, message_text]);

        console.log(`[API] Message sent successfully, ID: ${result.lastID}`);

        // Emit real-time message event (io is attached to app)
        const io = req.app.get('io');
        if (io) {
            io.to(receiver_email).emit('new_message', {
                id: result.lastID,
                sender_email,
                message_text,
                created_at: new Date().toISOString()
            });
        }

        res.status(201).json({ message: 'Message sent', id: result.lastID });
    } catch (err) {
        console.error('[API] Message send error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Messages (Protected)
router.get('/messages', verifyToken, async (req, res) => {
    try {
        const { user1, user2 } = req.query;

        if (!user1 || !user2) {
            return res.status(400).json({ error: 'Both user emails required' });
        }

        // Verify the authenticated user is part of the conversation
        if (user1 !== req.user.email && user2 !== req.user.email) {
            return res.status(403).json({ error: 'Cannot read messages from other conversations' });
        }

        const sql = `
            SELECT * FROM messages
            WHERE(sender_email = ? AND receiver_email = ?)
            OR(sender_email = ? AND receiver_email = ?)
            ORDER BY created_at ASC
        `;

        const rows = await db.all(sql, [user1, user2, user2, user1]);
        res.status(200).json(rows);
    } catch (err) {
        console.error('[API] Message fetch error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
