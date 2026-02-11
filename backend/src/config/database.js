import {
    getPool,
    getConnection,
    query,
    withTransaction,
    closePool
} from '../db/mysqlClient.js';
import logger from '../utils/logger.js';

// Re-export MySQL client functions to maintain compatibility where possible
export {
    getPool,
    getConnection,
    query,
    withTransaction,
    closePool
};

// Initialization wrapper
export async function initializeDatabase() {
    try {
        const pool = getPool();
        // Test connection
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();

        logger.info('✅ MySQL database initialized successfully');
    } catch (error) {
        logger.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Deprecated Supabase getter - throws error if used
export function getSupabase() {
    throw new Error('Supabase client is explicitly disabled. Use MySQL client instead.');
}

export default {
    initializeDatabase,
    getPool,
    getConnection,
    getSupabase,
    query,
    withTransaction,
    closePool
};
