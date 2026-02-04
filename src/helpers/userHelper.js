const { db } = require('../config/db');

/**
 * Deletes all data associated with a user email across all tables.
 * @param {string} email - The email of the user to delete.
 */
async function deleteUserCompletely(email) {
    if (!email) throw new Error("Email is required for deletion");

    console.log(`[UserHelper] Full deletion initiated for: ${email}`);

    // 1. Get user plants to handle their sub-data
    const plants = await db.all(`SELECT id FROM plants WHERE owner_email = ?`, [email]);
    const plantIds = plants.map(p => p.id);

    // 2. Cascade delete plant-related data
    if (plantIds.length > 0) {
        const placeholders = plantIds.map(() => '?').join(',');
        await db.run(`DELETE FROM plant_images WHERE plant_id IN (${placeholders})`, plantIds);
        await db.run(`DELETE FROM plant_timeline WHERE plant_id IN (${placeholders})`, plantIds);
        await db.run(`DELETE FROM tasks WHERE plant_id IN (${placeholders})`, plantIds);
        await db.run(`DELETE FROM steward_routines WHERE plant_id IN (${placeholders})`, plantIds);
    }

    // 3. Delete plants owned by this user
    await db.run(`DELETE FROM plants WHERE owner_email = ?`, [email]);

    // 4. Handle Stewardship: If user is a caretaker, nullify their assignment instead of deleting the plant
    await db.run(`UPDATE plants SET caretaker_email = NULL WHERE caretaker_email = ?`, [email]);

    // 5. Delete tasks where user was the steward
    await db.run(`DELETE FROM tasks WHERE steward_email = ?`, [email]);

    // 6. Delete communications
    await db.run(`DELETE FROM messages WHERE sender_email = ? OR receiver_email = ?`, [email, email]);
    await db.run(`DELETE FROM notifications WHERE user_email = ?`, [email]);
    await db.run(`DELETE FROM connections WHERE user_email = ? OR steward_email = ?`, [email, email]);

    // 7. Delete Community activity
    await db.run(`DELETE FROM post_likes WHERE user_email = ?`, [email]);
    await db.run(`DELETE FROM comments WHERE author_email = ?`, [email]);

    // Note: We don't delete posts unless you want to, usually posts are kept but orphaned. 
    // However, the request was "erase every data", so let's delete posts too.
    await db.run(`DELETE FROM posts WHERE author_email = ?`, [email]);

    // 8. Delete other records
    await db.run(`DELETE FROM diagnoses WHERE user_email = ?`, [email]);
    await db.run(`DELETE FROM steward_applications WHERE user_email = ?`, [email]);
    await db.run(`DELETE FROM inventory WHERE steward_email = ? OR owner_email = ?`, [email, email]);
    await db.run(`DELETE FROM steward_routines WHERE steward_email = ?`, [email]);

    // 9. Finally, delete the user record
    const result = await db.run(`DELETE FROM users WHERE email = ?`, [email]);

    console.log(`[UserHelper] Full deletion completed for: ${email}. Affected users: ${result.changes}`);
    return result;
}

module.exports = { deleteUserCompletely };
