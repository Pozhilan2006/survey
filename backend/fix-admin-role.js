import dotenv from 'dotenv';
import { getPool } from './src/db/mysqlClient.js';

// Load environment variables
dotenv.config();

async function checkAndFixAdminRole() {
    const pool = getPool();

    try {
        // Check current admin user role
        const [users] = await pool.query(
            'SELECT id, email, role FROM users WHERE email = ?',
            ['admin@survey.com']
        );

        if (users.length === 0) {
            console.log('❌ Admin user not found');
            return;
        }

        const admin = users[0];
        console.log('Current admin user:', admin);

        if (admin.role !== 'ADMIN') {
            console.log(`\n⚠️  Admin role is '${admin.role}', updating to 'ADMIN'...`);

            await pool.query(
                'UPDATE users SET role = ? WHERE email = ?',
                ['ADMIN', 'admin@survey.com']
            );

            console.log('✅ Admin role updated to ADMIN');

            // Verify
            const [updated] = await pool.query(
                'SELECT id, email, role FROM users WHERE email = ?',
                ['admin@survey.com']
            );
            console.log('Updated admin user:', updated[0]);
        } else {
            console.log('✅ Admin role is already set to ADMIN');
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndFixAdminRole();
