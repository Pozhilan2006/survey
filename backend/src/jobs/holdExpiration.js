import cron from 'node-cron';
import { getPool } from '../config/database.js';
import { TABLES } from '../db/tables.js';
import logger from '../utils/logger.js';

/**
 * Background job to expire old seat holds
 * Runs every minute to check for expired holds
 */
class HoldExpirationJob {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
    }

    /**
     * Start the cron job
     */
    start() {
        if (this.cronJob) {
            logger.warn('Hold expiration job is already running');
            return;
        }

        // Run every minute
        this.cronJob = cron.schedule('* * * * *', async () => {
            await this.expireHolds();
        });

        logger.info('Hold expiration job started (runs every minute)');
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger.info('Hold expiration job stopped');
        }
    }

    /**
     * Expire holds that have passed their expiration time
     */
    async expireHolds() {
        if (this.isRunning) {
            logger.debug('Hold expiration job already running, skipping...');
            return;
        }

        this.isRunning = true;

        try {
            const pool = getPool();

            // Update expired holds
            const [result] = await pool.query(
                `UPDATE ${TABLES.SEAT_HOLDS}
                 SET status = 'EXPIRED'
                 WHERE status = 'ACTIVE'
                 AND expires_at < NOW()`
            );

            if (result.affectedRows > 0) {
                logger.info(`Expired ${result.affectedRows} seat hold(s)`);

                // Get release IDs that had holds expired
                const [expiredHolds] = await pool.query(
                    `SELECT DISTINCT sh.release_id
                     FROM ${TABLES.SEAT_HOLDS} sh
                     WHERE sh.status = 'EXPIRED'
                     AND sh.updated_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)`
                );

                // Notify next person on waitlist for each release
                const waitlistService = (await import('../domains/participation/waitlistService.js')).default;
                for (const hold of expiredHolds) {
                    try {
                        const notified = await waitlistService.notifyNext(hold.release_id);
                        if (notified) {
                            logger.info(`Notified user ${notified.userId} from waitlist for release ${hold.release_id}`);
                        }
                    } catch (error) {
                        logger.error(`Error notifying waitlist for release ${hold.release_id}:`, error);
                    }
                }
            }

        } catch (error) {
            logger.error('Error expiring holds:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run expiration manually (for testing)
     */
    async runNow() {
        logger.info('Running hold expiration manually...');
        await this.expireHolds();
    }
}

// Export singleton instance
const holdExpirationJob = new HoldExpirationJob();

export default holdExpirationJob;
