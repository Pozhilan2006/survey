import { query } from '../config/database.js';
import { HOLD_STATUSES } from '../config/constants.js';
import logger from './logger.js';

let cleanupInterval = null;

export function startBackgroundJobs() {
    // Clean up expired holds every minute
    const intervalMs = parseInt(process.env.HOLD_CLEANUP_INTERVAL_MS || '60000');

    cleanupInterval = setInterval(async () => {
        await cleanupExpiredHolds();
    }, intervalMs);

    logger.info(`Background jobs started (interval: ${intervalMs}ms)`);
}

export function stopBackgroundJobs() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('Background jobs stopped');
    }
}

async function cleanupExpiredHolds() {
    try {
        // MySQL doesn't support UPDATE ... RETURNING
        // So we select first, then update

        // 1. Find expired holds
        const expiredHolds = await query(
            `SELECT id, option_id, release_id, participation_id 
             FROM option_holds 
             WHERE status = ? AND expires_at < NOW()`,
            [HOLD_STATUSES.ACTIVE]
        );

        if (expiredHolds.length > 0) {
            logger.info(`Found ${expiredHolds.length} expired holds`);

            // 2. Update them to EXPIRED
            const expiredIds = expiredHolds.map(h => h.id);
            // Bulk update status
            await query(
                `UPDATE option_holds 
                 SET status = ?, released_at = NOW() 
                 WHERE id IN (?)`,
                [HOLD_STATUSES.EXPIRED, expiredIds]
            );

            // 3. Release capacity for each
            for (const hold of expiredHolds) {
                await query(
                    `UPDATE option_capacity
                     SET reserved_count = GREATEST(0, reserved_count - 1)
                     WHERE option_id = ?`,
                    [hold.option_id]
                );
            }

            // TODO: Notify waitlisted users if capacity now available
        }
    } catch (error) {
        logger.error('Failed to cleanup expired holds:', error);
        // Fail-safe: prevent infinite crash loop if DB schema is still broken
        if (error.code === 'ER_BAD_FIELD_ERROR' || error.message.includes('Unknown column')) {
            logger.error('CRITICAL: Schema mismatch detected. Pausing background jobs for 5 minutes.');
            stopBackgroundJobs();
            setTimeout(startBackgroundJobs, 5 * 60 * 1000);
        }
    }
}

export default {
    startBackgroundJobs,
    stopBackgroundJobs
};
