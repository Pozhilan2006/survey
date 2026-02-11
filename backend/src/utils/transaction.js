import { getPool } from '../db/mysqlClient.js';
import logger from './logger.js';

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 */
export async function withTransaction(callback) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        logger.debug('Transaction started');

        const result = await callback(connection);

        await connection.commit();
        logger.debug('Transaction committed');

        return result;
    } catch (error) {
        await connection.rollback();
        logger.error('Transaction rolled back:', error);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Acquire a named advisory lock
 * Note: MySQL locks are session-scoped, not transaction-scoped.
 * You MUST release the lock explicitly or it will persist until connection close.
 * Use withAdvisoryLock for safer handling.
 */
export async function acquireLock(connection, lockKey, timeoutSeconds = 10) {
    // MySQL GET_LOCK returns 1 (success), 0 (timeout), null (error)
    const [rows] = await connection.execute('SELECT GET_LOCK(?, ?) as caught', [lockKey, timeoutSeconds]);
    const caught = rows[0].caught;

    if (caught === 1) {
        logger.debug(`Advisory lock acquired: ${lockKey}`);
        return true;
    } else {
        logger.warn(`Failed to acquire lock: ${lockKey} (timeout)`);
        throw new Error(`Could not acquire lock: ${lockKey}`);
    }
}

/**
 * Release a named advisory lock
 */
export async function releaseLock(connection, lockKey) {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lockKey]);
    logger.debug(`Advisory lock released: ${lockKey}`);
}

/**
 * Try to acquire lock (non-blocking)
 */
export async function tryAcquireLock(connection, lockKey) {
    const [rows] = await connection.execute('SELECT GET_LOCK(?, 0) as caught', [lockKey]);
    const caught = rows[0].caught;

    if (caught === 1) {
        logger.debug(`Advisory lock acquired: ${lockKey}`);
        return true;
    } else {
        logger.debug(`Failed to acquire lock: ${lockKey}`);
        return false;
    }
}

/**
 * Execute callback with an advisory lock held
 * Ensures lock is released even if error occurs
 * Can be wrapped in withTransaction if needed
 */
export async function withAdvisoryLock(lockKey, callback, existingConnection = null) {
    // If connection provided, use it (lock session-scoped to it)
    // If not, get new connection from pool
    let connection = existingConnection;
    let ownConnection = false;

    if (!connection) {
        const pool = getPool();
        connection = await pool.getConnection();
        ownConnection = true;
    }

    try {
        await acquireLock(connection, lockKey);
        const result = await callback(connection);
        return result;
    } finally {
        // Always release lock
        await releaseLock(connection, lockKey);
        if (ownConnection) {
            connection.release();
        }
    }
}

// Helper to keep API compatible with Postgres version if needed
export function getLockId(key) {
    // MySQL uses string keys, so we just return the key or a hash if expected
    return key;
}

export default {
    withTransaction,
    acquireLock,
    releaseLock,
    tryAcquireLock,
    withAdvisoryLock,
    getLockId
};
