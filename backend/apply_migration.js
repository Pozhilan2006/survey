
import fs from 'fs';
import path from 'path';
import { getPool } from './src/db/mysqlClient.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
    const migrationPath = path.join(__dirname, 'migrations', '002_sprint1_operational_layer.sql');
    console.log(`Reading migration file: ${migrationPath}`);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon, but handle comments roughly
    // Better to strip comments first
    const cleanSql = sql.replace(/--.*$/gm, '');
    const statements = cleanSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        console.log(`Found ${statements.length} statements.`);

        for (const stmt of statements) {
            // console.log(`Executing: ${stmt.substring(0, 50)}...`);
            try {
                await connection.query(stmt);
                process.stdout.write('.');
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes("Duplicate column name")) {
                    console.log(`\nSkipping existing column/element: ${err.message}`);
                } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`\nTable already exists.`);
                } else {
                    console.error(`\nError executing statement: ${stmt}`);
                    throw err;
                }
            }
        }
        console.log('\nMigration completed successfully.');
    } catch (error) {
        console.error('\nMigration failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        process.exit(0);
    }
}

runMigration();
