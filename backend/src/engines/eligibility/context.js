import logger from '../../utils/logger.js';

/**
 * Context Builder - Builds evaluation context for eligibility checks
 * 
 * Gathers all necessary user data for rule evaluation.
 */
export class ContextBuilder {
    constructor(db) {
        this.db = db;
    }

    /**
     * Build complete evaluation context for a user and release
     * 
     * @param {string} userId - User ID
     * @param {string} releaseId - Survey release ID
     * @returns {Promise<EvaluationContext>}
     */
    async build(userId, releaseId) {
        try {
            logger.debug(`Building context for user ${userId}, release ${releaseId}`);

            // Fetch all necessary data in parallel
            const [
                user,
                groups,
                completedSurveys,
                documents,
                currentTime
            ] = await Promise.all([
                this.fetchUser(userId),
                this.fetchUserGroups(userId),
                this.fetchCompletedSurveys(userId),
                this.fetchUserDocuments(userId, releaseId),
                Promise.resolve(new Date())
            ]);

            return {
                user,
                groups,
                completedSurveys,
                documents,
                currentTime,
                userId,
                releaseId
            };

        } catch (error) {
            logger.error('Failed to build context:', error);
            throw error;
        }
    }

    /**
     * Fetch user record
     */
    async fetchUser(userId) {
        const [rows] = await this.db.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            throw new Error(`User not found: ${userId}`);
        }

        // Parse profile if it's a string (mysql2 usually handles JSON columns, but safety first)
        const profile = typeof rows[0].profile === 'string'
            ? JSON.parse(rows[0].profile || '{}')
            : (rows[0].profile || {});

        const user = {
            ...rows[0],
            profile,
            // Normalize metadata for easier access in rules
            metadata: {
                ...(rows[0].metadata ? (typeof rows[0].metadata === 'string' ? JSON.parse(rows[0].metadata) : rows[0].metadata) : {}),
                year: profile.year,
                department: profile.department,
                section: profile.section,
                batch: profile.batch
            }
        };

        return user;
    }

    /**
     * Fetch all groups user belongs to
     */
    async fetchUserGroups(userId) {
        const [rows] = await this.db.query(
            `SELECT g.* 
       FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ?`,
            [userId]
        );

        return rows;
    }

    /**
     * Fetch user's completed/approved surveys
     */
    async fetchCompletedSurveys(userId) {
        const [rows] = await this.db.query(
            `SELECT 
         sp.release_id,
         sp.state,
         sp.submitted_at,
         sp.approved_at,
         sp.allocated_at,
         sr.survey_id
       FROM survey_participation sp
       JOIN survey_releases sr ON sr.id = sp.release_id
       WHERE sp.user_id = ? 
         AND sp.state IN ('SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'ALLOCATED')`,
            [userId]
        );

        return rows;
    }

    /**
     * Fetch user's documents for this release
     */
    async fetchUserDocuments(userId, releaseId) {
        // Fetch all user documents
        const [rows] = await this.db.query(
            'SELECT * FROM documents WHERE user_id = ?',
            [userId]
        );

        return rows;
    }

    /**
     * Fetch additional context data (can be extended)
     */
    async fetchAdditionalContext(userId, releaseId) {
        // Extension point for additional context data
        // e.g., user's past participation history, preferences, etc.
        return {};
    }
}

/**
 * @typedef {object} EvaluationContext
 * @property {object} user - User record
 * @property {Array} groups - Groups user belongs to
 * @property {Array} completedSurveys - User's completed surveys
 * @property {Array} documents - User's uploaded documents
 * @property {Date} currentTime - Current timestamp
 * @property {string} userId - User ID
 * @property {string} releaseId - Release ID
 */

export default ContextBuilder;
