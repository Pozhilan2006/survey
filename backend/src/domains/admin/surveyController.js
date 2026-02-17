import AdminSurveyService from './adminSurveyService.js';
import logger from '../../utils/logger.js';

const adminSurveyService = new AdminSurveyService();

/**
 * Create a new survey
 * POST /api/v1/admin/surveys
 */
export const createSurvey = async (req, res, next) => {
    try {
        const {
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
        } = req.body;

        if (!title || !type) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Title and type are required'
                }
            });
        }

        const result = await adminSurveyService.createSurvey({
            title,
            type,
            config,
            options,
            createdBy: req.user.userId, // From JWT token
            maxSelections,
            priorityMode,
            surveyType,
            approvalPolicy,
            visibilityMode,
            eligibilityRules
        });

        res.status(201).json({ success: true, ...result });

    } catch (error) {
        logger.error('Error in createSurvey:', error);
        res.status(500).json({
            success: false,
            error: {
                code: 'SURVEY_CREATE_FAILED',
                message: 'Failed to create survey',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};

/**
 * Update a survey
 * PUT /api/v1/admin/surveys/:id
 */
export const updateSurvey = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
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
        } = req.body;

        const result = await adminSurveyService.updateSurvey(id, {
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
        });

        res.json({ success: true, ...result });

    } catch (error) {
        logger.error('Error in updateSurvey:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: {
                code: error.code || 'SURVEY_UPDATE_FAILED',
                message: error.message || 'Failed to update survey',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};

/**
 * Delete a survey
 * DELETE /api/v1/admin/surveys/:id
 */
export const deleteSurvey = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await adminSurveyService.deleteSurvey(id);

        res.json({ success: true, ...result });

    } catch (error) {
        logger.error('Error in deleteSurvey:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: {
                code: error.code || 'SURVEY_DELETE_FAILED',
                message: error.message || 'Failed to delete survey',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};

/**
 * Get survey by ID
 * GET /api/v1/admin/surveys/:id
 */
export const getSurvey = async (req, res, next) => {
    try {
        const { id } = req.params;

        const survey = await adminSurveyService.getSurveyById(id);

        res.json({ success: true, survey });

    } catch (error) {
        logger.error('Error in getSurvey:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({
            success: false,
            error: {
                code: error.code || 'SURVEY_FETCH_FAILED',
                message: error.message || 'Failed to fetch survey',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};
