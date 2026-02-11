import logger from '../../utils/logger.js';
import AdminService from './adminService.js';

const adminService = new AdminService();

/**
 * Get all submissions
 * GET /api/v1/admin/submissions
 */
export const getAllSubmissions = async (req, res, next) => {
    try {
        const submissions = await adminService.getAllSubmissions();
        res.json({ submissions });
    } catch (error) {
        logger.error('Error fetching submissions:', error);
        next(error);
    }
};

/**
 * Approve a submission
 * POST /api/v1/admin/submissions/:id/approve
 */
export const approveSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;
        // TODO: Phase 2 - Get admin user ID from auth middleware
        const adminUserId = req.body.adminUserId || 'admin-placeholder';

        const result = await adminService.approveSubmission(id, adminUserId);
        res.json(result);
    } catch (error) {
        logger.error('Error approving submission:', error);

        if (error.message === 'Participation not found') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: error.message }
            });
        }

        if (error.message.includes('Cannot approve')) {
            return res.status(400).json({
                error: { code: 'INVALID_STATE', message: error.message }
            });
        }

        next(error);
    }
};

/**
 * Reject a submission
 * POST /api/v1/admin/submissions/:id/reject
 */
export const rejectSubmission = async (req, res, next) => {
    try {
        const { id } = req.params;
        // TODO: Phase 2 - Get admin user ID from auth middleware
        const adminUserId = req.body.adminUserId || 'admin-placeholder';

        const result = await adminService.rejectSubmission(id, adminUserId);
        res.json(result);
    } catch (error) {
        logger.error('Error rejecting submission:', error);

        if (error.message === 'Participation not found') {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: error.message }
            });
        }

        if (error.message.includes('Cannot reject')) {
            return res.status(400).json({
                error: { code: 'INVALID_STATE', message: error.message }
            });
        }

        next(error);
    }
};

/**
 * Get audit logs
 * GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await adminService.getAuditLogs(limit);
        res.json({ logs });
    } catch (error) {
        logger.error('Error fetching audit logs:', error);
        next(error);
    }
};
