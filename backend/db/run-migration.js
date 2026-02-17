import 'dotenv/config';
import { getPool, closePool } from '../src/db/mysqlClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const pool = getPool();

    try {
        console.log('Running migration 005_add_password_hash.sql...');

        const migrationSQL = fs.readFileSync(
            path.join(__dirname, 'migrations', '005_add_password_hash.sql'),
            'utf8'
        );

        // Split by semicolon and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            await pool.query(statement);
        }

        console.log('✓ Migration completed successfully');
        console.log('✓ Default users created:');
        console.log('  - admin@survey.com (password: admin123)');
        console.log('  - student@survey.com (password: student123)');
        console.log('  - approver@survey.com (password: approver123)');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await closePool();
    }
}

runMigration();
