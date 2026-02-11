import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import SubmissionService from './submissionService.js';

const submissionService = new SubmissionService();

/**
 * Get all surveys
 */
export const getAllSurveys = async (req, res, next) => {
    try {
        const pool = getPool();

        // 1. Fetch all surveys
        const [surveys] = await pool.query(
            'SELECT id, title, type, status, config FROM surveys'
        );

        if (surveys.length === 0) {
            return res.json({ surveys: [] });
        }

        // 2. Fetch options for these surveys
        const surveyIds = surveys.map(s => s.id);
        const [options] = await pool.query(
            'SELECT id, survey_id, label as title, value FROM survey_options WHERE survey_id IN (?)',
            [surveyIds]
        );

        // 3. Map options to surveys
        const surveysWithOptions = surveys.map(survey => {
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
