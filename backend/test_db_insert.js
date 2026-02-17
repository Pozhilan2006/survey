
import { getPool } from './src/db/mysqlClient.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

async function testInsert() {
    console.log('Testing direct DB insert...');
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        const surveyId = uuidv4();
        const sql = `
            INSERT INTO surveys 
            (id, title, type, status, config, created_by, 
             max_selections, priority_mode, survey_type, approval_policy, visibility_mode, eligibility_rules)
            VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            surveyId,
            'Test Survey Direct',
            'RESEARCH',
            '{}',
            'admin-user-id', // Dummy user ID
            1,
            0, // false
            'SINGLE_CHOICE',
            'AUTO_APPROVE',
            'PUBLIC',
            null
        ];

        console.log('Executing query...');
        await connection.query(sql, params);
        console.log(`Success! Survey ID: ${surveyId}`);

        // Clean up
        await connection.query('DELETE FROM surveys WHERE id = ?', [surveyId]);
        console.log('Cleaned up.');

    } catch (err) {
        console.error('Insert failed:', err);
    } finally {
        connection.release();
        process.exit(0);
    }
}

testInsert();
