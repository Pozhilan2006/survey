import { getDb } from '../../config/database.js';
import AssignmentService from './assignmentService.js';
import ApprovalService from '../admin/approvalService.js';
import { NotFoundError, ForbiddenError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * Approver Service
 * 
 * Business logic for approver operations
 */
class ApproverService {
    constructor(db = null) {
        this.db = db || getDb();
        this.assignmentService = new AssignmentService(this.db);
        this.approvalService = new ApprovalService(this.db);
    }

    /**
     * Get dashboard data for approver
     */
    async getDashboard(approverId) {
        try {
            // Get assigned surveys
            const assignedSurveys = await this.assignmentService.getAssignedSurveys(approverId);

            // Get pending approvals count
            const [pendingCount] = await this.db.query(
                `SELECT COUNT(DISTINCT ss.id) as count
                 FROM survey_submissions ss
                 JOIN survey_releases sr ON ss.release_id = sr.id
                 JOIN approver_assignments aa ON sr.survey_id = aa.survey_id
                 WHERE aa.approver_id = ? AND ss.status = 'PENDING_APPROVAL'`,
                [approverId]
            );

            // Get recent activity
            const [recentActivity] = await this.db.query(
                `SELECT 
                    ae.action,
                    ae.created_at,
                    s.title as survey_title,
                    u.email as student_email
                 FROM audit_events ae
                 JOIN survey_submissions ss ON ae.entity_id = ss.id
                 JOIN survey_releases sr ON ss.release_id = sr.id
                 JOIN surveys s ON sr.survey_id = s.id
                 JOIN users u ON ss.user_id = u.id
                 WHERE ae.user_id = ? 
                    AND ae.action IN ('APPROVE_SUBMISSION', 'REJECT_SUBMISSION')
                 ORDER BY ae.created_at DESC
                 LIMIT 10`,
                [approverId]
            );

            return {
                assignedSurveys,
                stats: {
                    pendingApprovals: pendingCount[0].count,
                    assignedSurveys: assignedSurveys.length
                },
                recentActivity
            };
        } catch (error) {
            logger.error('Error getting approver dashboard:', error);
            throw error;
        }
    }

    /**
     * Get pending approvals for assigned surveys
     */
    async getPendingApprovals(approverId, filters = {}) {
        try {
            let query = `
                SELECT 
                    ss.id as submission_id,
                    ss.created_at,
                    s.id as survey_id,
                    s.title as survey_title,
                    s.type as survey_type,
                    u.id as student_id,
                    u.email as student_email,
                    u.name as student_name
                FROM survey_submissions ss
                JOIN survey_releases sr ON ss.release_id = sr.id
                JOIN surveys s ON sr.survey_id = s.id
                JOIN users u ON ss.user_id = u.id
                JOIN approver_assignments aa ON s.id = aa.survey_id
                WHERE aa.approver_id = ? AND ss.status = 'PENDING_APPROVAL'
            `;

            const params = [approverId];

            // Add survey filter
            if (filters.surveyId) {
                query += ' AND s.id = ?';
                params.push(filters.surveyId);
            }

            query += ' ORDER BY ss.created_at ASC';

            const [submissions] = await this.db.query(query, params);

            // Get selections for each submission
            for (const submission of submissions) {
                const [selections] = await this.db.query(
                    `SELECT 
                        so.label,
                        sel.rank
                     FROM submission_selections sel
                     JOIN survey_options so ON sel.option_id = so.id
                     WHERE sel.submission_id = ?
                     ORDER BY sel.rank ASC`,
                    [submission.submission_id]
                );
                submission.selections = selections;
            }

            return submissions;
        } catch (error) {
            logger.error('Error getting pending approvals:', error);
            throw error;
        }
    }

    /**
     * Approve submission (with assignment check)
     */
    async approveSubmission(submissionId, approverId, notes = '') {
        try {
            // Get submission details
            const [submission] = await this.db.query(
                `SELECT ss.*, sr.survey_id
                 FROM survey_submissions ss
                 JOIN survey_releases sr ON ss.release_id = sr.id
                 WHERE ss.id = ?`,
                [submissionId]
            );

            if (!submission || submission.length === 0) {
                throw new NotFoundError('Submission not found');
            }

            // Verify approver is assigned to this survey
            const isAssigned = await this.assignmentService.isAssigned(
                approverId,
                submission[0].survey_id
            );

            if (!isAssigned) {
                throw new ForbiddenError('Not assigned to this survey');
            }

            // Call existing approval service
            return await this.approvalService.approve(submissionId, approverId, notes);
        } catch (error) {
            logger.error('Error approving submission:', error);
            throw error;
        }
    }

    /**
     * Reject submission (with assignment check)
     */
    async rejectSubmission(submissionId, approverId, reason) {
        try {
            // Get submission details
            const [submission] = await this.db.query(
                `SELECT ss.*, sr.survey_id
                 FROM survey_submissions ss
                 JOIN survey_releases sr ON ss.release_id = sr.id
                 WHERE ss.id = ?`,
                [submissionId]
            );

            if (!submission || submission.length === 0) {
                throw new NotFoundError('Submission not found');
            }

            // Verify approver is assigned to this survey
            const isAssigned = await this.assignmentService.isAssigned(
                approverId,
                submission[0].survey_id
            );

            if (!isAssigned) {
                throw new ForbiddenError('Not assigned to this survey');
            }

            // Call existing approval service
            return await this.approvalService.reject(submissionId, approverId, reason);
        } catch (error) {
            logger.error('Error rejecting submission:', error);
            throw error;
        }
    }
}

export default ApproverService;
