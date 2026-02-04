const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPlantSchema, updatePlantSchema } = require('../validation/schemas');

// Get Plants (Protected)
router.get('/plants', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        const sql = `
            SELECT p.*, u.username as owner_username 
            FROM plants p 
            LEFT JOIN users u ON p.owner_email = u.email 
            WHERE p.owner_email = ? OR p.caretaker_email = ?
        `;

        const rows = await db.all(sql, [email, email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Plants Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Plant Details (Protected)
router.get('/plants/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const plant = await db.get(`SELECT * FROM plants WHERE id = ?`, [id]);
        if (!plant) return res.status(404).json({ error: 'Plant not found' });

        const timeline = await db.all(`SELECT * FROM plant_timeline WHERE plant_id = ? ORDER BY created_at DESC`, [id]);
        const images = await db.all(`SELECT * FROM plant_images WHERE plant_id = ? ORDER BY created_at DESC`, [id]);

        res.status(200).json({
            ...plant,
            timeline: timeline || [],
            images: images || []
        });
    } catch (err) {
        console.error("[API] Plant Details Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create Plant (Protected)
router.post('/plants/create', verifyToken, validate(createPlantSchema), async (req, res) => {
    try {
        const { name, owner_email, caretaker_email, status, location, coords, emoji, type } = req.body;

        const result = await db.run(`INSERT INTO plants (name, owner_email, caretaker_email, status, location, coords, emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [name, owner_email, caretaker_email, status || 'healthy', location, coords, emoji || '🌱']);

        const plantId = result.lastID;

        await db.run(`INSERT INTO plant_timeline (plant_id, event_type, description, emoji) VALUES (?, 'planted', ?, '🌱')`,
            [plantId, `Planted as a ${type || 'Plant'} in ${location}`]);

        if (owner_email !== caretaker_email) {
            await db.run(`INSERT INTO notifications (user_email, sender_name, type, message, meta) VALUES (?, ?, 'new_plant', ?, ?)`,
                [owner_email, 'Steward', `added a new plant: ${name}`, plantId]);
        }

        res.status(201).json({ message: 'Plant created', id: plantId });
    } catch (err) {
        console.error("[API] Create Plant Error:", err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Update Plant Details (Protected)
router.post('/plants/update-details', verifyToken, validate(updatePlantSchema), async (req, res) => {
    try {
        const { id, size, height, age, soil_type, last_watered, status } = req.body;

        const sql = `UPDATE plants SET size = ?, height = ?, age = ?, soil_type = ?, last_watered = ?, status = ? WHERE id = ?`;
        const params = [size, height, age, soil_type, last_watered, status, id];

        await db.run(sql, params);

        await db.run(`INSERT INTO plant_timeline (plant_id, event_type, description, emoji) VALUES (?, 'update', ?, '📝')`,
            [id, `Plant details updated (Status: ${status})`]);

        res.status(200).json({ message: 'Plant details updated' });
    } catch (err) {
        console.error("[API] Update Plant Details Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Diagnoses (Protected)
router.get('/diagnoses', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const rows = await db.all(`SELECT * FROM diagnoses WHERE user_email = ? ORDER BY created_at DESC LIMIT 50`, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Diagnoses Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/diagnoses', verifyToken, async (req, res) => {
    try {
        const { user_email, plant_id, title, severity, status, date } = req.body;
        if (!user_email || !title) return res.status(400).json({ error: 'User email and title required' });

        const sql = `INSERT INTO diagnoses(user_email, plant_id, title, severity, status, date) VALUES(?, ?, ?, ?, ?, ?)`;
        const result = await db.run(sql, [user_email, plant_id, title, severity, status, date]);
        res.status(201).json({ id: result.lastID, message: 'Diagnosis saved' });
    } catch (err) {
        console.error("[API] Save Diagnosis Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
