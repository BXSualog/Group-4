const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bx-plant-monitor-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with email, role, is_steward
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        {
            email: user.email,
            role: user.role || 'user',
            is_steward: user.is_steward || 0,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Middleware to verify JWT token
 * Attaches decoded user to req.user
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Fallback to query parameter (needed for direct file downloads/exports)
    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;

        // Asynchronously update last_active timestamp in database
        const { db } = require('../config/db');
        db.run(`UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE email = ?`, [decoded.email])
            .catch(err => console.error('[AUTH] Activity update error:', err));

        next();
    } catch (error) {
        console.error('[AUTH] Token verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

/**
 * Middleware to require steward role
 * Must be used AFTER verifyToken
 */
function requireSteward(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!req.user.is_steward && req.user.role !== 'steward' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Steward access required.' });
    }

    next();
}

/**
 * Middleware to require admin role
 * Must be used AFTER verifyToken
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = req.user.role === 'admin' || req.user.email?.toLowerCase() === adminEmail;

    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required.' });
    }

    next();
}

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes with mixed access (e.g., viewing posts)
 */
function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid, but we continue anyway
            req.user = null;
        }
    }

    next();
}

module.exports = {
    generateToken,
    verifyToken,
    requireSteward,
    requireAdmin,
    optionalAuth,
    JWT_SECRET
};
