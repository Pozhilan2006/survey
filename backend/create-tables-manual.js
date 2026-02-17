import dotenv from 'dotenv';
import { getPool } from './src/db/mysqlClient.js';

dotenv.config();

async function createTables() {
    const pool = getPool();

    try {
        console.log('🔧 Creating missing tables...\n');

        // Create refresh_tokens table
        console.log('Creating refresh_tokens table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
              id CHAR(36) PRIMARY KEY,
              user_id CHAR(36) NOT NULL,
              token VARCHAR(500) NOT NULL,
              expires_at DATETIME NOT NULL,
              revoked BOOLEAN DEFAULT FALSE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              INDEX idx_token (token),
              INDEX idx_user_id (user_id),
              INDEX idx_expires_at (expires_at),
              INDEX idx_revoked (revoked)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ refresh_tokens table created');

        // Create password_reset_tokens table
        console.log('\nCreating password_reset_tokens table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id CHAR(36) PRIMARY KEY,
              user_id CHAR(36) NOT NULL,
              token VARCHAR(255) NOT NULL,
              expires_at DATETIME NOT NULL,
              used BOOLEAN DEFAULT FALSE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              UNIQUE INDEX idx_token (token),
              INDEX idx_user_id (user_id),
              INDEX idx_expires_at (expires_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ password_reset_tokens table created');

        // Verify tables
        console.log('\n📊 Verifying tables...');
        const [refreshCols] = await pool.query('DESCRIBE refresh_tokens');
        console.log('✅ refresh_tokens:', refreshCols.map(c => c.Field).join(', '));

        const [resetCols] = await pool.query('DESCRIBE password_reset_tokens');
        console.log('✅ password_reset_tokens:', resetCols.map(c => c.Field).join(', '));

        console.log('\n✅ All tables created successfully!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Table creation failed:', error);
        await pool.end();
        process.exit(1);
    }
}

createTables();
