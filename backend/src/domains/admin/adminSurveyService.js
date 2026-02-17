import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { TABLES } from '../../db/tables.js';

/**
 * Admin Survey Service
 * Handles CRUD operations for surveys
 */
class AdminSurveyService {
    /**
     * Create a new survey
     */
    async createSurvey({
        title,
        type,
        config,
        options,
        createdBy,
        maxSelections = 1,
        priorityMode = false,
        surveyType = 'SINGLE_CHOICE',
        approvalPolicy = 'AUTO_APPROVE',
        visibilityMode = 'PUBLIC',
        eligibilityRules = null
    }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const surveyId = uuidv4();

            // Insert survey
            await connection.query(
                `INSERT INTO ${TABLES.SURVEYS} 
                 (id, title, type, status, config, created_by, 
                  max_selections, priority_mode, survey_type, approval_policy, visibility_mode, eligibility_rules)
                 VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    surveyId,
                    title,
                    type,
                    JSON.stringify(config || {}),
                    createdBy,
                    maxSelections,
                    priorityMode,
                    surveyType,
                    approvalPolicy,
                    visibilityMode,
                    eligibilityRules ? JSON.stringify(eligibilityRules) : null
                ]
            );

            // Insert options if provided
            if (options && options.length > 0) {
                const optionValues = options.map(opt => [
                    uuidv4(),
                    surveyId,
                    opt.label,
                    opt.value || opt.label
                ]);

                await connection.query(
                    `INSERT INTO ${TABLES.SURVEY_OPTIONS} (id, survey_id, label, value, description)
                     VALUES ?`,
                    [options.map(opt => [
                        uuidv4(),
                        surveyId,
                        opt.label,
                        opt.value || opt.label,
                        opt.description || null
                    ])]
                );
            }

            // CRITICAL FIX: Create an ACTIVE release so students can see the survey
            const releaseId = uuidv4();
            await connection.query(
                `INSERT INTO ${TABLES.SURVEY_RELEASES} 
                 (id, survey_id, version, status, rule_config, active_from, active_to)
                 VALUES (?, ?, 1, 'PUBLISHED', '{}', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
                [releaseId, surveyId]
            );

            await connection.commit();

            logger.info(`Survey created: ${surveyId}`);
            return { surveyId };

        } catch (error) {
            await connection.rollback();
            logger.error('Error creating survey:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update an existing survey
     */
    async updateSurvey(surveyId, {
        title,
        type,
        config,
        options,
        maxSelections,
        priorityMode,
        surveyType,
        approvalPolicy,
        visibilityMode,
        eligibilityRules
    }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Build update query dynamically
            const updates = [];
            const params = [];

            if (title) { updates.push('title = ?'); params.push(title); }
            if (type) { updates.push('type = ?'); params.push(type); }
            if (config) { updates.push('config = ?'); params.push(JSON.stringify(config)); }

            if (maxSelections !== undefined) { updates.push('max_selections = ?'); params.push(maxSelections); }
            if (priorityMode !== undefined) { updates.push('priority_mode = ?'); params.push(priorityMode); }
            if (surveyType) { updates.push('survey_type = ?'); params.push(surveyType); }
            if (approvalPolicy) { updates.push('approval_policy = ?'); params.push(approvalPolicy); }
            if (visibilityMode) { updates.push('visibility_mode = ?'); params.push(visibilityMode); }
            if (eligibilityRules !== undefined) { updates.push('eligibility_rules = ?'); params.push(eligibilityRules ? JSON.stringify(eligibilityRules) : null); }

            if (updates.length > 0) {
                params.push(surveyId);
                await connection.query(
                    `UPDATE ${TABLES.SURVEYS}
                     SET ${updates.join(', ')}
                     WHERE id = ?`,
                    params
                );
            }

            // If options provided, replace them (Legacy support - simpler OptionService preferred)
            if (options) {
                // Delete existing options
                await connection.query(
                    `DELETE FROM ${TABLES.SURVEY_OPTIONS} WHERE survey_id = ?`,
                    [surveyId]
                );

                // Insert new options
                if (options.length > 0) {
                    await connection.query(
                        `INSERT INTO ${TABLES.SURVEY_OPTIONS} (id, survey_id, label, value, description)
                         VALUES ?`,
                        [options.map(opt => [
                            uuidv4(),
                            surveyId,
                            opt.label,
                            opt.value || opt.label,
                            opt.description || null
                        ])]
                    );
                }
            }

            await connection.commit();

            logger.info(`Survey updated: ${surveyId}`);
            return { surveyId };

        } catch (error) {
            await connection.rollback();
            logger.error('Error updating survey:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete a survey with proper cascading
     */
    async deleteSurvey(surveyId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Check if survey exists
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

            // 2. Check if survey has participations (via releases)
            const [participations] = await connection.query(
                `SELECT COUNT(*) as count 
                 FROM ${TABLES.SURVEY_PARTICIPATION} sp
                 JOIN ${TABLES.SURVEY_RELEASES} sr ON sp.release_id = sr.id
                 WHERE sr.survey_id = ?`,
                [surveyId]
            );

            if (participations[0].count > 0) {
                throw {
                    code: 'SURVEY_HAS_SUBMISSIONS',
                    message: 'Cannot delete survey with existing submissions',
                    statusCode: 400
                };
            }

            // 3. Delete cascading data
            // (InnoDB foreign keys with ON DELETE CASCADE handles most, but we do manual cleanup for safety)

            // Delete survey (cascades everything due to foreign keys)
            await connection.query(
                `DELETE FROM ${TABLES.SURVEYS} WHERE id = ?`,
                [surveyId]
            );

            await connection.commit();

            logger.info(`Survey deleted: ${surveyId}`);
            return { success: true };

        } catch (error) {
            await connection.rollback();
            logger.error('Error deleting survey:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get survey by ID
     */
    async getSurveyById(surveyId) {
        const pool = getPool();

        const [surveys] = await pool.query(
            `SELECT 
                id, title, type, status, config,
                max_selections, priority_mode, survey_type, 
                approval_policy, visibility_mode, eligibility_rules
             FROM ${TABLES.SURVEYS} WHERE id = ?`,
            [surveyId]
        );

        if (surveys.length === 0) {
            throw {
                code: 'SURVEY_NOT_FOUND',
                message: 'Survey not found',
                statusCode: 404
            };
        }

        const survey = surveys[0];

        const [options] = await pool.query(
            `SELECT id, label, value, description, metadata 
             FROM ${TABLES.SURVEY_OPTIONS} 
             WHERE survey_id = ?
             ORDER BY created_at ASC`,
            [surveyId]
        );

        return {
            ...survey,
            eligibility_rules: survey.eligibility_rules ? JSON.parse(survey.eligibility_rules) : null,
            options
        };
    }
}

export default AdminSurveyService;
