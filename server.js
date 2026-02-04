/**
 * Plant Monitoring Server (Modular Edition)
 * Entry point that loads routes from src/ directory
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Database
const { db } = require('./src/config/db');

// Middleware
const { validateFile } = require('./src/middleware/fileValidation');
const { verifyToken, requireSteward } = require('./src/middleware/auth');
const { validate } = require('./src/middleware/validate');
const {
    createPostSchema,
    connectionRequestSchema,
    connectionAcceptSchema
} = require('./src/validation/schemas');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const plantRoutes = require('./src/routes/plantRoutes');
const stewardRoutes = require('./src/routes/stewardRoutes');
const communityRoutes = require('./src/routes/communityRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Plant Doctor Engine
const doctorEngine = require('./src/helpers/doctorEngine');
const pythonBridge = require('./src/helpers/pythonBridge');

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

const PORT = process.env.PORT || 3000;

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
// FILE UPLOAD CONFIG
// ===========================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: parseInt(process.env.UPLOAD_LIMIT) || 10 * 1024 * 1024 }
});

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
            subscription_tier VARCHAR(50) DEFAULT 'free',
            ai_img_count INT DEFAULT 0,
            ai_deep_scan_count INT DEFAULT 0
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
            { table: 'users', column: 'ai_img_count', type: "INT DEFAULT 0" },
            { table: 'users', column: 'ai_deep_scan_count', type: "INT DEFAULT 0" },
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

        // Community tables
        await db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            author VARCHAR(255),
            author_email VARCHAR(255),
            avatar TEXT,
            content TEXT,
            type VARCHAR(50),
            media_url TEXT,
            media_type VARCHAR(50),
            is_pinned TINYINT(1) DEFAULT 0,
            likes INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS post_likes (
            user_email VARCHAR(255),
            post_id INT,
            PRIMARY KEY (user_email, post_id)
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            post_id INT,
            author VARCHAR(255),
            author_email VARCHAR(255),
            avatar TEXT,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.run(`CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            sender_name VARCHAR(255),
            type VARCHAR(50),
            post_id INT,
            message TEXT,
            meta TEXT,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Diagnoses
        await db.run(`CREATE TABLE IF NOT EXISTS diagnoses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_email VARCHAR(255),
            plant_id INT,
            title VARCHAR(255),
            severity VARCHAR(50),
            status VARCHAR(50),
            date VARCHAR(50),
            query_text TEXT,
            image_url TEXT,
            ai_response TEXT,
            deep_scan_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Migration: Add deep_scan_count if not exists
        try {
            await db.run(`ALTER TABLE diagnoses ADD COLUMN deep_scan_count INT DEFAULT 0`);
        } catch (e) { }

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
        await db.run(`CREATE TABLE IF NOT EXISTS ai_quotas (
            tier_key VARCHAR(50) PRIMARY KEY,
            img_limit INT,
            deep_scan_limit INT
        )`);

        // Seed AI Quotas if empty
        const quotasCount = await db.get(`SELECT COUNT(*) as count FROM ai_quotas`);
        if (quotasCount.count === 0) {
            await db.run(`INSERT INTO ai_quotas(tier_key, img_limit, deep_scan_limit) VALUES(?, ?, ?)`, ['free', 3, 1]);
            await db.run(`INSERT INTO ai_quotas(tier_key, img_limit, deep_scan_limit) VALUES(?, ?, ?)`, ['steward', 10, 5]);
            await db.run(`INSERT INTO ai_quotas(tier_key, img_limit, deep_scan_limit) VALUES(?, ?, ?)`, ['premium', -1, -1]); // -1 for unlimited/special logic
            console.log("[DB] Seeded ai_quotas table");
        }

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

        await db.run(`CREATE TABLE IF NOT EXISTS plant_images(
            id INT AUTO_INCREMENT PRIMARY KEY,
            plant_id INT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

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
app.use('/api', communityRoutes);
app.use('/api', messageRoutes);
app.use('/api', notificationRoutes);
app.use('/api', adminRoutes);

// ===========================================
// ROUTES REQUIRING UPLOAD (kept inline for simplicity)
// ===========================================

// Plant Image Upload
app.post('/api/plants/upload-image', verifyToken, upload.single('image'), validateFile(['image/jpeg', 'image/png', 'image/webp', 'image/gif']), async (req, res) => {
    try {
        const { plant_id } = req.body;
        console.log(`[API] Upload Image Request - Plant ID: ${plant_id}, File: ${req.file ? req.file.originalname : 'MISSING'}`);

        if (!req.file || !plant_id) {
            console.warn(`[API] Upload Image Failed - Missing file or plant_id. Body keys: ${Object.keys(req.body)}`);
            return res.status(400).json({ error: 'Missing file or plant_id' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;

        await db.run(`INSERT INTO plant_images (plant_id, image_url) VALUES (?, ?)`, [plant_id, imageUrl]);
        await db.run(`INSERT INTO plant_timeline (plant_id, event_type, description, emoji, media_url) VALUES (?, 'image', 'New image uploaded', '📷', ?)`, [plant_id, imageUrl]);

        res.status(200).json({ message: 'Image uploaded', image_url: imageUrl });
    } catch (err) {
        console.error("[API] Upload Image Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Community Post with Media
app.post('/api/community/posts', verifyToken, upload.single('media'), validateFile(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']), validate(createPostSchema), async (req, res) => {
    try {
        const { author, author_email, avatar, content, type } = req.body;
        const media_url = req.file ? `/uploads/${req.file.filename}` : null;
        const media_type = req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : null;

        if (!content && !media_url) return res.status(400).json({ error: 'Content or media required' });
        if (!author_email) return res.status(400).json({ error: 'Author email required' });

        const result = await db.run(`INSERT INTO posts(author, author_email, avatar, content, type, media_url, media_type) VALUES(?, ?, ?, ?, ?, ?, ?)`,
            [author || 'Anonymous', author_email, avatar || '👤', content, type || 'Tips', media_url, media_type]);

        res.status(201).json({ id: result.lastID, message: 'Post created' });
    } catch (err) {
        console.error("[API] Post Media Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Plant Doctor Diagnose
app.post('/api/doctor/diagnose', verifyToken, upload.single('image'), validateFile(['image/jpeg', 'image/png', 'image/webp', 'image/gif']), async (req, res) => {
    try {
        const { query, scanResult } = req.body;
        const email = req.body.email || (req.user ? req.user.email : null);
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        if (!email) return res.status(400).json({ error: 'Email required' });
        if (!query && !imageUrl) return res.status(400).json({ error: 'Query or image required' });

        // Quota Check for Image Analysis
        const user = await db.get(`SELECT subscription_tier, is_steward, ai_img_count FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const tierKey = user.subscription_tier === 'premium' ? 'premium' : (user.is_steward ? 'steward' : 'free');
        const quota = await db.get(`SELECT img_limit FROM ai_quotas WHERE tier_key = ?`, [tierKey]);

        if (imageUrl && quota && quota.img_limit !== -1 && user.ai_img_count >= quota.img_limit) {
            return res.status(403).json({ error: `Limit reached: ${quota.img_limit} image analyzes. Upgrade to Premium for unlimited!` });
        }

        const aiResponse = scanResult || doctorEngine.generateDiagnosis(query, imageUrl);

        const result = await db.run(`INSERT INTO diagnoses (user_email, query_text, image_url, ai_response) VALUES (?, ?, ?, ?)`,
            [email, query || (imageUrl ? "Image Analysis" : "Unknown Query"), imageUrl, aiResponse]);

        // Increment count if image analysis
        if (imageUrl) {
            await db.run(`UPDATE users SET ai_img_count = ai_img_count + 1 WHERE email = ?`, [email]);
        }

        res.status(200).json({
            id: result.lastID,
            query_text: query || (imageUrl ? "Image Analysis" : "Unknown Query"),
            ai_response: aiResponse,
            image_url: imageUrl,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.error("[API] Diagnose Error:", err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Plant Doctor Deep Scan (Python Hybrid)
app.post('/api/doctor/deep-scan', verifyToken, async (req, res) => {
    try {
        const { imagePath, email, diagnosisId } = req.body;

        if (!imagePath || !email) {
            return res.status(400).json({ error: 'ImagePath and email required' });
        }

        // Quota Check
        const user = await db.get(`SELECT subscription_tier, is_steward, ai_deep_scan_count FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const tierKey = user.subscription_tier === 'premium' ? 'premium' : (user.is_steward ? 'steward' : 'free');
        const quota = await db.get(`SELECT deep_scan_limit FROM ai_quotas WHERE tier_key = ?`, [tierKey]);

        if (quota && quota.deep_scan_limit !== -1 && user.ai_deep_scan_count >= quota.deep_scan_limit) {
            return res.status(403).json({ error: `Limit reached: ${quota.deep_scan_limit} deep scans. Upgrade to Premium for more!` });
        }

        if (diagnosisId && user.subscription_tier === 'premium') {
            const diag = await db.get(`SELECT deep_scan_count FROM diagnoses WHERE id = ?`, [diagnosisId]);
            if (diag && diag.deep_scan_count >= 5) {
                return res.status(403).json({ error: 'Premium limit reached: 5 deep scans per diagnosis.' });
            }
        }

        console.log(`[API] Deep Scan Requested for: ${imagePath} by ${email}`);

        // Resolve the relative path to absolute
        let cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
        const absolutePath = path.join(__dirname, 'public', cleanPath);

        const deepResult = await pythonBridge.runDeepScan(absolutePath);

        // Save the result to history
        await db.run(`INSERT INTO diagnoses (user_email, query_text, image_url, ai_response) VALUES (?, ?, ?, ?)`,
            [email, "AI Deep Scan", imagePath, JSON.stringify(deepResult)]);

        // Increment usage
        await db.run(`UPDATE users SET ai_deep_scan_count = ai_deep_scan_count + 1 WHERE email = ?`, [email]);
        if (diagnosisId) {
            await db.run(`UPDATE diagnoses SET deep_scan_count = deep_scan_count + 1 WHERE id = ?`, [diagnosisId]);
        }

        res.status(200).json(deepResult);
    } catch (err) {
        console.error("[API] Deep Scan Error:", err);
        res.status(500).json({ error: 'Deep Scan failed', details: err.message });
    }
});

app.get('/api/doctor/diagnoses', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || (req.user ? req.user.email : null);
        if (!email) return res.status(400).json({ error: 'Email required' });

        const rows = await db.all(`SELECT * FROM diagnoses WHERE user_email = ? ORDER BY created_at DESC LIMIT 10`, [email]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Diagnoses Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get AI Quotas
app.get('/api/doctor/quotas', verifyToken, async (req, res) => {
    try {
        const quotas = await db.all(`SELECT * FROM ai_quotas`);
        const quotasMap = {};
        quotas.forEach(q => { quotasMap[q.tier_key] = q; });
        res.status(200).json(quotasMap);
    } catch (err) {
        console.error("[API] Get Quotas Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

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
// STATIC ASSETS & FALLBACKS
// ===========================================

app.use(express.static(path.join(__dirname, 'public')));


app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

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
// QUOTA RESET (Daily 12 AM)
// ===========================================

async function resetQuotas() {
    try {
        console.log("[SERVER] Resetting weekly AI quotas...");
        await db.run(`UPDATE users SET ai_img_count = 0, ai_deep_scan_count = 0`);
        console.log("[SERVER] Weekly reset complete.");
    } catch (err) {
        console.error("[SERVER] Reset failed:", err);
    }
}

function scheduleQuotaReset() {
    const now = new Date();
    const nextReset = new Date();

    // Set to next Monday 12:00:00 AM
    const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
    nextReset.setDate(now.getDate() + daysUntilMonday);
    nextReset.setHours(0, 0, 0, 0);

    const msUntilReset = nextReset - now;

    setTimeout(() => {
        resetQuotas();
        setInterval(resetQuotas, 7 * 24 * 60 * 60 * 1000); // Repeat every 7 days (weekly)
    }, msUntilReset);

    console.log(`[SERVER] Weekly quota reset scheduled for Monday 12 AM (in ${Math.round(msUntilReset / 1000 / 60 / 60)} hours)`);
}

// ===========================================
// START SERVER
// ===========================================

scheduleQuotaReset();
server.listen(PORT, () => {
    console.log(`\n🌱 Plant Monitoring Server (Modular) running at http://localhost:${PORT}`);
});
