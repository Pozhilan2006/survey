import logger from './logger.js';
import { getPool } from '../db/mysqlClient.js';

/**
 * Execute a function within a database transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise} Result of the callback
 */
export async function withTransaction(callback) {
    const pool = getPool();
    const connection = await pool.getConnection();

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

/**
 * Retry wrapper for database operations
 * Handles deadlocks and transient errors with exponential backoff
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY = 100; // ms
const DEFAULT_MAX_DELAY = 1000; // ms

/**
 * Execute a function with retry logic for deadlocks
 * @param {Function} fn - Async function to execute
 * @param {object} options - Retry options
 * @returns {Promise} Result of the function
 */
export async function withRetry(fn, options = {}) {
    const {
        maxRetries = DEFAULT_MAX_RETRIES,
        baseDelay = DEFAULT_BASE_DELAY,
        maxDelay = DEFAULT_MAX_DELAY,
        operationName = 'database operation'
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if error is retryable
            const isDeadlock = error.code === 'ER_LOCK_DEADLOCK';
            const isLockTimeout = error.code === 'ER_LOCK_WAIT_TIMEOUT';
            const isRetryable = isDeadlock || isLockTimeout;

            if (!isRetryable || attempt >= maxRetries) {
                // Not retryable or max retries reached
                if (isRetryable) {
                    logger.error(`${operationName} failed after ${maxRetries} retries due to ${error.code}`);
                }
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

            logger.warn(
                `${operationName} encountered ${error.code} (attempt ${attempt}/${maxRetries}), ` +
                `retrying in ${delay}ms...`
            );

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Log capacity state for debugging (dev mode only)
 * @param {string} operation - Operation name
 * @param {object} capacity - Capacity object
 */
export function logCapacityState(operation, capacity) {
    if (process.env.NODE_ENV === 'production') {
        return; // Don't log in production
    }

    logger.debug(
        `[${operation}] Capacity state: ` +
        `option=${capacity.option_id}, ` +
        `total=${capacity.total_capacity}, ` +
        `reserved=${capacity.reserved_count}, ` +
        `filled=${capacity.filled_count}, ` +
        `available=${capacity.total_capacity - (capacity.reserved_count + capacity.filled_count)}`
    );
}

/**
 * Set transaction isolation level
 * @param {object} connection - MySQL connection
 * @param {string} level - Isolation level (default: REPEATABLE READ)
 */
export async function setIsolationLevel(connection, level = 'REPEATABLE READ') {
    await connection.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);
}

/**
 * Handle duplicate entry errors
 * @param {Error} error - MySQL error
 * @param {string} entityType - Type of entity (e.g., 'submission', 'hold')
 * @returns {Error} Formatted error
 */
export function handleDuplicateError(error, entityType = 'record') {
    if (error.code === 'ER_DUP_ENTRY') {
        const formattedError = new Error(`Duplicate ${entityType} detected`);
        formattedError.code = 'DUPLICATE_ENTRY';
        formattedError.originalError = error;
        return formattedError;
    }
    return error;
}

/**
 * Handle constraint violation errors
 * @param {Error} error - MySQL error
 * @returns {Error} Formatted error
 */
export function handleConstraintError(error) {
    if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
        error.sqlState === '45000') {
        const formattedError = new Error('Data integrity constraint violated');
        formattedError.code = 'CONSTRAINT_VIOLATION';
        formattedError.originalError = error;
        formattedError.details = error.message;
        return formattedError;
    }
    return error;
}

export default {
    withRetry,
    logCapacityState,
    setIsolationLevel,
    handleDuplicateError,
    handleConstraintError
};
