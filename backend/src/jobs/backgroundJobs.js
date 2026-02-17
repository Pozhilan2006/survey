import cron from 'node-cron';
import HoldService from '../domains/surveys/holdService.js';
import SlotService from '../domains/slots/service.js';
import logger from '../utils/logger.js';

/**
 * Background Jobs
 * 
 * Scheduled tasks that run periodically
 */

/**
 * Cleanup expired survey holds
 * Runs every minute
 */
export function startHoldCleanup() {
    const holdService = new HoldService();

    cron.schedule('* * * * *', async () => {
        try {
            const cleaned = await holdService.cleanupExpiredHolds();
            if (cleaned > 0) {
                logger.info(`Cleaned up ${cleaned} expired survey holds`);
            }
        } catch (error) {
            logger.error('Error in hold cleanup job:', error);
        }
    });

    logger.info('Hold cleanup job scheduled (every minute)');
}

/**
 * Cleanup expired slot holds
 * Runs every minute
 */
export function startSlotHoldCleanup() {
    const slotService = new SlotService();

    cron.schedule('* * * * *', async () => {
        try {
            const cleaned = await slotService.cleanupExpiredHolds();
            if (cleaned > 0) {
                logger.info(`Cleaned up ${cleaned} expired slot holds`);
            }
        } catch (error) {
            logger.error('Error in slot hold cleanup job:', error);
        }
    });

    logger.info('Slot hold cleanup job scheduled (every minute)');
}

/**
 * Start all background jobs
 */
export function startBackgroundJobs() {
    logger.info('Starting background jobs...');
    startHoldCleanup();
    startSlotHoldCleanup();
    logger.info('All background jobs started');
}
