import dotenv from 'dotenv';
import { getPool } from '../src/db/mysqlClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function addColumnIfNotExists(pool, table, column, definition) {
    try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
        if (columns.length === 0) {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
            console.log(`✅ Added column ${table}.${column}`);
            return true;
        } else {
            console.log(`⏭️  Column ${table}.${column} already exists`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error adding column ${table}.${column}:`, error.message);
        throw error;
    }
}

async function addIndexIfNotExists(pool, table, indexName, definition) {
    try {
        const [indexes] = await pool.query(`SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`);
        if (indexes.length === 0) {
            await pool.query(`ALTER TABLE ${table} ADD ${definition}`);
            console.log(`✅ Added index ${table}.${indexName}`);
            return true;
        } else {
            console.log(`⏭️  Index ${table}.${indexName} already exists`);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error adding index ${table}.${indexName}:`, error.message);
        throw error;
    }
}

async function runMigration() {
    const pool = getPool();

    try {
        console.log('🔄 Running production upgrade migration...\n');

        // ============================================
        // 1. Update users table
        // ============================================
        console.log('📝 Updating users table...');

        await addColumnIfNotExists(pool, 'users', 'name', 'VARCHAR(255) AFTER id');
        await addColumnIfNotExists(pool, 'users', 'status', "VARCHAR(50) DEFAULT 'ACTIVE' AFTER role");
        await addColumnIfNotExists(pool, 'users', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP AFTER status');
        await addColumnIfNotExists(pool, 'users', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');

        await addIndexIfNotExists(pool, 'users', 'idx_email', 'UNIQUE INDEX idx_email (email)');
        await addIndexIfNotExists(pool, 'users', 'idx_status', 'INDEX idx_status (status)');

        // Update existing users
        await pool.query(`
            UPDATE users 
            SET name = CONCAT('User ', SUBSTRING(id, 1, 8))
            WHERE name IS NULL OR name = ''
        `);
        console.log('✅ Updated existing users with default names');

        // ============================================
        // 2. Create new tables from SQL file
        // ============================================
        console.log('\n📝 Creating new tables...');

        const migrationPath = path.join(__dirname, '001_production_upgrade.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                await pool.query(statement);
                const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
                if (tableName) {
                    console.log(`✅ Created table: ${tableName}`);
                }
            } catch (error) {
                if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log('⏭️  Table already exists');
                } else {
                    throw error;
                }
            }
        }

        // ============================================
        // 3. Verify schema
        // ============================================
        console.log('\n📊 Verifying schema...\n');

        const [usersCols] = await pool.query('DESCRIBE users');
        console.log('✅ Users table columns:', usersCols.map(c => c.Field).join(', '));

        try {
            const [refreshCols] = await pool.query('DESCRIBE refresh_tokens');
            console.log('✅ Refresh tokens table columns:', refreshCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('❌ Refresh tokens table not found');
        }

        try {
            const [resetCols] = await pool.query('DESCRIBE password_reset_tokens');
            console.log('✅ Password reset tokens table columns:', resetCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('❌ Password reset tokens table not found');
        }

        console.log('\n✅ Migration completed successfully!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

runMigration();
