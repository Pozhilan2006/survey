import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireApprover } from '../../middleware/approverAuth.js';
import ApproverController from './controller.js';

const router = express.Router();
let controllerInstance = null;

const getController = () => {
    if (!controllerInstance) {
        controllerInstance = new ApproverController();
    }
    return controllerInstance;
};

/**
 * Get approver dashboard data
 * GET /api/v1/approver/dashboard
 */
router.get(
    '/dashboard',
    authenticate,
    requireApprover,
    (req, res, next) => getController().getDashboard(req, res, next)
);

/**
 * Get pending approvals for assigned surveys
 * GET /api/v1/approver/pending
 */
router.get(
    '/pending',
    authenticate,
    requireApprover,
    (req, res, next) => getController().getPendingApprovals(req, res, next)
);

/**
 * Approve submission
 * POST /api/v1/approver/submissions/:id/approve
 */
router.post(
    '/submissions/:id/approve',
    authenticate,
    requireApprover,
    (req, res, next) => getController().approveSubmission(req, res, next)
);

/**
 * Reject submission
 * POST /api/v1/approver/submissions/:id/reject
 */
router.post(
    '/submissions/:id/reject',
    authenticate,
    requireApprover,
    (req, res, next) => getController().rejectSubmission(req, res, next)
);

/**
 * Get assigned surveys
 * GET /api/v1/approver/assigned-surveys
 */
router.get(
    '/assigned-surveys',
    authenticate,
    requireApprover,
    (req, res, next) => getController().getAssignedSurveys(req, res, next)
);

export default router;
