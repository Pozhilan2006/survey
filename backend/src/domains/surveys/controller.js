import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';

export const getAllSurveys = async (req, res, next) => {
    try {
        const pool = getPool();

        // 1. Fetch all surveys
        // Note: Minimal implementation, no auth/pagination yet
        const [surveys] = await pool.query(
            'SELECT id, title, type, status, config FROM surveys'
        );

        if (surveys.length === 0) {
            return res.json({ surveys: [] });
        }

        // 2. Fetch options for these surveys
        // Using explicit ID list to be safe and clean
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
