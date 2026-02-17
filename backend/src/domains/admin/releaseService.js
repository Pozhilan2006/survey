import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Survey Release Management Service
 * Handles publishing, capacity, and quotas
 */
class ReleaseService {
    /**
     * Create a new release
     */
    async createRelease(surveyId, {
        version,
        activeFrom,
        activeTo,
        openTime,
        closeTime,
        autoClose = false,
        status = 'PUBLISHED',
        eligibilityRules = null
    }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verify survey exists
            const [surveys] = await connection.query(
                `SELECT id FROM ${TABLES.SURVEYS} WHERE id = ?`,
                [surveyId]
            );

            if (surveys.length === 0) {
                throw {
                    code: 'SURVEY_NOT_FOUND',
                    message: 'Survey not found',
                    statusCode: 404
                };
            }

            // Deactivate previous releases if this one is active
            if (status === 'PUBLISHED') {
                await connection.query(
                    `UPDATE ${TABLES.SURVEY_RELEASES} 
                     SET status = 'ARCHIVED' 
                     WHERE survey_id = ? AND status = 'PUBLISHED'`,
                    [surveyId]
                );
            }

            const releaseId = uuidv4();

            // Insert release with eligibility rules
            await connection.query(
                `INSERT INTO ${TABLES.SURVEY_RELEASES} 
                 (id, survey_id, version, status, active_from, active_to, open_time, close_time, auto_close, eligibility_rules, rule_config)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
                [
                    releaseId,
                    surveyId,
                    version || '1.0',
                    status,
                    activeFrom || new Date(),
                    activeTo,
                    openTime || activeFrom || new Date(),
                    closeTime || activeTo,
                    autoClose,
                    eligibilityRules ? JSON.stringify(eligibilityRules) : null
                ]
            );

            // Copy options and capacity from survey definition (snapshotting)
            // Ideally we should copy option definitions too if they change, 
            // but for now we link to existing options and set capacity.

            // This part assumes we might want to set specific capacity for this release
            // For now, we rely on the survey_options table capacity which is shared.
            // A more advanced implementation would snapshot options into a release_options table.

            await connection.commit();

            logger.info(`Release created: ${releaseId}`);
            return { releaseId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get releases for a survey
     */
    async getReleases(surveyId) {
        const pool = getPool();

        const [releases] = await pool.query(
            `SELECT * FROM ${TABLES.SURVEY_RELEASES} 
             WHERE survey_id = ? 
             ORDER BY created_at DESC`,
            [surveyId]
        );

        return releases;
    }

    /**
     * Update release
     */
    async updateRelease(releaseId, { openTime, closeTime, autoClose, status }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const updates = [];
            const params = [];

            if (openTime !== undefined) { updates.push('open_time = ?'); params.push(openTime); }
            if (closeTime !== undefined) { updates.push('close_time = ?'); params.push(closeTime); }
            if (autoClose !== undefined) { updates.push('auto_close = ?'); params.push(autoClose); }
            if (status !== undefined) { updates.push('status = ?'); params.push(status); }

            if (updates.length > 0) {
                params.push(releaseId);
                await connection.query(
                    `UPDATE ${TABLES.SURVEY_RELEASES} 
                     SET ${updates.join(', ')} 
                     WHERE id = ?`,
                    params
                );
            }

            await connection.commit();
            return { success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Close release (manual override)
     */
    async closeRelease(releaseId) {
        return this.updateRelease(releaseId, { status: 'CLOSED', closeTime: new Date() });
    }
}

export default new ReleaseService();
