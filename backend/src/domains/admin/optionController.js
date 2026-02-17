import optionService from './optionService.js';
import logger from '../../utils/logger.js';

/**
 * Create option for a survey
 * POST /api/v1/admin/surveys/:surveyId/options
 */
export const createOption = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        const { title, description, capacity, metadata } = req.body;

        const option = await optionService.createOption(surveyId, {
            title,
            description,
            capacity,
            metadata
        });

        res.status(201).json({
            success: true,
            option
        });

    } catch (error) {
        logger.error('Error in createOption:', error);
        next(error);
    }
};

/**
 * Get all options for a survey
 * GET /api/v1/admin/surveys/:surveyId/options
 */
export const getOptions = async (req, res, next) => {
    try {
        const { surveyId } = req.params;

        const options = await optionService.getOptionsBySurvey(surveyId);

        res.json({
            success: true,
            options,
            count: options.length
        });

    } catch (error) {
        logger.error('Error in getOptions:', error);
        next(error);
    }
};

/**
 * Get option by ID
 * GET /api/v1/admin/options/:id
 */
export const getOption = async (req, res, next) => {
    try {
        const { id } = req.params;

        const option = await optionService.getOptionById(id);

        res.json({
            success: true,
            option
        });

    } catch (error) {
        logger.error('Error in getOption:', error);
        next(error);
    }
};

/**
 * Update option
 * PUT /api/v1/admin/options/:id
 */
export const updateOption = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, capacity, metadata } = req.body;

        const option = await optionService.updateOption(id, {
            title,
            description,
            capacity,
            metadata
        });

        res.json({
            success: true,
            option
        });

    } catch (error) {
        logger.error('Error in updateOption:', error);
        next(error);
    }
};

/**
 * Delete option
 * DELETE /api/v1/admin/options/:id
 */
export const deleteOption = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await optionService.deleteOption(id);

        res.json({
            success: true,
            message: 'Option deleted successfully'
        });

    } catch (error) {
        logger.error('Error in deleteOption:', error);
        next(error);
    }
};

/**
 * Set quota buckets for an option
 * POST /api/v1/admin/options/:id/quotas
 */
export const setQuotaBuckets = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { buckets } = req.body;

        if (!Array.isArray(buckets)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_BUCKETS',
                    message: 'Buckets must be an array'
                }
            });
        }

        const result = await optionService.setQuotaBuckets(id, buckets);

        res.json({
            success: true,
            message: 'Quota buckets set successfully',
            buckets: result.buckets
        });

    } catch (error) {
        logger.error('Error in setQuotaBuckets:', error);
        next(error);
    }
};
