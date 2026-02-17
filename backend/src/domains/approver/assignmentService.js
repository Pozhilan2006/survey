import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../db/mysqlClient.js';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * Assignment Service
 * 
 * Manages approver-to-survey assignments
 */
class AssignmentService {
    constructor(db = null) {
        this.db = db || getPool();
    }

    /**
     * Assign approver to survey
     */
    async assignApprover(surveyId, approverId, assignedBy) {
        try {
            // Verify approver has APPROVER role
            const [approver] = await this.db.query(
                'SELECT role FROM users WHERE id = ?',
                [approverId]
            );

            if (!approver || approver.length === 0) {
                throw new NotFoundError('User not found');
            }

            if (approver[0].role !== 'APPROVER') {
                throw new ForbiddenError('User is not an approver');
            }

            // Verify survey exists
            const [survey] = await this.db.query(
                'SELECT id FROM surveys WHERE id = ?',
                [surveyId]
            );

            if (!survey || survey.length === 0) {
                throw new NotFoundError('Survey not found');
            }

            // Create assignment (or update if exists)
            const assignmentId = uuidv4();
            await this.db.query(
                `INSERT INTO approver_assignments 
                 (id, approver_id, survey_id, assigned_by)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE assigned_at = CURRENT_TIMESTAMP`,
                [assignmentId, approverId, surveyId, assignedBy]
            );

            logger.info('Approver assigned to survey', {
                assignmentId,
                approverId,
                surveyId,
                assignedBy
            });

            return { id: assignmentId, approverId, surveyId };
        } catch (error) {
            logger.error('Error assigning approver:', error);
            throw error;
        }
    }

    /**
     * Get surveys assigned to approver
     */
    async getAssignedSurveys(approverId) {
        try {
            const [surveys] = await this.db.query(
                `SELECT 
                    s.id,
                    s.title,
                    s.type,
                    aa.assigned_at,
                    COUNT(DISTINCT ss.id) as pending_count
                 FROM approver_assignments aa
                 JOIN surveys s ON aa.survey_id = s.id
                 LEFT JOIN survey_releases sr ON s.id = sr.survey_id
                 LEFT JOIN survey_submissions ss ON sr.id = ss.release_id 
                    AND ss.status = 'PENDING_APPROVAL'
                 WHERE aa.approver_id = ?
                 GROUP BY s.id, s.title, s.type, aa.assigned_at
                 ORDER BY aa.assigned_at DESC`,
                [approverId]
            );

            return surveys;
        } catch (error) {
            logger.error('Error getting assigned surveys:', error);
            throw error;
        }
    }

    /**
     * Check if approver is assigned to survey
     */
    async isAssigned(approverId, surveyId) {
        try {
            const [result] = await this.db.query(
                `SELECT COUNT(*) as count 
                 FROM approver_assignments 
                 WHERE approver_id = ? AND survey_id = ?`,
                [approverId, surveyId]
            );

            return result[0].count > 0;
        } catch (error) {
            logger.error('Error checking assignment:', error);
            throw error;
        }
    }

    /**
     * Remove assignment
     */
    async removeAssignment(surveyId, approverId) {
        try {
            await this.db.query(
                `DELETE FROM approver_assignments 
                 WHERE approver_id = ? AND survey_id = ?`,
                [approverId, surveyId]
            );

            logger.info('Assignment removed', { approverId, surveyId });
        } catch (error) {
            logger.error('Error removing assignment:', error);
            throw error;
        }
    }

    /**
     * Get all approvers assigned to a survey
     */
    async getSurveyApprovers(surveyId) {
        try {
            const [approvers] = await this.db.query(
                `SELECT 
                    u.id,
                    u.email,
                    u.name,
                    aa.assigned_at
                 FROM approver_assignments aa
                 JOIN users u ON aa.approver_id = u.id
                 WHERE aa.survey_id = ?
                 ORDER BY aa.assigned_at DESC`,
                [surveyId]
            );

            return approvers;
        } catch (error) {
            logger.error('Error getting survey approvers:', error);
            throw error;
        }
    }
}

export default AssignmentService;
