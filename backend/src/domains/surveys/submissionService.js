import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Submission Service
 * Handles survey submission logic with transactions
 */
class SubmissionService {
    /**
     * Submit a survey
     * @param {string} surveyId - Survey ID
     * @param {string} userId - User ID
     * @param {string[]} selectedOptionIds - Array of selected option IDs
     * @returns {Promise<object>} Submission result
     */
    async submitSurvey(surveyId, userId, selectedOptionIds) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Validate survey exists
            const [surveys] = await connection.query(
                'SELECT id, title, type, status FROM surveys WHERE id = ?',
                [surveyId]
            );

            if (surveys.length === 0) {
                throw new Error('Survey not found');
            }

            const survey = surveys[0];

            if (survey.status !== 'ACTIVE') {
                throw new Error('Survey is not active');
            }

            // 2. Validate all options belong to this survey
            if (selectedOptionIds.length > 0) {
                const [options] = await connection.query(
                    'SELECT id FROM survey_options WHERE id IN (?) AND survey_id = ?',
                    [selectedOptionIds, surveyId]
                );

                if (options.length !== selectedOptionIds.length) {
                    throw new Error('Invalid option IDs');
                }
            }

            // 3. Create participation record
            const participationId = uuidv4();
            await connection.query(
                `INSERT INTO survey_participation 
                 (id, release_id, user_id, status, started_at, submitted_at, state_history) 
                 VALUES (?, ?, ?, ?, NOW(), NOW(), ?)`,
                [
                    participationId,
                    surveyId, // TODO: Phase 2 - use actual release_id
                    userId,
                    'SUBMITTED',
                    JSON.stringify([{ status: 'SUBMITTED', timestamp: new Date().toISOString() }])
                ]
            );

            // 4. Insert selections
            for (const optionId of selectedOptionIds) {
                const selectionId = uuidv4();
                await connection.query(
                    `INSERT INTO survey_selections 
                     (id, participation_id, option_id, rank_order, created_at) 
                     VALUES (?, ?, ?, NULL, NOW())`,
                    [selectionId, participationId, optionId]
                );
            }

            // 5. Insert audit log
            await this.insertAuditLog(connection, {
                userId,
                action: 'SURVEY_SUBMITTED',
                resourceType: 'SURVEY_PARTICIPATION',
                resourceId: participationId,
                details: {
                    surveyId,
                    surveyTitle: survey.title,
                    optionCount: selectedOptionIds.length
                }
            });

            await connection.commit();

            return {
                participationId,
                status: 'SUBMITTED',
                message: 'Survey submitted successfully'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Submission failed:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Insert audit log entry
     * @param {object} connection - MySQL connection
     * @param {object} data - Audit data
     */
    async insertAuditLog(connection, data) {
        const auditId = uuidv4();
        await connection.query(
            `INSERT INTO audit_events 
             (id, user_id, action, resource_type, resource_id, details, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                auditId,
                data.userId,
                data.action,
                data.resourceType,
                data.resourceId,
                JSON.stringify(data.details)
            ]
        );
    }
}

export default SubmissionService;
