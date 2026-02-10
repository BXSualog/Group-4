/**
 * Plant Monitoring Server (Modular Edition)
 * Entry point that loads routes from src/ directory
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database
const { db } = require('./src/config/db');

// Middleware
const { verifyToken, requireSteward } = require('./src/middleware/auth');
const { validate } = require('./src/middleware/validate');
const {
    connectionRequestSchema,
    connectionAcceptSchema
} = require('./src/validation/schemas');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const plantRoutes = require('./src/routes/plantRoutes');
const stewardRoutes = require('./src/routes/stewardRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// ===========================================
// APP SETUP
// ===========================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Make io accessible to routes
app.set('io', io);

// ===========================================
// SOCKET.IO
// ===========================================

io.on('connection', (socket) => {
    socket.on('join', (email) => {
        if (email) {
            socket.join(email);
            console.log(`[Socket] User ${email} joined room`);
        }
    });

    socket.on('disconnect', () => {
        // Handle disconnect if needed
    });
});

// Helper for real-time notifications
const emitNotification = (userEmail, payload) => {
    io.to(userEmail).emit('new_notification', {
        ...payload,
        created_at: new Date().toISOString(),
        is_read: 0
    });
};

// Make emitNotification available globally for routes that need it
app.set('emitNotification', emitNotification);


// ===========================================
// GLOBAL MIDDLEWARE
// ===========================================

app.use(cors());
app.use(bodyParser.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`\n[REQ] ${new Date().toLocaleTimeString()} | ${req.method} ${req.url}`);
    next();
});

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ===========================================
// DATABASE INITIALIZATION
// ===========================================

initDatabase();

async function initDatabase() {
    console.log("[DB] Initializing database...");

    try {
        // Users table
        await db.run(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            username VARCHAR(255),
            avatar TEXT,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_active TIMESTAMP,
            status VARCHAR(50) DEFAULT 'Active',
            is_steward TINYINT(1) DEFAULT 0,
            bio TEXT,
            theme VARCHAR(50) DEFAULT 'light',
            notif_settings TEXT,
            steward_status VARCHAR(50) DEFAULT 'none',
            subscription_tier VARCHAR(50) DEFAULT 'free'
        )`);

        // Ledger/Transactions table for stewardship fees
        await db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            steward_email VARCHAR(255),
            amount DOUBLE,
            commission DOUBLE,
            type VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            meta TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add columns if they don't exist (for existing databases)
        const migrationColumns = [
            { table: 'users', column: 'subscription_tier', type: "VARCHAR(50) DEFAULT 'free'" },
            { table: 'users', column: 'steward_status', type: "VARCHAR(50) DEFAULT 'none'" },
            { table: 'users', column: 'is_steward', type: "TINYINT(1) DEFAULT 0" },
            { table: 'users', column: 'bio', type: "TEXT" },
            { table: 'users', column: 'billing_cycle', type: "VARCHAR(50) DEFAULT NULL" }
        ];

        for (const col of migrationColumns) {
            try {
                await db.run(`ALTER TABLE ${col.table} ADD COLUMN ${col.column} ${col.type}`);
            } catch (e) {
                // Already exists
            }
        }

        // Steward Applications
        await db.run(`CREATE TABLE IF NOT EXISTS steward_applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            full_name VARCHAR(255),
            experience_years INT,
            certifications TEXT,
            reason TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS site_admins (email VARCHAR(255) UNIQUE PRIMARY KEY)`);
        if (process.env.ADMIN_EMAIL) {
            await db.run(`INSERT IGNORE INTO site_admins (email) VALUES (?)`, [process.env.ADMIN_EMAIL]);
        }

        await db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            sender_name VARCHAR(255),
            type VARCHAR(50),
            message TEXT,
            meta TEXT,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS system_settings (\`key\` VARCHAR(255) PRIMARY KEY, value TEXT)`);

        // Plants & Tasks
        await db.run(`CREATE TABLE IF NOT EXISTS plants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            owner_email VARCHAR(255),
            caretaker_email VARCHAR(255),
            status VARCHAR(50) DEFAULT 'healthy',
            height VARCHAR(50),
            age VARCHAR(50),
            location VARCHAR(255),
            soil_type VARCHAR(100),
            emoji VARCHAR(10) DEFAULT '🌳',
            coords VARCHAR(255),
            size VARCHAR(50),
            last_watered VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            plant_id INT,
            steward_email VARCHAR(255),
            title VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            type VARCHAR(50),
            due_date DATETIME,
            timing_block VARCHAR(50),
            photo_url TEXT,
            completed_at DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await db.run(`CREATE TABLE IF NOT EXISTS plant_timeline(
            id INT AUTO_INCREMENT PRIMARY KEY,
            plant_id INT,
            event_type VARCHAR(50),
            description TEXT,
            emoji VARCHAR(10),
            media_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add media_url if not exists
        try {
            await db.run(`ALTER TABLE plant_timeline ADD COLUMN media_url TEXT`);
            console.log("[DB] Added media_url column to plant_timeline");
        } catch (e) {
            // Probably already exists
        }


        // Inventory & Routines
        await db.run(`CREATE TABLE IF NOT EXISTS inventory(
            id INT AUTO_INCREMENT PRIMARY KEY,
            steward_email VARCHAR(255),
            owner_email VARCHAR(255),
            item_name VARCHAR(255),
            quantity DOUBLE DEFAULT 0,
            unit VARCHAR(50),
            threshold DOUBLE DEFAULT 0,
            category VARCHAR(100),
            expiry_date DATETIME,
            storage_location VARCHAR(255),
            cost_per_unit DOUBLE DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS steward_routines(
            id INT AUTO_INCREMENT PRIMARY KEY,
            steward_email VARCHAR(255),
            plant_id INT,
            title VARCHAR(255),
            type VARCHAR(50),
            frequency_days INT,
            timing_block VARCHAR(50),
            last_generated VARCHAR(50),
            active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS connections(
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            steward_email VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, steward_email)
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS messages(
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_email VARCHAR(255),
            receiver_email VARCHAR(255),
            message_text TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Initialize system settings
        const row = await db.get(`SELECT * FROM system_settings WHERE \`key\` = 'global_state'`);
        if (!row) {
            const initState = {
                broadcast: { message: "", active: false, timestamp: null },
                alert: { message: "", active: false, timestamp: null }
            };
            await db.run(`INSERT INTO system_settings (\`key\`, value) VALUES ('global_state', ?)`, [JSON.stringify(initState)]);
        }

        await injectAdminUser();
        console.log("[DB] Database initialization complete.");
    } catch (err) {
        console.error("[DB] Initialization Error:", err);
    }
}

async function injectAdminUser() {
    const hashed = await bcrypt.hash('BRYNN10', 10);
    await db.run(`INSERT INTO users(email, password, role, username) VALUES(?, ?, 'admin', 'Admin Panel') ON DUPLICATE KEY UPDATE role = 'admin'`,
        [process.env.ADMIN_EMAIL || 'brynnsualog@gmail.com', hashed]);
}

// ===========================================
// MOUNT ROUTES
// ===========================================

app.use('/api', authRoutes);
app.use('/api', plantRoutes);
app.use('/api', stewardRoutes);
app.use('/api', messageRoutes);
app.use('/api', notificationRoutes);
app.use('/api', adminRoutes);

// ===========================================
// ROUTES REQUIRING UPLOAD (kept inline for simplicity)
// ===========================================


// Task Complete (needs emitNotification)
app.post('/api/steward/tasks/:id/complete', verifyToken, requireSteward, async (req, res) => {
    try {
        const { id } = req.params;
        const { photo_url } = req.body;

        const task = await db.get(`SELECT t.*, p.name as plant_name, p.owner_email, u.username as steward_name 
                FROM tasks t 
                LEFT JOIN plants p ON t.plant_id = p.id 
                LEFT JOIN users u ON t.steward_email = u.email
                WHERE t.id = ?`, [id]);

        if (!task) return res.status(404).json({ error: 'Task not found' });

        await db.run(`UPDATE tasks SET status = 'completed', photo_url = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [photo_url, id]);

        // Only add to timeline if associated with a plant
        if (task.plant_id) {
            await db.run(`INSERT INTO plant_timeline(plant_id, event_type, description, emoji) VALUES(?, ?, ?, ?)`,
                [task.plant_id, task.type || 'task', `Completed task: ${task.title}`, '✅']);
        }

        // Only notify owner if a plant (and owner) is associated
        if (task.owner_email && task.owner_email !== task.steward_email) {
            const notifMsg = `${task.steward_name} completed "${task.title}" for your ${task.plant_name}`;
            const result = await db.run(`INSERT INTO notifications(user_email, sender_name, type, message) VALUES(?, ?, ?, ?)`,
                [task.owner_email, task.steward_name, 'task_complete', notifMsg]);

            emitNotification(task.owner_email, {
                id: result.lastID,
                sender_name: task.steward_name,
                type: 'task_complete',
                message: notifMsg
            });
        }
        res.status(200).json({ message: 'Task completed' });
    } catch (err) {
        console.error("[API] Task Complete Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Connection Request (needs emitNotification)
app.post('/api/connections/request', verifyToken, validate(connectionRequestSchema), async (req, res) => {
    try {
        const { user_email, steward_email, user_name } = req.body;
        console.log(`[API] Connection Request: FROM ${user_email} TO ${steward_email}`);

        if (!user_email || !steward_email) {
            return res.status(400).json({ error: 'Missing emails' });
        }

        await db.run(`INSERT IGNORE INTO connections(user_email, steward_email, status) VALUES(?, ?, 'pending')`,
            [user_email, steward_email]);

        const sqlNotif = `INSERT INTO notifications(user_email, sender_name, type, message, meta) VALUES(?, ?, 'connection_request', ?, ?)`;
        const result = await db.run(sqlNotif, [steward_email, user_name, 'sent you a connection request!', user_email]);

        emitNotification(steward_email, {
            id: result.lastID,
            sender_name: user_name,
            type: 'connection_request',
            message: 'sent you a connection request!',
            meta: user_email
        });

        res.status(200).json({ message: 'Request sent' });
    } catch (err) {
        console.error("[API] Connect Request Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Connection Accept (needs emitNotification)
app.post('/api/connections/accept', verifyToken, validate(connectionAcceptSchema), async (req, res) => {
    try {
        const { user_email, steward_email, steward_name, notif_id } = req.body;
        console.log(`[API] Accepting connection from ${user_email}`);

        await db.run(`UPDATE connections SET status = 'accepted' WHERE user_email = ? AND steward_email = ?`,
            [user_email, steward_email]);

        if (notif_id) {
            await db.run(`DELETE FROM notifications WHERE id = ?`, [notif_id]);
        }

        const result = await db.run(`INSERT INTO notifications(user_email, sender_name, type, message) VALUES(?, ?, 'connection_accepted', 'accepted your connection request!')`,
            [user_email, steward_name]);

        emitNotification(user_email, {
            id: result.lastID,
            sender_name: steward_name,
            type: 'connection_accepted',
            message: 'accepted your connection request!'
        });
        res.status(200).json({ message: 'Connection accepted' });
    } catch (err) {
        console.error("[API] Connect Accept Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ===========================================
// CORE API ENDPOINTS
// ===========================================

app.use(express.static(path.join(__dirname, 'public')));

// 404 Handler
app.use((req, res) => {
    console.warn(`[404] NOT FOUND: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("[SERVER] Unhandled Error:", err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ===========================================
// START SERVER
// ===========================================

server.listen(PORT, () => {
    console.log(`\n🌱 Plant Monitoring Server (Modular) running at http://localhost:${PORT}`);
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

// Handle terminal close (Ctrl+C) and process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

async function gracefulShutdown() {
    console.log('\n[SERVER] Shutting down gracefully...');

    // Close server
    server.close(() => {
        console.log('[SERVER] HTTP server closed');
    });

    // Close database connection
    try {
        await db.close();
        console.log('[DB] Database connection closed');
    } catch (err) {
        console.error('[DB] Error closing database:', err);
    }

    console.log('[SERVER] Server terminated');
    process.exit(0);
}
