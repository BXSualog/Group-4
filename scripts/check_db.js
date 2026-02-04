const { db } = require('./src/config/db');

async function check() {
    try {
        console.log("Checking plant_timeline table...");
        const columns = await db.all("SHOW COLUMNS FROM plant_timeline");
        console.log("Columns:", JSON.stringify(columns, null, 2));

        console.log("\nChecking last 5 timeline items...");
        const rows = await db.all("SELECT * FROM plant_timeline ORDER BY id DESC LIMIT 5");
        console.log("Rows:", JSON.stringify(rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

check();
