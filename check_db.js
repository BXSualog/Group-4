const { db } = require('./src/config/db');

async function checkSchema() {
    try {
        console.log("Checking 'users' table columns...");
        const usersCols = await db.all("SHOW COLUMNS FROM users");
        console.log("Users Columns:", usersCols.map(c => c.Field).join(', '));

        console.log("\nChecking 'steward_applications' table columns...");
        const appCols = await db.all("SHOW COLUMNS FROM steward_applications");
        console.log("Steward Applications Columns:", appCols.map(c => c.Field).join(', '));

        process.exit(0);
    } catch (err) {
        console.error("Error checking schema:", err);
        process.exit(1);
    }
}

checkSchema();
