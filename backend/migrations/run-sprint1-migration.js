import dotenv from 'dotenv';
import { getPool } from '../src/db/mysqlClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runSprint1Migration() {
    const pool = getPool();

    try {
        console.log('🔄 Running Sprint 1 migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '002_sprint1_operational_layer.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolons and execute each statement
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

        for (const statement of statements) {
            try {
                await pool.query(statement);
                const match = statement.match(/(?:ALTER TABLE|CREATE TABLE IF NOT EXISTS)\s+(\w+)/i);
                if (match) {
                    console.log(`✅ Processed: ${match[1]}`);
                }
            } catch (error) {
                // Ignore "already exists" errors
                if (error.code === 'ER_DUP_FIELDNAME' ||
                    error.code === 'ER_TABLE_EXISTS_ERROR' ||
                    error.code === 'ER_DUP_KEYNAME' ||
                    error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log('⏭️  Skipped (already exists)');
                } else {
                    throw error;
                }
            }
        }

        console.log('\n📊 Verifying new tables...\n');

        // Verify option_quota_buckets
        try {
            const [quotaCols] = await pool.query('DESCRIBE option_quota_buckets');
            console.log('✅ option_quota_buckets:', quotaCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('❌ option_quota_buckets not found');
        }

        // Verify approver_assignments
        try {
            const [approverCols] = await pool.query('DESCRIBE approver_assignments');
            console.log('✅ approver_assignments:', approverCols.map(c => c.Field).join(', '));
        } catch (e) {
            console.log('❌ approver_assignments not found');
        }

        // Verify surveys table enhancements
        const [surveysCols] = await pool.query('DESCRIBE surveys');
        const newFields = ['max_selections', 'priority_mode', 'survey_type', 'approval_policy', 'visibility_mode', 'eligibility_rules'];
        const existingFields = surveysCols.map(c => c.Field);

        console.log('\n✅ Surveys table enhancements:');
        newFields.forEach(field => {
            if (existingFields.includes(field)) {
                console.log(`   ✓ ${field}`);
            } else {
                console.log(`   ✗ ${field} (missing)`);
            }
        });

        console.log('\n✅ Sprint 1 migration completed successfully!');

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        await pool.end();
        process.exit(1);
    }
}

runSprint1Migration();
