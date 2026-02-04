const { db } = require('../src/config/db');

const user1 = 'brynnxyross10@gmail.com'; // Steward Sualog
const user2 = 'brynnxyross@gmail.com';   // Brynn Sualog

async function deleteMessages() {
    try {
        console.log(`Checking messages between ${user1} and ${user2}...`);

        // Check count before
        const countQuery = `
            SELECT COUNT(*) as count FROM messages 
            WHERE (sender_email = ? AND receiver_email = ?) 
               OR (sender_email = ? AND receiver_email = ?)
        `;

        const before = await db.get(countQuery, [user1, user2, user2, user1]);
        console.log(`Messages found before deletion: ${before.count}`);

        if (before.count > 0) {
            console.log("Deleting messages...");
            const deleteQuery = `
                DELETE FROM messages 
                WHERE (sender_email = ? AND receiver_email = ?) 
                   OR (sender_email = ? AND receiver_email = ?)
            `;
            const result = await db.run(deleteQuery, [user1, user2, user2, user1]);
            console.log(`Deleted ${result.changes} messages.`);

            // Verify
            const after = await db.get(countQuery, [user1, user2, user2, user1]);
            console.log(`Messages remaining: ${after.count}`);
        } else {
            console.log("No messages to delete.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

deleteMessages();
