/**
 * Quick script to check database schema
 * Run: node backend/src/tests/checkSchema.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

import { getPool } from '../db/mysqlClient.js';
import fs from 'fs';

const pool = getPool();

async function checkSchema() {
    let output = '';

    try {
        output += '\n=== Checking Database Schema ===\n\n';

        // Check users table
        output += 'USERS TABLE:\n';
        const [usersColumns] = await pool.query('DESCRIBE users');
        usersColumns.forEach(col => {
            output += `  ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}\n`;
        });

        output += '\nSURVEYS TABLE:\n';
        const [surveysColumns] = await pool.query('DESCRIBE surveys');
        surveysColumns.forEach(col => {
            output += `  ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}\n`;
        });

        output += '\nSURVEY_OPTIONS TABLE:\n';
        const [optionsColumns] = await pool.query('DESCRIBE survey_options');
        optionsColumns.forEach(col => {
            output += `  ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}\n`;
        });

        output += '\nOPTION_CAPACITY TABLE:\n';
        const [capacityColumns] = await pool.query('DESCRIBE option_capacity');
        capacityColumns.forEach(col => {
            output += `  ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}\n`;
        });

        output += '\n';

        // Write to file
        fs.writeFileSync('schema_output.txt', output);
        console.log(output);
        console.log('Schema written to schema_output.txt');

    } catch (error) {
        output += `Error: ${error.message}\n`;
        console.error('Error:', error.message);
        fs.writeFileSync('schema_output.txt', output);
    } finally {
        await pool.end();
    }
}

checkSchema();
