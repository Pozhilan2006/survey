import express from 'express';
import {
    getAllSubmissions,
    approveSubmission,
    rejectSubmission,
    getAuditLogs
} from './controller.js';
import {
    createSurvey,
    updateSurvey,
    deleteSurvey,
    getSurvey
} from './surveyController.js';

const router = express.Router();

// Survey CRUD
router.post('/surveys', createSurvey);
router.get('/surveys/:id', getSurvey);
router.put('/surveys/:id', updateSurvey);
router.delete('/surveys/:id', deleteSurvey);

// Submissions
router.get('/submissions', getAllSubmissions);
router.post('/submissions/:id/approve', approveSubmission);
router.post('/submissions/:id/reject', rejectSubmission);
// Option management
import optionRoutes from './optionRoutes.js';
router.use('/', optionRoutes);

// Release management
import {
    createRelease,
    getReleases,
    updateRelease
} from './releaseController.js';

router.post('/surveys/:surveyId/releases', createRelease);
router.get('/surveys/:surveyId/releases', getReleases);
router.put('/releases/:id', updateRelease);

// Approval Dashboard
import {
    getApprovals,
    getApprovalDetails,
    approveParticipation,
    rejectParticipation
} from './approvalController.js';

router.get('/approvals', getApprovals);
router.get('/approvals/:id', getApprovalDetails);
router.post('/approvals/:id/approve', approveParticipation);
router.post('/approvals/:id/reject', rejectParticipation);

// Legacy/Redirects (optional, keeps API somewhat compatible if needed)
// router.get('/submissions', getApprovals);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
