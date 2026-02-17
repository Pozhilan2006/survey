import approvalService from './approvalService.js';
import logger from '../../utils/logger.js';

/**
 * Get approvals list
 * GET /api/v1/admin/approvals
 */
export const getApprovals = async (req, res, next) => {
    try {
        const { status, surveyId, limit, offset } = req.query;

        const result = await approvalService.getApprovals({
            status,
            surveyId,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('Error in getApprovals:', error);
        next(error);
    }
};

/**
 * Get approval details
 * GET /api/v1/admin/approvals/:id
 */
export const getApprovalDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const details = await approvalService.getApprovalDetails(id);

        res.json({
            success: true,
            details
        });
    } catch (error) {
        logger.error('Error in getApprovalDetails:', error);
        next(error);
    }
};

/**
 * Approve participation
 * POST /api/v1/admin/approvals/:id/approve
 */
export const approveParticipation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approverId = req.user.userId;

        const result = await approvalService.approveParticipation(id, approverId);

        res.json({
            success: true,
            message: 'Participation approved successfully',
            updatedState: result.state
        });
    } catch (error) {
        logger.error('Error in approveParticipation:', error);
        next(error);
    }
};

/**
 * Reject participation
 * POST /api/v1/admin/approvals/:id/reject
 */
export const rejectParticipation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const approverId = req.user.userId;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_REASON', message: 'Rejection reason is required' }
            });
        }

        const result = await approvalService.rejectParticipation(id, approverId, reason);

        res.json({
            success: true,
            message: 'Participation rejected successfully',
            updatedState: result.state
        });
    } catch (error) {
        logger.error('Error in rejectParticipation:', error);
        next(error);
    }
};
