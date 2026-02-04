require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('✅ Connected to MySQL Database for Debugging\n');

    console.log("--- Checking steward_applications ---");
    connection.query("SELECT * FROM steward_applications", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));

        console.log("\n--- Checking diagnoses table structure ---");
        connection.query("DESCRIBE diagnoses", (err, rows) => {
            if (err) console.error(err);
            else console.log(JSON.stringify(rows, null, 2));

            console.log("\n--- Checking recent diagnoses ---");
            connection.query("SELECT * FROM diagnoses LIMIT 5", (err, rows) => {
                if (err) console.error(err);
                else console.log(JSON.stringify(rows, null, 2));

                connection.end();
            });
        });
    });
});
