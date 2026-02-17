import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPool, closePool } from '../src/db/mysqlClient.js';

async function updatePasswords() {
    const pool = getPool();

    try {
        console.log('Updating user passwords with bcrypt hashes...\n');

        const users = [
            { id: 'admin-default-001', email: 'admin@survey.com', role: 'ADMIN', password: 'admin123' },
            { id: 'student-default-001', email: 'student@survey.com', role: 'STUDENT', password: 'student123' },
            { id: 'approver-default-001', email: 'approver@survey.com', role: 'APPROVER', password: 'approver123' }
        ];

        for (const user of users) {
            const hash = await bcrypt.hash(user.password, 10);

            await pool.query(
                `INSERT INTO users (id, email, role, password_hash) 
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
                [user.id, user.email, user.role, hash]
            );

            console.log(`✓ Updated ${user.role}: ${user.email} (password: ${user.password})`);
        }

        console.log('\n✓ All passwords updated successfully!');
    } catch (error) {
        console.error('Error updating passwords:', error);
        throw error;
    } finally {
        await closePool();
    }
}

updatePasswords();
