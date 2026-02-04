const { db } = require('../src/config/db');

async function listUsers() {
    try {
        console.log("Listing users...");
        const users = await db.all("SELECT id, email, username FROM users LIMIT 20");
        console.log(users);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        // Force exit since db.close() might wait for connection
        process.exit(0);
    }
}

listUsers();
