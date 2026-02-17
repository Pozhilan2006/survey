import releaseService from './releaseService.js';
import logger from '../../utils/logger.js';

/**
 * Create a new release
 * POST /api/v1/admin/surveys/:surveyId/releases
 */
export const createRelease = async (req, res, next) => {
    try {
        const { surveyId } = req.params;
        const {
            version,
            activeFrom,
            activeTo,
            openTime,
            closeTime,
            autoClose,
            eligibilityRules
        } = req.body;

        const result = await releaseService.createRelease(surveyId, {
            version,
            activeFrom,
            activeTo,
            openTime,
            closeTime,
            autoClose,
            eligibilityRules
        });

        res.status(201).json({ success: true, ...result });

    } catch (error) {
        logger.error('Error in createRelease:', error);
        next(error);
    }
};

/**
 * Get releases
 * GET /api/v1/admin/surveys/:surveyId/releases
 */
export const getReleases = async (req, res, next) => {
    try {
        const { surveyId } = req.params;

        const releases = await releaseService.getReleases(surveyId);

        res.json({ success: true, releases });

    } catch (error) {
        logger.error('Error in getReleases:', error);
        next(error);
    }
};

/**
 * Update release
 * PUT /api/v1/admin/releases/:id
 */
export const updateRelease = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { openTime, closeTime, autoClose, status } = req.body;

        await releaseService.updateRelease(id, {
            openTime,
            closeTime,
            autoClose,
            status
        });

        res.json({ success: true, message: 'Release updated' });

    } catch (error) {
        logger.error('Error in updateRelease:', error);
        next(error);
    }
};
