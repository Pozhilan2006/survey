import mysql from 'mysql2/promise';

let pool = null;

export function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            port: process.env.MYSQL_PORT || 3306,
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DATABASE || 'survey_fs',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
    }
    return pool;
}

export async function getConnection() {
    const pool = getPool();
    return await pool.getConnection();
}

export async function withTransaction(callback) {
    const connection = await getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function query(sql, params = []) {
    const pool = getPool();
    const [rows] = await pool.execute(sql, params);
    return rows;
}

export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

export default {
    getConnection,
    withTransaction,
    query,
    closePool,
    getPool
};
