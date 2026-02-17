import dotenv from 'dotenv';
import { getPool } from './src/db/mysqlClient.js';

dotenv.config();

async function checkTables() {
    const pool = getPool();

    try {
        console.log('🔍 Checking database tables...\n');

        // Check refresh_tokens table
        try {
            const [refreshCols] = await pool.query('DESCRIBE refresh_tokens');
            console.log('✅ refresh_tokens table exists');
            console.log('   Columns:', refreshCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('❌ refresh_tokens table NOT FOUND');
            console.log('   Error:', e.message);
        }

        // Check password_reset_tokens table
        try {
            const [resetCols] = await pool.query('DESCRIBE password_reset_tokens');
            console.log('\n✅ password_reset_tokens table exists');
            console.log('   Columns:', resetCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('\n❌ password_reset_tokens table NOT FOUND');
            console.log('   Error:', e.message);
        }

        // Check users table columns
        try {
            const [usersCols] = await pool.query('DESCRIBE users');
            console.log('\n✅ users table columns:');
            usersCols.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type})`);
            });
        } catch (e) {
            console.log('\n❌ users table error:', e.message);
        }

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database check failed:', error);
        await pool.end();
        process.exit(1);
    }
}

checkTables();
