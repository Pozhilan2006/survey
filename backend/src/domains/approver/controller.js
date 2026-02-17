import ApproverService from './service.js';
import logger from '../../utils/logger.js';

/**
 * Approver Controller
 * 
 * Handles HTTP requests for approver operations
 */
class ApproverController {
    constructor(db = null) {
        this.service = new ApproverService(db);
    }

    /**
     * Get approver dashboard
     * GET /api/v1/approver/dashboard
     */
    async getDashboard(req, res, next) {
        try {
            const approverId = req.user.id;
            const data = await this.service.getDashboard(approverId);

            res.json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending approvals
     * GET /api/v1/approver/pending
     */
    async getPendingApprovals(req, res, next) {
        try {
            const approverId = req.user.id;
            const filters = {
                surveyId: req.query.surveyId
            };

            const approvals = await this.service.getPendingApprovals(approverId, filters);

            res.json({
                success: true,
                data: approvals
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve submission
     * POST /api/v1/approver/submissions/:id/approve
     */
    async approveSubmission(req, res, next) {
        try {
            const { id } = req.params;
            const approverId = req.user.id;
            const { notes } = req.body;

            const result = await this.service.approveSubmission(id, approverId, notes);

            res.json({
                success: true,
                message: 'Submission approved successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject submission
     * POST /api/v1/approver/submissions/:id/reject
     */
    async rejectSubmission(req, res, next) {
        try {
            const { id } = req.params;
            const approverId = req.user.id;
            const { reason } = req.body;

            if (!reason || !reason.trim()) {
                return res.status(400).json({
                    success: false,
                    error: 'Rejection reason is required'
                });
            }

            const result = await this.service.rejectSubmission(id, approverId, reason);

            res.json({
                success: true,
                message: 'Submission rejected',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get assigned surveys
     * GET /api/v1/approver/assigned-surveys
     */
    async getAssignedSurveys(req, res, next) {
        try {
            const approverId = req.user.id;
            const surveys = await this.service.assignmentService.getAssignedSurveys(approverId);

            res.json({
                success: true,
                data: surveys
            });
        } catch (error) {
            next(error);
        }
    }
}

export default ApproverController;
