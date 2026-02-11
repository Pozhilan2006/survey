import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    // Check config
    if (!process.env.MYSQL_DATABASE) {
        console.error('❌ MYSQL_DATABASE not found in .env file');
        process.exit(1);
    }

    let connection;
    try {
        console.log('📡 Connecting to MySQL...');
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE,
            multipleStatements: true // Enable for running migration script
        });

        console.log('✅ Connected to database');

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        console.log(`Found ${files.length} migration files.`);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const file of files) {
            console.log(`🔄 Running migration ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            try {
                await connection.query(sql);
                console.log(`✅ ${file} applied.`);
            } catch (err) {
                if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                    console.log(`⚠️  ${file} skipped (objects likely exist).`);
                } else if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`⚠️  ${file} skipped (columns likely exist).`);
                } else {
                    throw err;
                }
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('🎉 Database is ready!');

    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error.message);

        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('Tables already exist.');
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

runMigration();
