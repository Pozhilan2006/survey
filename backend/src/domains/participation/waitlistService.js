import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import { v4 as uuidv4 } from 'uuid';
import { withTransaction } from '../../utils/transactionUtils.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

class WaitlistService {
    /**
     * Join waitlist for a survey
     */
    async joinWaitlist(userId, releaseId) {
        return await withTransaction(async (connection) => {
            // Check if already on waitlist
            const [existing] = await connection.query(
                `SELECT * FROM ${TABLES.WAITLIST} 
                 WHERE user_id = ? AND release_id = ? AND status IN ('ACTIVE', 'NOTIFIED')`,
                [userId, releaseId]
            );

            if (existing.length > 0) {
                throw new ConflictError('Already on waitlist for this survey');
            }

            // Check if already has participation
            const [participations] = await connection.query(
                `SELECT * FROM ${TABLES.SURVEY_SUBMISSIONS} 
                 WHERE user_id = ? AND release_id = ?`,
                [userId, releaseId]
            );

            if (participations.length > 0) {
                throw new ConflictError('Already participated in this survey');
            }

            // Get next position
            const [maxPosition] = await connection.query(
                `SELECT COALESCE(MAX(position), 0) as max_pos 
                 FROM ${TABLES.WAITLIST} 
                 WHERE release_id = ? AND status = 'ACTIVE'`,
                [releaseId]
            );

            const position = maxPosition[0].max_pos + 1;

            // Create waitlist entry
            const waitlistId = uuidv4();
            await connection.query(
                `INSERT INTO ${TABLES.WAITLIST} (id, user_id, release_id, position, status)
                 VALUES (?, ?, ?, ?, 'ACTIVE')`,
                [waitlistId, userId, releaseId, position]
            );

            logger.info(`User ${userId} joined waitlist for release ${releaseId} at position ${position}`);

            return {
                id: waitlistId,
                position,
                status: 'ACTIVE'
            };
        });
    }

    /**
     * Leave waitlist
     */
    async leaveWaitlist(userId, releaseId) {
        return await withTransaction(async (connection) => {
            // Get waitlist entry
            const [entries] = await connection.query(
                `SELECT * FROM ${TABLES.WAITLIST} 
                 WHERE user_id = ? AND release_id = ? AND status = 'ACTIVE'`,
                [userId, releaseId]
            );

            if (entries.length === 0) {
                throw new NotFoundError('Not on waitlist for this survey');
            }

            const entry = entries[0];

            // Remove from waitlist
            await connection.query(
                `DELETE FROM ${TABLES.WAITLIST} WHERE id = ?`,
                [entry.id]
            );

            // Reorder positions for remaining entries
            await connection.query(
                `UPDATE ${TABLES.WAITLIST} 
                 SET position = position - 1
                 WHERE release_id = ? AND position > ? AND status = 'ACTIVE'`,
                [releaseId, entry.position]
            );

            logger.info(`User ${userId} left waitlist for release ${releaseId}`);

            return { success: true };
        });
    }

    /**
     * Get user's position in waitlist
     */
    async getPosition(userId, releaseId) {
        const pool = getPool();
        const [entries] = await pool.query(
            `SELECT position, status, created_at, notified_at, expires_at
             FROM ${TABLES.WAITLIST} 
             WHERE user_id = ? AND release_id = ?`,
            [userId, releaseId]
        );

        if (entries.length === 0) {
            return null;
        }

        return entries[0];
    }

    /**
     * Get waitlist count for a release
     */
    async getWaitlistCount(releaseId) {
        const pool = getPool();
        const [result] = await pool.query(
            `SELECT COUNT(*) as count 
             FROM ${TABLES.WAITLIST} 
             WHERE release_id = ? AND status = 'ACTIVE'`,
            [releaseId]
        );

        return result[0].count;
    }

    /**
     * Notify next person in waitlist
     */
    async notifyNext(releaseId) {
        return await withTransaction(async (connection) => {
            // Get first person on waitlist
            const [entries] = await connection.query(
                `SELECT * FROM ${TABLES.WAITLIST} 
                 WHERE release_id = ? AND status = 'ACTIVE'
                 ORDER BY position ASC
                 LIMIT 1`,
                [releaseId]
            );

            if (entries.length === 0) {
                return null; // No one on waitlist
            }

            const entry = entries[0];

            // Update status to NOTIFIED with 24-hour expiration
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await connection.query(
                `UPDATE ${TABLES.WAITLIST} 
                 SET status = 'NOTIFIED', notified_at = NOW(), expires_at = ?
                 WHERE id = ?`,
                [expiresAt, entry.id]
            );

            logger.info(`Notified user ${entry.user_id} for waitlist position on release ${releaseId}`);

            // TODO: Send notification to user
            // await notificationService.sendWaitlistNotification(entry.user_id, releaseId);

            return {
                userId: entry.user_id,
                expiresAt,
                position: entry.position
            };
        });
    }

    /**
     * Convert waitlist entry to participation
     */
    async convertToParticipation(userId, releaseId) {
        return await withTransaction(async (connection) => {
            // Get waitlist entry
            const [entries] = await connection.query(
                `SELECT * FROM ${TABLES.WAITLIST} 
                 WHERE user_id = ? AND release_id = ? AND status = 'NOTIFIED'`,
                [userId, releaseId]
            );

            if (entries.length === 0) {
                throw new NotFoundError('No active waitlist notification found');
            }

            const entry = entries[0];

            // Check if expired
            if (new Date() > new Date(entry.expires_at)) {
                throw new ConflictError('Waitlist notification has expired');
            }

            // Mark as converted
            await connection.query(
                `UPDATE ${TABLES.WAITLIST} SET status = 'CONVERTED' WHERE id = ?`,
                [entry.id]
            );

            logger.info(`User ${userId} converted waitlist to participation for release ${releaseId}`);

            return { success: true };
        });
    }

    /**
     * Expire old notifications
     */
    async expireNotifications() {
        const pool = getPool();
        const [result] = await pool.query(
            `UPDATE ${TABLES.WAITLIST}
             SET status = 'EXPIRED'
             WHERE status = 'NOTIFIED'
             AND expires_at < NOW()`
        );

        if (result.affectedRows > 0) {
            logger.info(`Expired ${result.affectedRows} waitlist notification(s)`);
        }

        return result.affectedRows;
    }
}

export default new WaitlistService();
