const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { db } = require('../config/db');
const { generateToken, verifyToken } = require('../middleware/auth');
const { deleteUserCompletely } = require('../helpers/userHelper');
const { validate } = require('../middleware/validate');
const {
    loginSchema,
    registerSchema,
    updateProfileSchema,
    changePasswordSchema
} = require('../validation/schemas');

// Register
router.post('/register', validate(registerSchema), async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);

        await db.run(`INSERT INTO users(email, password) VALUES(?, ?)`, [email, hashed]);

        // Generate token for auto-login after registration
        const token = generateToken({ email, role: 'user', is_steward: 0 });

        res.status(201).json({
            message: 'Registered',
            token,
            email
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already registered' });
        }
        console.error("[API] Register Error:", err);
        return res.status(400).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last_active timestamp
        await db.run(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE email = ?`, [email]);

        // Generate JWT token
        const token = generateToken({
            email: user.email,
            role: user.role || 'user',
            is_steward: user.is_steward || 0,
            username: user.username
        });

        res.status(200).json({
            token,
            email: user.email,
            onboardingComplete: !!user.username,
            username: user.username,
            avatar: user.avatar,
            subscription_tier: user.subscription_tier || 'free',
            role: (user.email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() ? 'admin' : user.role)
        });
    } catch (err) {
        console.error("[API] Login Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get User Profile (Protected)
router.get('/user-profile', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;
        const row = await db.get(`SELECT username, avatar, role, is_steward, steward_status, bio, theme, notif_settings, subscription_tier, ai_img_count, ai_deep_scan_count FROM users WHERE email = ?`, [email]);
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.status(200).json(row);
    } catch (err) {
        console.error("[API] User Profile Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Profile (Protected)
router.post('/update-profile', verifyToken, validate(updateProfileSchema), async (req, res) => {
    try {
        const { email, username, avatar, bio, theme, notif_settings } = req.body;

        // Users can only update their own profile (unless admin)
        if (email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot update another user\'s profile' });
        }

        const sql = `UPDATE users SET 
            username = COALESCE(?, username), 
            avatar = COALESCE(?, avatar),
            bio = COALESCE(?, bio),
            theme = COALESCE(?, theme),
            notif_settings = COALESCE(?, notif_settings)
            WHERE email = ?`;

        const params = [
            username === undefined ? null : username,
            avatar === undefined ? null : avatar,
            bio === undefined ? null : bio,
            theme === undefined ? null : theme,
            notif_settings === undefined ? null : notif_settings,
            email
        ];

        const result = await db.run(sql, params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Update failed' });
        }
        res.status(200).json({ message: 'Profile updated' });
    } catch (err) {
        console.error("[API] Update Profile Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update Password (Protected)
router.post('/account/password', verifyToken, validate(changePasswordSchema), async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;

        // Users can only change their own password
        if (email !== req.user.email) {
            return res.status(403).json({ error: 'Cannot change another user\'s password' });
        }

        const user = await db.get(`SELECT password FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ error: 'Incorrect current password' });

        const hashed = await bcrypt.hash(newPassword, 10);
        await db.run(`UPDATE users SET password = ? WHERE email = ?`, [hashed, email]);
        res.status(200).json({ message: 'Password updated' });
    } catch (err) {
        console.error("[API] Password Update Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Export User Data (Protected)
router.get('/account/export', verifyToken, async (req, res) => {
    try {
        const email = req.query.email || req.user.email;

        // Users can only export their own data
        if (email !== req.user.email && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Cannot export another user\'s data' });
        }

        const user = await db.get(`SELECT email, username, avatar, bio, role, created_at, status, is_steward, theme, notif_settings FROM users WHERE email = ?`, [email]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const data = { profile: user };
        data.plants = await db.all(`SELECT * FROM plants WHERE owner_email = ? OR caretaker_email = ?`, [email, email]) || [];
        data.tasks = await db.all(`SELECT * FROM tasks WHERE steward_email = ?`, [email]) || [];

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=account_data_${email}.json`);
        res.status(200).json(data);
    } catch (err) {
        console.error("[API] Export Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Upgrade Account (Simulated - for testing)
router.post('/account/upgrade', verifyToken, async (req, res) => {
    try {
        const { tier, cycle } = req.body; // tier: 'free'/'premium', cycle: 'monthly'/'annually'
        const email = req.user.email;

        if (!['free', 'premium'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        if (tier === 'premium' && !['monthly', 'annually'].includes(cycle)) {
            return res.status(400).json({ error: 'Billing cycle is required for Premium' });
        }

        const billingCycle = tier === 'premium' ? cycle : null;
        await db.run(`UPDATE users SET subscription_tier = ?, billing_cycle = ? WHERE email = ?`, [tier, billingCycle, email]);

        // Record transaction if upgrading to premium
        if (tier === 'premium') {
            const amount = cycle === 'annually' ? 1999 : 199;
            await db.run(`INSERT INTO transactions (user_email, amount, type, status, meta) VALUES (?, ?, ?, 'completed', ?)`,
                [email, amount, 'subscription', JSON.stringify({ cycle: cycle, plan: 'Premium' })]);
        }

        res.status(200).json({ message: `Subscription updated to ${tier}`, tier, cycle: billingCycle });
    } catch (err) {
        console.error("[API] Upgrade Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Account (Protected)
router.delete('/account', verifyToken, async (req, res) => {
    try {
        const email = req.user.email;
        if (!email) return res.status(400).json({ error: 'Email required' });

        await deleteUserCompletely(email);
        res.status(200).json({ message: 'Account and all data permanently deleted' });
    } catch (err) {
        console.error("[API] Delete Account Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
