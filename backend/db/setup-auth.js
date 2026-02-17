import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getPool, closePool } from '../src/db/mysqlClient.js';

async function setupAuth() {
    const pool = getPool();

    try {
        console.log('Setting up authentication...\n');

        // Step 1: Add password_hash column if it doesn't exist
        console.log('1. Adding password_hash column...');
        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN password_hash VARCHAR(255) AFTER role
            `);
            console.log('✓ Column added\n');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('✓ Column already exists\n');
            } else {
                throw error;
            }
        }

        // Step 2: Create/update default users with hashed passwords
        console.log('2. Creating default users...');

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

            console.log(`✓ ${user.role}: ${user.email} (password: ${user.password})`);
        }

        console.log('\n✅ Authentication setup complete!');
        console.log('\nDefault credentials:');
        console.log('  Admin:    admin@survey.com / admin123');
        console.log('  Student:  student@survey.com / student123');
        console.log('  Approver: approver@survey.com / approver123');
    } catch (error) {
        console.error('❌ Setup failed:', error);
        throw error;
    } finally {
        await closePool();
    }
}

setupAuth();
