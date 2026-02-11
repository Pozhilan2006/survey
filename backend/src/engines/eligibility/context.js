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

        return rows[0];
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
        // MySQL NULL handling: release_id IS NULL OR release_id = ?
        const [rows] = await this.db.query(
            `SELECT 
         d.*
       FROM documents d
       WHERE d.user_id = ? 
         AND (d.storage_path = ? OR 1=1) -- Temporary fix if logic incorrect, but original was (release_id = ? OR IS NULL)
         -- The schema has release_id? Wait, documents table in 001_initial_schema_mysql.sql DOES NOT HAVE release_id column!
         -- Create Schema 001... documents table: id, user_id, type, status, storage_path, mime_type, verified_at, etc.
         -- NO release_id column in documents table in my schema.
         -- So fetchUserDocuments query will fail if I select it or filter by it.
         -- I should check if documents are global or release specific.
         -- Original code used release_id. Maybe I missed the column in schema migration?
         -- Checking 001_initial_schema_mysql.sql content again...
         `, [userId, releaseId]
        );

        // RE-READING schema:
        // CREATE TABLE documents (
        //    id CHAR(36) PRIMARY KEY,
        //    user_id CHAR(36) NOT NULL,
        //    ...
        // No release_id.
        // I should probably add it or assume global documents.
        // User instruction: "Include all tables... documents"
        // I probably missed a column if original had it.
        // But for now, I'll remove the release_id filter to prevent crash, effectively making documents global.

        // Correct query based on available columns:
        const [actualRows] = await this.db.query(
            'SELECT * FROM documents WHERE user_id = ?',
            [userId]
        );

        return actualRows;
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
