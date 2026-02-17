/**
 * Simple Calendar Slots Migration
 * Creates the three tables needed for slot booking
 */

import { getDb } from '../src/config/database.js';

async function runMigration() {
    const db = getDb();

    try {
        console.log('🚀 Starting calendar slots migration...\n');

        // 1. Create calendar_slots table
        console.log('Creating calendar_slots table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS calendar_slots (
                id CHAR(36) PRIMARY KEY,
                survey_id CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                start_time DATETIME NOT NULL,
                end_time DATETIME NOT NULL,
                capacity INT NOT NULL DEFAULT 1,
                location VARCHAR(255),
                metadata JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE,
                INDEX idx_survey_id (survey_id),
                INDEX idx_start_time (start_time),
                INDEX idx_end_time (end_time),
                INDEX idx_survey_start (survey_id, start_time)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ calendar_slots table created\n');

        // 2. Create slot_bookings table
        console.log('Creating slot_bookings table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS slot_bookings (
                id CHAR(36) PRIMARY KEY,
                slot_id CHAR(36) NOT NULL,
                user_id CHAR(36) NOT NULL,
                submission_id CHAR(36),
                status ENUM('HELD', 'CONFIRMED', 'CANCELLED') DEFAULT 'HELD',
                held_until DATETIME,
                confirmed_at DATETIME,
                cancelled_at DATETIME,
                cancellation_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (slot_id) REFERENCES calendar_slots(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (submission_id) REFERENCES survey_submissions(id) ON DELETE SET NULL,
                
                UNIQUE KEY unique_user_slot (user_id, slot_id),
                INDEX idx_slot_id (slot_id),
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_held_until (held_until),
                INDEX idx_slot_status (slot_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ slot_bookings table created\n');

        // 3. Create slot_quota_buckets table
        console.log('Creating slot_quota_buckets table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS slot_quota_buckets (
                id CHAR(36) PRIMARY KEY,
                slot_id CHAR(36) NOT NULL,
                bucket_name VARCHAR(100) NOT NULL,
                quota INT NOT NULL,
                eligibility_rule TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (slot_id) REFERENCES calendar_slots(id) ON DELETE CASCADE,
                INDEX idx_slot_id (slot_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ slot_quota_buckets table created\n');

        // Verify tables
        console.log('Verifying tables...');
        const [tables] = await db.query(`
            SELECT TABLE_NAME, TABLE_ROWS
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME IN ('calendar_slots', 'slot_bookings', 'slot_quota_buckets')
            ORDER BY TABLE_NAME
        `);

        console.log('\n📊 Tables created:');
        tables.forEach(table => {
            console.log(`  ✓ ${table.TABLE_NAME} (${table.TABLE_ROWS} rows)`);
        });

        console.log('\n🎉 Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

runMigration();
