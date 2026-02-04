const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createCommentSchema, likePostSchema } = require('../validation/schemas');

// Get Posts (Public, but email context is optional)
router.get('/community/posts', optionalAuth, async (req, res) => {
    try {
        const email = req.query.email || req.user?.email || '';
        const { search, type, sort } = req.query;

        let sql = `
            SELECT p.*, u.is_steward,
            (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_email = ?) as isLiked,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount
            FROM posts p
            LEFT JOIN users u ON p.author_email = u.email
        `;
        const params = [email];

        const whereClauses = [];
        if (search) {
            whereClauses.push(`(p.content LIKE ? OR p.author LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        if (type && type !== 'All') {
            whereClauses.push(`p.type = ?`);
            params.push(type);
        }

        if (whereClauses.length > 0) {
            sql += ` WHERE ` + whereClauses.join(' AND ');
        }

        if (sort === 'Popular') {
            sql += ` ORDER BY p.is_pinned DESC, p.likes DESC, p.created_at DESC`;
        } else {
            sql += ` ORDER BY p.is_pinned DESC, p.created_at DESC`;
        }

        const rows = await db.all(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Posts Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Trends (Public)
router.get('/community/trends', async (req, res) => {
    try {
        const rows = await db.all(`SELECT type, COUNT(*) as count FROM posts GROUP BY type ORDER BY count DESC LIMIT 5`, []);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Trends Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Top Contributors (Public)
router.get('/community/top-contributors', async (req, res) => {
    try {
        const sql = `
            SELECT author, COUNT(*) as postCount, SUM(likes) as totalLikes
            FROM posts
            GROUP BY author_email, author
            ORDER BY totalLikes DESC, postCount DESC
            LIMIT 5
        `;
        const rows = await db.all(sql, []);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Top Contributors Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Like Post (Protected)
router.post('/community/posts/:id/like', verifyToken, validate(likePostSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.body.email || req.user.email;

        const row = await db.get(`SELECT * FROM post_likes WHERE user_email = ? AND post_id = ?`, [email, id]);

        if (row) {
            await db.run(`DELETE FROM post_likes WHERE user_email = ? AND post_id = ?`, [email, id]);
            await db.run(`UPDATE posts SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?`, [id, id]);
            res.status(200).json({ message: 'Unliked', isLiked: false });
        } else {
            await db.run(`INSERT INTO post_likes(user_email, post_id) VALUES(?, ?)`, [email, id]);
            await db.run(`UPDATE posts SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?`, [id, id]);
            res.status(200).json({ message: 'Liked', isLiked: true });
        }
    } catch (err) {
        console.error("[API] Like Post Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Comments (Public)
router.get('/community/posts/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await db.all(`SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC`, [id]);
        res.status(200).json(rows);
    } catch (err) {
        console.error("[API] Get Comments Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Post Comment (Protected)
router.post('/community/posts/:id/comments', verifyToken, validate(createCommentSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { author, author_email, avatar, content } = req.body;
        const userEmail = author_email || req.user.email;

        await db.run(`INSERT INTO comments(post_id, author, author_email, avatar, content) VALUES(?, ?, ?, ?, ?)`,
            [id, author, userEmail, avatar, content]);

        const post = await db.get(`SELECT author_email FROM posts WHERE id = ?`, [id]);
        if (post && post.author_email !== userEmail) {
            await db.run(`INSERT INTO notifications(user_email, sender_name, type, post_id, message) VALUES(?, ?, 'comment', ?, ?)`,
                [post.author_email, author, id, `commented on your post: "${content.substring(0, 20)}..."`]);
        }

        res.status(201).json({ message: 'Comment added' });
    } catch (err) {
        console.error("[API] Post Comment Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete Post (Protected - author or admin)
router.delete('/community/posts/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.query.email || req.user.email;

        const row = await db.get(`SELECT author_email FROM posts WHERE id = ?`, [id]);
        if (!row) return res.status(404).json({ error: 'Post not found' });

        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const isAdmin = email.toLowerCase() === adminEmail || req.user.role === 'admin';

        if (row.author_email !== email && !isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await db.run(`DELETE FROM posts WHERE id = ?`, [id]);
        res.status(200).json({ message: 'Deleted' });
    } catch (err) {
        console.error("[API] Delete Post Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Pin Post (Admin only)
router.post('/community/posts/:id/pin', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const row = await db.get(`SELECT is_pinned FROM posts WHERE id = ?`, [id]);
        if (!row) return res.status(404).json({ error: 'Post not found' });

        const newState = row.is_pinned ? 0 : 1;
        await db.run(`UPDATE posts SET is_pinned = ? WHERE id = ?`, [newState, id]);
        res.status(200).json({ message: newState ? 'Pinned' : 'Unpinned', is_pinned: !!newState });
    } catch (err) {
        console.error("[API] Pin Post Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
