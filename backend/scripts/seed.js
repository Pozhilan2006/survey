import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../src/db/mysqlClient.js';
import logger from '../src/utils/logger.js';

dotenv.config();

const SALT_ROUNDS = 12;

/**
 * Seed database with initial users
 * 1 Admin, 1 Approver, 10 Students
 */
async function seed() {
    const pool = getPool();

    try {
        console.log('🌱 Starting database seed...\n');

        // Check if users already exist
        const [existing] = await pool.query('SELECT COUNT(*) as count FROM users');
        if (existing[0].count > 0) {
            console.log(`⚠️  Database already has ${existing[0].count} users`);
            const readline = await import('readline');
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question('Do you want to continue and add more users? (y/n): ', resolve);
            });
            rl.close();

            if (answer.toLowerCase() !== 'y') {
                console.log('❌ Seed cancelled');
                await pool.end();
                process.exit(0);
            }
        }

        const users = [];

        // 1. Create Admin
        console.log('Creating admin user...');
        const adminId = uuidv4();
        users.push({
            id: adminId,
            name: 'Admin User',
            email: 'admin@survey.com',
            password: 'admin123',
            role: 'ADMIN',
            status: 'ACTIVE'
        });

        // 2. Create Approver
        console.log('Creating approver user...');
        const approverId = uuidv4();
        users.push({
            id: approverId,
            name: 'Approver User',
            email: 'approver@survey.com',
            password: 'approver123',
            role: 'APPROVER',
            status: 'ACTIVE'
        });

        // 3. Create 10 Students
        console.log('Creating 10 student users...');
        for (let i = 1; i <= 10; i++) {
            users.push({
                id: uuidv4(),
                name: `Student ${i}`,
                email: `student${i}@survey.com`,
                password: 'student123',
                role: 'STUDENT',
                status: 'ACTIVE'
            });
        }

        // Insert users
        for (const user of users) {
            try {
                const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);

                await pool.query(
                    `INSERT INTO users (id, name, email, password_hash, role, status) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [user.id, user.name, user.email, passwordHash, user.role, user.status]
                );

                console.log(`✅ Created: ${user.email} (${user.role})`);
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    console.log(`⏭️  Skipped: ${user.email} (already exists)`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✅ Seed completed successfully!');
        console.log('\n📝 Login credentials:');
        console.log('Admin:    admin@survey.com / admin123');
        console.log('Approver: approver@survey.com / approver123');
        console.log('Students: student1@survey.com to student10@survey.com / student123');

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        await pool.end();
        process.exit(1);
    }
}

seed();
