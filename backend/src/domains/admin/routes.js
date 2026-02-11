import express from 'express';
import {
    getAllSubmissions,
    approveSubmission,
    rejectSubmission,
    getAuditLogs
} from './controller.js';

const router = express.Router();

// Submissions
router.get('/submissions', getAllSubmissions);
router.post('/submissions/:id/approve', approveSubmission);
router.post('/submissions/:id/reject', rejectSubmission);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
