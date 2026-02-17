import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireAdmin } from '../../middleware/auth.js';
import SlotController from './controller.js';

const router = express.Router();
let controllerInstance = null;

const getController = () => {
    if (!controllerInstance) {
        controllerInstance = new SlotController();
    }
    return controllerInstance;
};

// Admin routes - Slot management
/**
 * Create calendar slot
 * POST /api/v1/slots
 */
router.post(
    '/',
    authenticate,
    requireAdmin,
    (req, res, next) => getController().createSlot(req, res, next)
);

/**
 * Get all slots for a survey
 * GET /api/v1/surveys/:surveyId/slots
 */
router.get(
    '/surveys/:surveyId/slots',
    authenticate,
    requireAdmin,
    (req, res, next) => getController().getSlots(req, res, next)
);

/**
 * Update slot
 * PUT /api/v1/slots/:id
 */
router.put(
    '/:id',
    authenticate,
    requireAdmin,
    (req, res, next) => getController().updateSlot(req, res, next)
);

/**
 * Delete slot
 * DELETE /api/v1/slots/:id
 */
router.delete(
    '/:id',
    authenticate,
    requireAdmin,
    (req, res, next) => getController().deleteSlot(req, res, next)
);

// Student routes - Booking
/**
 * Get available slots for a survey
 * GET /api/v1/surveys/:surveyId/available-slots
 */
router.get(
    '/surveys/:surveyId/available-slots',
    authenticate,
    (req, res, next) => getController().getAvailableSlots(req, res, next)
);

/**
 * Hold a slot
 * POST /api/v1/slots/:id/hold
 */
router.post(
    '/:id/hold',
    authenticate,
    (req, res, next) => getController().holdSlot(req, res, next)
);

/**
 * Confirm booking
 * POST /api/v1/bookings/:id/confirm
 */
router.post(
    '/bookings/:id/confirm',
    authenticate,
    (req, res, next) => getController().confirmBooking(req, res, next)
);

/**
 * Cancel booking
 * POST /api/v1/bookings/:id/cancel
 */
router.post(
    '/bookings/:id/cancel',
    authenticate,
    (req, res, next) => getController().cancelBooking(req, res, next)
);

/**
 * Get user's bookings
 * GET /api/v1/my-bookings
 */
router.get(
    '/my-bookings',
    authenticate,
    (req, res, next) => getController().getMyBookings(req, res, next)
);

export default router;
