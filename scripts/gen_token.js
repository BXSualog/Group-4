const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'bx-plant-monitor-secret-key-change-in-production';
const user = {
    email: 'brynnsualog@gmail.com',
    role: 'admin',
    username: 'Admin Panel'
};

const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
console.log(token);
