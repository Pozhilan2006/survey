import logger from './logger.js';
import holdExpirationJob from '../jobs/holdExpiration.js';

/**
 * Start all background jobs
 */
export function startBackgroundJobs() {
    logger.info('Starting background jobs...');

    // Start hold expiration job
    holdExpirationJob.start();

    logger.info('All background jobs started');
}

/**
 * Stop background jobs
 */
export function stopBackgroundJobs() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('Background jobs stopped');
    }
}

/**
 * Clean up expired holds
 * Runs every 60 seconds
 * HARDENED: Batch processing (limit 50), FOR UPDATE locks, REPEATABLE READ isolation
 */
async function cleanupExpiredHolds() {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
        // HARDENING: Set isolation level
        await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
        await connection.beginTransaction();

        // HARDENING: Find expired holds in batches (limit 50 per cycle)
        const [expiredHolds] = await connection.query(
            `SELECT id, option_id, user_id FROM option_holds 
             WHERE status = 'ACTIVE' AND expires_at < NOW()
             LIMIT 50
             FOR UPDATE`
        );

        if (expiredHolds.length === 0) {
            await connection.commit();
            return;
        }

        logger.info(`Cleaning up ${expiredHolds.length} expired holds`);

        const holdIds = expiredHolds.map(h => h.id);

        // 2. Delete expired holds
        await connection.query(
            `DELETE FROM option_holds WHERE id IN (?)`,
            [holdIds]
        );

        // 3. HARDENING: Decrement reserved_count (never below zero)
        for (const hold of expiredHolds) {
            await connection.query(
                `UPDATE option_capacity 
                 SET reserved_count = GREATEST(0, reserved_count - 1) 
                 WHERE option_id = ?`,
                [hold.option_id]
            );
        }

        // 4. Insert audit log
        const auditId = uuidv4();
        await connection.query(
            `INSERT INTO audit_events
             (id, user_id, action, resource_type, resource_id, details, created_at)
             VALUES (?, NULL, ?, ?, NULL, ?, NOW())`,
            [
                auditId,
                'SEAT_RELEASED',
                'OPTION_HOLD',
                JSON.stringify({
                    count: expiredHolds.length,
                    reason: 'Automatic cleanup - expired'
                })
            ]
        );

        await connection.commit();

        logger.info(`Successfully cleaned up ${expiredHolds.length} expired holds`);

    } catch (error) {
        await connection.rollback();
        logger.error('Failed to cleanup expired holds:', error);

        // HARDENING: Fail-safe for constraint violations
        if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' ||
            error.sqlState === '45000') {
            logger.error('Capacity constraint violation during cleanup - data integrity preserved');
        }

        // Fail-safe: prevent infinite crash loop if DB schema is broken
        if (error.code === 'ER_BAD_FIELD_ERROR' ||
            error.code === 'ER_NO_SUCH_TABLE' ||
            error.message?.includes('Unknown column')) {
            logger.error('CRITICAL: Schema mismatch detected. Pausing background jobs for 5 minutes.');
            stopBackgroundJobs();
            setTimeout(startBackgroundJobs, 5 * 60 * 1000);
        }
    } finally {
        connection.release();
    }
}

export default {
    startBackgroundJobs,
    stopBackgroundJobs
};
