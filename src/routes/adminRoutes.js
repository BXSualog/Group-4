const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { approveStewSchema, broadcastSchema } = require('../validation/schemas');
const { deleteUserCompletely } = require('../helpers/userHelper');

// Get Global State Helper
async function getGlobalState() {
    try {
        const row = await db.get(`SELECT value FROM system_settings WHERE \`key\` = 'global_state'`);
        if (row) return JSON.parse(row.value);
        return { broadcast: { message: "", active: false }, alert: { message: "", active: false } };
    } catch (err) {
        return { broadcast: { message: "", active: false }, alert: { message: "", active: false } };
    }
}

// Broadcast GET (Public - for displaying alerts)
router.get('/broadcast', async (req, res) => {
    try {
        const state = await getGlobalState();
        res.status(200).json(state);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Broadcast POST (Admin only)
router.post('/broadcast', verifyToken, requireAdmin, validate(broadcastSchema), async (req, res) => {
    try {
        const { message, active, type } = req.body;
        let state = await getGlobalState();

        state[type] = {
            message: message || "",
            active: active ?? true,
            timestamp: new Date().toISOString()
        };

        await db.run(`UPDATE system_settings SET value = ? WHERE \`key\` = 'global_state'`, [JSON.stringify(state)]);
        res.status(200).json({ message: 'Success', state: state });
    } catch (err) {
        console.error("[API] Broadcast POST Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Get Applications (Admin only)
router.get('/admin/applications', verifyToken, requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(`SELECT * FROM steward_applications WHERE status = 'pending' ORDER BY created_at DESC`, []);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Applications Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Approve Steward (Admin only)
router.post('/admin/steward/approve', verifyToken, requireAdmin, validate(approveStewSchema), async (req, res) => {
    try {
        const { email } = req.body;

        await db.run(`UPDATE users SET steward_status = 'approved', is_steward = 1, role = 'steward' WHERE email = ?`, [email]);
        await db.run(`UPDATE steward_applications SET status = 'approved' WHERE user_email = ?`, [email]);
        const result = await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
            [email, 'System Admin', 'application_approved', 'Congratulations! Your stewardship application has been approved.']);

        const emitNotification = req.app.get('emitNotification');
        if (emitNotification) {
            emitNotification(email, {
                id: result.lastID,
                sender_name: 'System Admin',
                type: 'application_approved',
                message: 'Congratulations! Your stewardship application has been approved.'
            });
        }

        res.status(200).json({ message: 'Steward approved' });
    } catch (err) {
        console.error("[API] Approve Steward Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Decline Steward (Admin only)
router.post('/admin/steward/decline', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { email, reason } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        await db.run(`UPDATE users SET steward_status = 'rejected' WHERE email = ?`, [email]);
        await db.run(`UPDATE steward_applications SET status = 'rejected' WHERE user_email = ?`, [email]);

        const msg = `Your stewardship application has been declined. Reason: ${reason || 'No specific reason provided.'}`;
        const result = await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
            [email, 'System Admin', 'application_rejected', msg]);

        const emitNotification = req.app.get('emitNotification');
        if (emitNotification) {
            emitNotification(email, {
                id: result.lastID,
                sender_name: 'System Admin',
                type: 'application_rejected',
                message: msg
            });
        }

        res.status(200).json({ message: 'Steward application declined' });
    } catch (err) {
        console.error("[API] Decline Steward Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin User Management (Admin only) - With real online/offline status
router.get('/admin/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(`SELECT id, username, email, role, status, last_active FROM users ORDER BY created_at DESC`, []);

        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        const usersWithStatus = rows.map(r => {
            // Determine activity status
            let activityStatus = 'Offline';
            if (r.last_active) {
                const lastActiveTime = new Date(r.last_active).getTime();
                if (now - lastActiveTime < FIVE_MINUTES) {
                    activityStatus = 'Online';
                }
            }

            // Return DB status if it's "Banned", otherwise return activity status
            const displayStatus = (r.status === 'Banned') ? 'Banned' : activityStatus;

            return {
                id: r.id,
                name: r.username || r.email.split('@')[0],
                email: r.email,
                role: r.role || 'user',
                status: displayStatus,
                dbStatus: r.status || 'Active' // Keep track of DB status for the edit modal
            };
        });

        res.status(200).json(usersWithStatus);
    } catch (err) {
        console.error("[API] Get Users Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Add User (Admin only)
router.post('/admin/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, email, role, password, status } = req.body;
        const bcrypt = require('bcrypt');
        const hashed = await bcrypt.hash(password || 'Temporary123!', 10);

        await db.run(`INSERT INTO users (username, email, role, password, status) VALUES (?, ?, ?, ?, ?)`,
            [name, email, role || 'user', hashed, status || 'Active']);

        res.status(201).json({ message: 'User created' });
    } catch (err) {
        console.error("[API] Add User Error:", err);
        res.status(500).json({ error: 'Database error or User already exists' });
    }
});

// Admin Update User (Admin only)
router.post('/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, status } = req.body;

        const user = await db.get(`SELECT email FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await db.run(`UPDATE users SET username = ?, role = ?, status = ? WHERE id = ?`, [name, role, status || 'Active', id]);

        const notifMsg = `Your account profile has been updated by an admin.`;
        const result = await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
            [user.email, 'System Admin', 'profile_update', notifMsg]);

        const emitNotification = req.app.get('emitNotification');
        if (emitNotification) {
            emitNotification(user.email, {
                id: result.lastID,
                sender_name: 'System Admin',
                type: 'profile_update',
                message: notifMsg
            });
        }

        res.status(200).json({ message: 'User updated' });
    } catch (err) {
        console.error("[API] Update User Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Delete User (Admin only)
router.delete('/admin/users/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await db.get(`SELECT email FROM users WHERE id = ?`, [id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await deleteUserCompletely(user.email);
        res.status(200).json({ message: 'User and all associated data deleted' });
    } catch (err) {
        console.error("[API] Delete User Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Plants Management (Admin only) - Get ALL plants from database
router.get('/admin/plants', verifyToken, requireAdmin, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT p.*, u.username as owner_name
            FROM plants p
            LEFT JOIN users u ON p.owner_email = u.email
            ORDER BY p.created_at DESC
        `, []);

        res.status(200).json(rows.map(p => ({
            id: p.id,
            name: p.name || 'Unnamed Plant',
            location: p.location || 'Unknown',
            height: p.height || 'N/A',
            status: p.status || 'healthy',
            owner_email: p.owner_email,
            owner_name: p.owner_name || 'Unknown',
            emoji: p.emoji || '🌱'
        })));
    } catch (err) {
        console.error("[API] Get Admin Plants Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Add Plant (Admin only)
router.post('/admin/plants', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, location, height, status, owner_email } = req.body;

        await db.run(`INSERT INTO plants (name, location, height, status, owner_email) VALUES (?, ?, ?, ?, ?)`,
            [name, location, height, status || 'healthy', owner_email || 'admin@plant.com']);

        res.status(201).json({ message: 'Plant created' });
    } catch (err) {
        console.error("[API] Add Plant Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Update Plant (Admin only)
router.post('/admin/plants/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, height, status } = req.body;

        const plant = await db.get(`SELECT name, owner_email, caretaker_email FROM plants WHERE id = ?`, [id]);
        if (!plant) return res.status(404).json({ error: 'Plant not found' });

        await db.run(`UPDATE plants SET name = ?, location = ?, height = ?, status = ? WHERE id = ?`,
            [name, location, height, status, id]);

        const notifMsg = `An admin has updated details for your plant: ${plant.name || name}`;
        const emitNotification = req.app.get('emitNotification');

        const targets = [plant.owner_email, plant.caretaker_email].filter(e => e && e !== 'admin@plant.com');
        const uniqueTargets = [...new Set(targets)];

        for (const targetEmail of uniqueTargets) {
            const result = await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
                [targetEmail, 'System Admin', 'plant_update', notifMsg]);

            if (emitNotification) {
                emitNotification(targetEmail, {
                    id: result.lastID,
                    sender_name: 'System Admin',
                    type: 'plant_update',
                    message: notifMsg
                });
            }
        }

        res.status(200).json({ message: 'Plant updated' });
    } catch (err) {
        console.error("[API] Update Plant Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin Delete Plant (Admin only)
router.delete('/admin/plants/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run(`DELETE FROM plants WHERE id = ?`, [id]);
        res.status(200).json({ message: 'Plant deleted' });
    } catch (err) {
        console.error("[API] Delete Plant Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
