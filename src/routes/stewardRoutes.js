const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken, requireSteward } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { generateRoutineTasks } = require('../helpers/routineGenerator');
const {
    createTaskSchema,
    createRoutineSchema,
    addInventorySchema,
    stewardApplicationSchema
} = require('../validation/schemas');

// --- Stats & Schedule (Protected + Steward) ---
router.get('/steward/stats', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const stats = {};

        const plantRow = await db.get(`SELECT COUNT(*) as plantCount FROM plants WHERE caretaker_email = ?`, [email]);
        stats.plantCount = plantRow?.plantCount || 0;

        const healthRow = await db.get(`SELECT AVG(status = 'healthy') * 100 as healthScore FROM plants WHERE caretaker_email = ?`, [email]);
        stats.healthScore = Math.round(healthRow?.healthScore || 0);

        const taskRow = await db.get(`SELECT COUNT(*) as tasksDone FROM tasks WHERE steward_email = ? AND status = 'completed'`, [email]);
        stats.tasksDone = taskRow?.tasksDone || 0;

        res.status(200).json(stats);
    } catch (err) {
        console.error("[API] Steward Stats Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/steward/schedule', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        // generateRoutineTasks might need to be promisified too if it's not already
        generateRoutineTasks(email, async () => {
            try {
                const sql = `
                    SELECT t.*, p.name as plant_name, p.coords, p.location, u.username as owner_name, u.email as owner_email
                    FROM tasks t 
                    LEFT JOIN plants p ON t.plant_id = p.id 
                    LEFT JOIN users u ON p.owner_email = u.email
                    WHERE t.steward_email = ? AND t.status != 'archived'
                    ORDER BY t.due_date ASC
                `;
                const rows = await db.all(sql, [email]);
                res.status(200).json(rows);
            } catch (err) {
                console.error("[API] Steward Schedule Error:", err);
                res.status(500).json({ error: 'Database error' });
            }
        });
    } catch (err) {
        console.error("[API] Steward Schedule Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Tasks (Protected + Steward) ---
router.get('/steward/tasks', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const { filter } = req.query;

        let sql = `SELECT t.*, p.name as plant_name, p.emoji as plant_emoji 
                   FROM tasks t 
                   LEFT JOIN plants p ON t.plant_id = p.id 
                   WHERE t.steward_email = ? AND t.status = 'pending'`;

        if (filter === 'urgent') {
            sql += ` AND (t.due_date <= NOW() OR t.due_date IS NULL)`;
        } else if (filter === 'today') {
            sql += ` AND DATE(t.due_date) = CURDATE()`;
        }

        sql += ` ORDER BY t.due_date ASC`;

        const rows = await db.all(sql, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Tasks Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/steward/tasks', verifyToken, requireSteward, validate(createTaskSchema), async (req, res) => {
    try {
        const { plant_id, steward_email, title, type, due_date } = req.body;
        if (!steward_email) return res.status(400).json({ error: "Missing required field: steward_email" });

        // Format ISO date to MySQL DATETIME (YYYY-MM-DD HH:MM:SS) if present
        let formattedDate = null;
        if (due_date) {
            formattedDate = due_date.replace('T', ' ').substring(0, 19);
        }

        const sql = `INSERT INTO tasks(plant_id, steward_email, title, type, due_date, status) VALUES(?, ?, ?, ?, ?, 'pending')`;

        // Explicitly handle undefined for all optional fields to prevent SQL bind errors
        const result = await db.run(sql, [
            plant_id || null,
            steward_email,
            title || "Untitled Task",
            type || 'general',
            formattedDate
        ]);
        res.status(201).json({ id: result.lastID, message: 'Task created' });
    } catch (err) {
        console.error("[API] Create Task Error:", err);
        res.status(500).json({ error: 'Database error', details: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
    }
});

router.get('/steward/task-stats', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        const sql = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM tasks 
            WHERE steward_email = ? AND (due_date IS NULL OR DATE(due_date) = CURDATE())
        `;

        const row = await db.get(sql, [email]);
        res.status(200).json(row || { total: 0, completed: 0 });
    } catch (err) {
        console.error("[API] Task Stats Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Routines (Protected + Steward) ---
router.post('/steward/routines', verifyToken, requireSteward, validate(createRoutineSchema), async (req, res) => {
    try {
        const { steward_email, plant_id, title, type, frequency_days, timing_block } = req.body;

        const sql = `INSERT INTO steward_routines (steward_email, plant_id, title, type, frequency_days, timing_block) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        const result = await db.run(sql, [steward_email, plant_id, title, type, frequency_days, timing_block]);
        res.status(201).json({ id: result.lastID, message: 'Routine created' });
    } catch (err) {
        console.error("[API] Create Routine Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/steward/routines', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const rows = await db.all(`SELECT * FROM steward_routines WHERE steward_email = ? AND active = 1`, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Routines Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/steward/routines/:id', verifyToken, requireSteward, async (req, res) => {
    try {
        await db.run(`UPDATE steward_routines SET active = 0 WHERE id = ?`, [req.params.id]);
        res.status(200).json({ message: 'Routine stopped' });
    } catch (err) {
        console.error("[API] Delete Routine Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Clients (Protected + Steward) ---
router.get('/steward/clients', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        const sql = `
            SELECT DISTINCT u.username, u.email, u.avatar 
            FROM users u
            JOIN plants p ON u.email = p.owner_email
            WHERE p.caretaker_email = ?

            UNION

            SELECT u.username, u.email, u.avatar
            FROM users u
            JOIN connections c ON u.email = c.user_email
            WHERE c.steward_email = ? AND c.status = 'accepted'
        `;
        const rows = await db.all(sql, [email, email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Clients Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/steward/clients/message', verifyToken, requireSteward, async (req, res) => {
    try {
        const { steward_name, client_email, message } = req.body;
        if (!client_email || !message) return res.status(400).json({ error: 'Client email and message required' });

        await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, 'steward_message', ?)`,
            [client_email, steward_name, message]);
        res.status(200).json({ message: 'Message sent' });
    } catch (err) {
        console.error("[API] Client Message Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Inventory (Protected + Steward) ---
router.get('/steward/inventory', verifyToken, requireSteward, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const rows = await db.all(`SELECT * FROM inventory WHERE steward_email = ? ORDER BY item_name ASC`, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Inventory Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/steward/inventory/update', verifyToken, requireSteward, async (req, res) => {
    try {
        const { id, quantity } = req.body;
        await db.run(`UPDATE inventory SET quantity = ? WHERE id = ?`, [quantity, id]);
        res.status(200).json({ message: 'Inventory updated' });
    } catch (err) {
        console.error("[API] Update Inventory Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/steward/inventory/add', verifyToken, requireSteward, validate(addInventorySchema), async (req, res) => {
    try {
        const { steward_email, item_name, quantity, unit, threshold, category, expiry_date, storage_location, cost_per_unit, owner_email } = req.body;

        const sql = `INSERT INTO inventory (steward_email, owner_email, item_name, quantity, unit, threshold, category, expiry_date, storage_location, cost_per_unit)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const owner = owner_email || steward_email;

        const result = await db.run(sql, [steward_email, owner, item_name, quantity || 0, unit || 'pcs', threshold || 0, category || 'General', expiry_date, storage_location, cost_per_unit || 0]);
        res.status(201).json({ message: 'Item added', id: result.lastID });
    } catch (err) {
        console.error("[API] Add Inventory Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/steward/inventory/request', verifyToken, requireSteward, async (req, res) => {
    try {
        const { steward_email, owner_email, item_name, steward_name } = req.body;
        const msg = `Steward ${steward_name} requested a restock of "${item_name}"`;
        await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
            [owner_email, steward_name, 'restock_request', msg]);
        res.status(200).json({ message: 'Restock request sent' });
    } catch (err) {
        console.error("[API] Inventory Request Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/steward/inventory/:id', verifyToken, requireSteward, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run(`DELETE FROM inventory WHERE id = ?`, [id]);
        res.status(200).json({ message: 'Item deleted' });
    } catch (err) {
        console.error("[API] Delete Inventory Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Steward Locator (Protected) ---
router.get('/stewards/available', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        console.log(`[API] Fetching available stewards for: ${email}`);
        const rows = await db.all(`
            SELECT u.username, u.email, u.avatar, u.role, u.bio, c.status as connection_status
            FROM users u
            LEFT JOIN connections c ON (c.steward_email = u.email AND c.user_email = ?)
            WHERE u.is_steward = 1
        `, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Steward Discovery Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.get('/connections', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const sql = `
            SELECT u.username, u.email, u.avatar, u.role, u.is_steward
            FROM users u
            JOIN connections c ON(u.email = c.user_email OR u.email = c.steward_email)
            WHERE(c.user_email = ? OR c.steward_email = ?) 
            AND u.email != ?
            AND c.status = 'accepted'
        `;
        const rows = await db.all(sql, [email, email, email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Connections Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Steward Application (Protected)
router.post('/steward/apply', verifyToken, validate(stewardApplicationSchema), async (req, res) => {
    try {
        const { email, full_name, experience_years, certifications, reason } = req.body;

        if (!email) {
            console.error("[API] Steward Application Error: Missing email in body");
            return res.status(400).json({ error: 'Email is required' });
        }

        console.log(`[API] Processing steward application for: ${email}`);

        await db.run(`INSERT INTO steward_applications (user_email, full_name, experience_years, certifications, reason) VALUES (?, ?, ?, ?, ?)`,
            [email, full_name, experience_years, certifications, reason]);

        const userUpdate = await db.run(`UPDATE users SET steward_status = 'pending' WHERE email = ?`, [email]);
        console.log(`[API] User steward_status updated: ${userUpdate.changes} row(s) affected`);

        res.status(200).json({ message: 'Application submitted' });
    } catch (err) {
        console.error("[API] Steward Application Error:", err);
        res.status(500).json({
            error: 'Database error',
            details: err.message,
            sqlMessage: err.sqlMessage || undefined
        });
    }
});

// Client Request Update (Protected)
router.post('/client/request-update', verifyToken, async (req, res) => {
    try {
        const { plant_id } = req.body;

        const plant = await db.get(`SELECT p.*, u.username as owner_name FROM plants p JOIN users u ON p.owner_email = u.email WHERE p.id = ?`, [plant_id]);
        if (!plant) return res.status(404).json({ error: 'Plant not found' });
        if (!plant.caretaker_email) return res.status(400).json({ error: 'No steward assigned to this plant' });

        const msg = `${plant.owner_name} requested an update for ${plant.name}`;
        await db.run(`INSERT INTO notifications(user_email, sender_name, type, message) VALUES(?, ?, ?, ?)`,
            [plant.caretaker_email, plant.owner_name, 'update_request', msg]);

        res.status(200).json({ message: 'Update requested' });
    } catch (err) {
        console.error("[API] Request Update Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Client Payment to Steward (Protected)
router.post('/steward/pay', verifyToken, async (req, res) => {
    try {
        const { amount, steward_email, client_email, type } = req.body;

        if (!amount || !steward_email || !client_email) {
            return res.status(400).json({ error: 'Missing payment details' });
        }

        const commission = amount * 0.10; // 10% commission
        const netAmount = amount - commission;

        const sql = `INSERT INTO transactions (user_email, steward_email, amount, commission, type, status) 
                     VALUES (?, ?, ?, ?, ?, 'completed')`;
        const result = await db.run(sql, [client_email, steward_email, amount, commission, type || 'maintenance']);

        // Notify steward
        await db.run(`INSERT INTO notifications (user_email, sender_name, type, message) VALUES (?, ?, ?, ?)`,
            [steward_email, 'System', 'payment_received', `You received a payment of P${netAmount.toFixed(2)} (Commission P${commission.toFixed(2)} deducted)`]);

        res.status(200).json({
            message: 'Payment processed succesfully',
            transactionId: result.lastID,
            netAmount,
            commission
        });
    } catch (err) {
        console.error("[API] Payment Error:", err);
        res.status(500).json({ error: 'Payment failed' });
    }
});

module.exports = router;
