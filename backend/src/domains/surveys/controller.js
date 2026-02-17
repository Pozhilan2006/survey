import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import SubmissionService from './submissionService.js';
import HoldService from './holdService.js';
import { evaluateEligibility, buildUserContext } from '../../engines/eligibilityEngine.js';
import { withRetry } from '../../utils/transactionUtils.js';

const submissionService = new SubmissionService();
const holdService = new HoldService();

/**
 * Get all surveys (for students)
 * Only returns surveys with ACTIVE releases within date range
 */
export const getAllSurveys = async (req, res, next) => {
    try {
        const pool = getPool();

        // CRITICAL FIX: Query survey_releases to get only PUBLISHED surveys within active date range
        const [releases] = await pool.query(`
            SELECT 
                s.id, 
                s.title, 
                s.type, 
                s.status, 
                s.config,
                sr.id as release_id,
                sr.active_from,
                sr.active_to
            FROM surveys s
            INNER JOIN survey_releases sr ON s.id = sr.survey_id
            WHERE sr.status = 'PUBLISHED'
              AND NOW() BETWEEN sr.active_from AND sr.active_to
        `);

        if (releases.length === 0) {
            return res.json({ surveys: [] });
        }

        // Fetch options for these surveys
        const surveyIds = releases.map(s => s.id);
        const [options] = await pool.query(
            'SELECT id, survey_id, label as title, value FROM survey_options WHERE survey_id IN (?)',
            [surveyIds]
        );

        // Map options to surveys
        const surveysWithOptions = releases.map(survey => {
            return {
                ...survey,
                options: options.filter(opt => opt.survey_id === survey.id)
            };
        });

        res.json({ surveys: surveysWithOptions });

    } catch (error) {
        logger.error('Error fetching surveys:', error);
        next(error);
    }
};

/**
 * Check eligibility for a survey
 * GET /api/v1/surveys/:surveyId/eligibility
 */
export const checkEligibility = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        const userId = req.query.userId || req.user?.id;

        if (!userId) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'userId is required' }
            });
        }

        const pool = getPool();

        // 1. Fetch survey release with rule config
        const [surveys] = await pool.query(
            `SELECT id, title, type, status, config 
             FROM surveys 
             WHERE id = ?`,
            [surveyId]
        );

        if (surveys.length === 0) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Survey not found' }
            });
        }

        const survey = surveys[0];

        // 2. Fetch user details
        const [users] = await pool.query(
            'SELECT id, email, role, metadata FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' }
            });
        }

        const user = users[0];

        // 3. Build user context
        const userContext = buildUserContext(user);

        // 4. Evaluate eligibility
        const config = typeof survey.config === 'string'
            ? JSON.parse(survey.config)
            : (survey.config || {});

        const eligibilityRule = config.eligibility_rule || null;
        const result = evaluateEligibility(eligibilityRule, userContext);

        res.json({
            eligible: result.eligible,
            reason: result.reason,
            surveyId: survey.id,
            surveyTitle: survey.title
        });

    } catch (error) {
        logger.error('Error checking eligibility:', error);
        next(error);
    }
};

/**
 * Submit survey
 * POST /api/v1/surveys/:surveyId/submit
 */
export const submitSurvey = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        const { userId, selectedOptionIds } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'userId is required' }
            });
        }

        if (!Array.isArray(selectedOptionIds)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'selectedOptionIds must be an array' }
            });
        }

        // Check eligibility before submission
        const pool = getPool();

        const [surveys] = await pool.query(
            'SELECT id, config FROM surveys WHERE id = ?',
            [surveyId]
        );

        if (surveys.length === 0) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Survey not found' }
            });
        }

        const survey = surveys[0];

        // Fetch user
        const [users] = await pool.query(
            'SELECT id, email, role, metadata FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' }
            });
        }

        const user = users[0];
        const userContext = buildUserContext(user);

        // Evaluate eligibility
        const config = typeof survey.config === 'string'
            ? JSON.parse(survey.config)
            : (survey.config || {});

        const eligibilityRule = config.eligibility_rule || null;
        const eligibilityResult = evaluateEligibility(eligibilityRule, userContext);

        if (!eligibilityResult.eligible) {
            return res.status(403).json({
                error: {
                    code: 'NOT_ELIGIBLE',
                    message: eligibilityResult.reason
                }
            });
        }

        // Submit survey
        const result = await submissionService.submitSurvey(
            surveyId,
            userId,
            selectedOptionIds
        );

        res.status(201).json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error('Error submitting survey:', error);

        // HARDENING: Handle duplicate submission
        if (error.code === 'DUPLICATE_SUBMISSION') {
            return res.status(409).json({
                error: {
                    code: 'DUPLICATE_SUBMISSION',
                    message: error.message
                }
            });
        }

        if (error.code === 'HOLD_EXPIRED') {
            return res.status(410).json({
                error: {
                    code: 'HOLD_EXPIRED',
                    message: error.message
                }
            });
        }

        if (error.message === 'Survey not found') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: error.message }
            });
        }

        if (error.message === 'Survey is not active' || error.message === 'Invalid option IDs') {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error.message }
            });
        }

        next(error);
    }
};

/**
 * Create seat holds
 * POST /api/v1/surveys/:surveyId/hold
 */
export const createHold = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        const { userId, selectedOptionIds } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'userId is required' }
            });
        }

        if (!Array.isArray(selectedOptionIds) || selectedOptionIds.length === 0) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'selectedOptionIds must be a non-empty array' }
            });
        }

        // Create holds
        const result = await holdService.createHolds(surveyId, userId, selectedOptionIds);

        res.status(201).json({
            success: true,
            ...result
        });

    } catch (error) {
        logger.error('Error creating holds:', error);

        if (error.code === 'NOT_ELIGIBLE') {
            return res.status(403).json({
                error: {
                    code: 'NOT_ELIGIBLE',
                    message: error.message
                }
            });
        }

        if (error.code === 'CAPACITY_FULL') {
            return res.status(409).json({
                error: {
                    code: 'CAPACITY_FULL',
                    message: error.message,
                    optionId: error.optionId
                }
            });
        }

        if (error.message === 'Survey not found' || error.message === 'User not found') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: error.message }
            });
        }

        if (error.message === 'Survey is not active' || error.message === 'Invalid option IDs') {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: error.message }
            });
        }

        next(error);
    }
};
