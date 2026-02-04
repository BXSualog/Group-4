const { db } = require('../config/db');

/**
 * Auto-generate routine tasks for a steward
 * @param {string} email - Steward email
 */
async function generateRoutineTasks(email, callback) {
    const today = new Date().toISOString().split('T')[0];

    try {
        const routines = await db.all(`SELECT * FROM steward_routines WHERE steward_email = ? AND active = 1`, [email]);
        if (!routines) return callback ? callback() : null;

        for (const r of routines) {
            // If last_generated is today, skip
            if (r.last_generated === today) continue;

            // Check if it's time to generate (mod frequency)
            const createdDate = new Date(r.created_at).getTime();
            const todayTime = new Date(today).getTime();
            const diffDaysArr = Math.floor((todayTime - createdDate) / (1000 * 60 * 60 * 24));

            if (diffDaysArr % r.frequency_days === 0) {
                // Generate task
                const taskSql = `INSERT INTO tasks (plant_id, steward_email, title, type, due_date, timing_block, status) 
                                 VALUES (?, ?, ?, ?, ?, ?, 'pending')`;
                const dueDateTime = today + " 08:00:00"; // MySQL format

                await db.run(taskSql, [r.plant_id, email, r.title, r.type, dueDateTime, r.timing_block]);
                await db.run(`UPDATE steward_routines SET last_generated = ? WHERE id = ?`, [today, r.id]);
            }
        }
        if (callback) callback();
    } catch (err) {
        console.error("[Routine] Generation Error:", err);
        if (callback) callback();
    }
}

module.exports = { generateRoutineTasks };
