import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validator.js';
import { body, param } from 'express-validator';
import ParticipationController from './controller.js';
import { getPool } from '../../config/database.js';

const router = express.Router();

// ✅ Create controller instance lazily (when first route is hit)
// This avoids calling getPool() at module load time
let controller;
function getController() {
    if (!controller) {
        const db = getPool(); // Will throw if DB not initialized, which is correct
        controller = new ParticipationController(db);
    }
    return controller;
}

/**
 * Check eligibility for a release
 * GET /api/v1/participation/releases/:releaseId/eligibility
 */
router.get(
    '/releases/:releaseId/eligibility',
    authenticate,
    param('releaseId').isUUID(),
    validate,
    (req, res, next) => getController().checkEligibility(req, res, next)
);

/**
 * Start participation (create participation record)
 * POST /api/v1/participation/releases/:releaseId/participate
 */
router.post(
    '/releases/:releaseId/participate',
    authenticate,
    param('releaseId').isUUID(),
    validate,
    (req, res, next) => getController().startParticipation(req, res, next)
);

/**
 * Get participation details
 * GET /api/v1/participation/:participationId
 */
router.get(
    '/:participationId',
    authenticate,
    param('participationId').isUUID(),
    validate,
    (req, res, next) => getController().getParticipation(req, res, next)
);

/**
 * Hold a seat
 * POST /api/v1/participation/:participationId/hold
 */
router.post(
    '/:participationId/hold',
    authenticate,
    param('participationId').isUUID(),
    body('optionId').isUUID(),
    validate,
    (req, res, next) => getController().holdSeat(req, res, next)
);

/**
 * Release a hold
 * DELETE /api/v1/participation/:participationId/hold
 */
router.delete(
    '/:participationId/hold',
    authenticate,
    param('participationId').isUUID(),
    validate,
    (req, res, next) => getController().releaseHold(req, res, next)
);

/**
 * Submit survey
 * POST /api/v1/participation/:participationId/submit
 */
router.post(
    '/:participationId/submit',
    authenticate,
    param('participationId').isUUID(),
    body('selections').isArray(),
    body('selections.*.optionId').isUUID(),
    validate,
    (req, res, next) => getController().submitSurvey(req, res, next)
);

/**
 * Get user's participations
 * GET /api/v1/participation/user/me
 */
router.get(
    '/user/me',
    authenticate,
    (req, res, next) => getController().getUserParticipations(req, res, next)
);

export default router;
