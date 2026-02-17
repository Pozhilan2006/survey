import SlotService from './service.js';
import logger from '../../utils/logger.js';

/**
 * Slot Controller
 * 
 * Handles HTTP requests for calendar slot operations
 */
class SlotController {
    constructor(db = null) {
        this.service = new SlotService(db);
    }

    /**
     * Create calendar slot (Admin)
     * POST /api/v1/slots
     */
    async createSlot(req, res, next) {
        try {
            const { surveyId, title, description, startTime, endTime, capacity, location, metadata } = req.body;

            if (!surveyId || !title || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: surveyId, title, startTime, endTime'
                });
            }

            const slot = await this.service.createSlot(surveyId, {
                title,
                description,
                startTime,
                endTime,
                capacity,
                location,
                metadata
            });

            res.status(201).json({
                success: true,
                message: 'Slot created successfully',
                data: slot
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get slots for survey (Admin)
     * GET /api/v1/surveys/:surveyId/slots
     */
    async getSlots(req, res, next) {
        try {
            const { surveyId } = req.params;

            const slots = await this.service.getSlotsForSurvey(surveyId);

            res.json({
                success: true,
                data: slots
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update slot (Admin)
     * PUT /api/v1/slots/:id
     */
    async updateSlot(req, res, next) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const slot = await this.service.updateSlot(id, updates);

            res.json({
                success: true,
                message: 'Slot updated successfully',
                data: slot
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete slot (Admin)
     * DELETE /api/v1/slots/:id
     */
    async deleteSlot(req, res, next) {
        try {
            const { id } = req.params;

            await this.service.deleteSlot(id);

            res.json({
                success: true,
                message: 'Slot deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get available slots (Student)
     * GET /api/v1/surveys/:surveyId/available-slots
     */
    async getAvailableSlots(req, res, next) {
        try {
            const { surveyId } = req.params;
            const userId = req.user.id;

            const slots = await this.service.getAvailableSlots(surveyId, userId);

            res.json({
                success: true,
                data: slots
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Hold slot (Student)
     * POST /api/v1/slots/:id/hold
     */
    async holdSlot(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const booking = await this.service.holdSlot(id, userId);

            res.json({
                success: true,
                message: 'Slot held successfully',
                data: booking
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Confirm booking (Student)
     * POST /api/v1/bookings/:id/confirm
     */
    async confirmBooking(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { submissionId } = req.body;

            const booking = await this.service.confirmBooking(id, userId, submissionId);

            res.json({
                success: true,
                message: 'Booking confirmed successfully',
                data: booking
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel booking (Student)
     * POST /api/v1/bookings/:id/cancel
     */
    async cancelBooking(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { reason } = req.body;

            const booking = await this.service.cancelBooking(id, userId, reason);

            res.json({
                success: true,
                message: 'Booking cancelled successfully',
                data: booking
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user bookings (Student)
     * GET /api/v1/my-bookings
     */
    async getMyBookings(req, res, next) {
        try {
            const userId = req.user.id;

            const bookings = await this.service.getUserBookings(userId);

            res.json({
                success: true,
                data: bookings
            });
        } catch (error) {
            next(error);
        }
    }
}

export default SlotController;
