import 'dotenv/config';
import mysql from 'mysql2/promise';

async function testConnection() {
    console.log("Testing MySQL connection...");
    console.log(`Using config: ${process.env.MYSQL_USER}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE}`);

    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE
        });

        await connection.query("SELECT 1");
        await connection.end();

        console.log("✓ MySQL connected successfully");
        process.exit(0);
    } catch (err) {
        console.error("✗ MySQL connection failed:", err.message);
        process.exit(1);
    }
}

testConnection();
