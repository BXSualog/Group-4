const mysql = require('mysql2/promise');
require('dotenv').config();

// --- DATABASE CONFIGURATION ---
const MYSQL_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bx_database'
};

let connection;

async function connect() {
    try {
        connection = await mysql.createConnection(MYSQL_CONFIG);
        console.log('Connected to the MySQL database (Async).');
        return connection;
    } catch (err) {
        console.error('Error connecting to MySQL:', err.message);
        process.exit(1);
    }
}

// Initial connection for startup
const connectionPromise = connect();

// Helper to recursively convert BigInt to Number
function normalizeRow(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(normalizeRow);

    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'bigint') {
            newObj[key] = Number(value);
        } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
            newObj[key] = normalizeRow(value);
        } else {
            newObj[key] = value;
        }
    }
    return newObj;
}

// Wrapper to provide a promise-based API
const db = {
    run: async (sql, params = []) => {
        const conn = await connectionPromise;
        const [results] = await conn.execute(sql, params);
        return { lastID: results?.insertId, changes: results?.affectedRows };
    },
    get: async (sql, params = []) => {
        const conn = await connectionPromise;
        const [rows] = await conn.execute(sql, params);
        return rows && rows.length > 0 ? normalizeRow(rows[0]) : null;
    },
    all: async (sql, params = []) => {
        const conn = await connectionPromise;
        const [rows] = await conn.execute(sql, params);
        return normalizeRow(rows);
    },
    serialize: (fn) => fn(), // No longer strictly needed but kept for compatibility
    close: async () => {
        if (connection) await connection.end();
    }
};

module.exports = { db, connectionPromise };
