import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../../db/mysqlClient.js';
import { NotFoundError, ConflictError, ValidationError } from '../../middleware/errorHandler.js';
import logger from '../../utils/logger.js';

/**
 * Slot Service
 * 
 * Manages calendar slot booking operations
 */
class SlotService {
    constructor(db = null) {
        this.db = db || getPool();
        this.HOLD_DURATION_MINUTES = 10;
    }

    /**
     * Create calendar slot
     */
    async createSlot(surveyId, slotData) {
        try {
            const { title, description, startTime, endTime, capacity, location, metadata } = slotData;

            // Validate survey exists
            const [survey] = await this.db.query('SELECT id FROM surveys WHERE id = ?', [surveyId]);
            if (!survey || survey.length === 0) {
                throw new NotFoundError('Survey not found');
            }

            // Validate time range
            const start = new Date(startTime);
            const end = new Date(endTime);

            if (start >= end) {
                throw new ValidationError('End time must be after start time');
            }

            if (start < new Date()) {
                throw new ValidationError('Start time must be in the future');
            }

            // Create slot
            const slotId = uuidv4();
            await this.db.query(`
                INSERT INTO calendar_slots 
                (id, survey_id, title, description, start_time, end_time, capacity, location, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [slotId, surveyId, title, description, startTime, endTime, capacity || 1, location, JSON.stringify(metadata || {})]);

            logger.info('Calendar slot created', { slotId, surveyId, startTime, endTime });

            return { id: slotId, ...slotData };
        } catch (error) {
            logger.error('Error creating slot:', error);
            throw error;
        }
    }

    /**
     * Get available slots for survey
     */
    async getAvailableSlots(surveyId, userId) {
        try {
            const [slots] = await this.db.query(`
                SELECT 
                    cs.*,
                    COUNT(DISTINCT CASE WHEN sb.status IN ('HELD', 'CONFIRMED') THEN sb.id END) as booked_count,
                    cs.capacity - COUNT(DISTINCT CASE WHEN sb.status IN ('HELD', 'CONFIRMED') THEN sb.id END) as available_capacity,
                    MAX(CASE WHEN sb.user_id = ? AND sb.status IN ('HELD', 'CONFIRMED') THEN sb.id END) as user_booking_id,
                    MAX(CASE WHEN sb.user_id = ? AND sb.status IN ('HELD', 'CONFIRMED') THEN sb.status END) as user_booking_status
                FROM calendar_slots cs
                LEFT JOIN slot_bookings sb ON cs.id = sb.slot_id 
                    AND sb.status IN ('HELD', 'CONFIRMED')
                    AND (sb.status = 'CONFIRMED' OR sb.held_until > NOW())
                WHERE cs.survey_id = ?
                    AND cs.start_time > NOW()
                GROUP BY cs.id
                ORDER BY cs.start_time ASC
            `, [userId, userId, surveyId]);

            return slots.map(slot => ({
                ...slot,
                metadata: slot.metadata ? JSON.parse(slot.metadata) : {},
                booked_count: parseInt(slot.booked_count),
                available_capacity: parseInt(slot.available_capacity),
                is_full: parseInt(slot.available_capacity) <= 0,
                user_has_booking: !!slot.user_booking_id
            }));
        } catch (error) {
            logger.error('Error getting available slots:', error);
            throw error;
        }
    }

    /**
     * Hold slot (temporary reservation)
     */
    async holdSlot(slotId, userId) {
        try {
            // Check if slot exists
            const [slot] = await this.db.query('SELECT * FROM calendar_slots WHERE id = ?', [slotId]);
            if (!slot || slot.length === 0) {
                throw new NotFoundError('Slot not found');
            }

            // Check if slot is in the future
            if (new Date(slot[0].start_time) < new Date()) {
                throw new ValidationError('Cannot book past slots');
            }

            // Check for duplicate booking
            const [existing] = await this.db.query(`
                SELECT id FROM slot_bookings
                WHERE user_id = ? AND slot_id = ?
                    AND status IN ('HELD', 'CONFIRMED')
                    AND (status = 'CONFIRMED' OR held_until > NOW())
            `, [userId, slotId]);

            if (existing && existing.length > 0) {
                throw new ConflictError('You already have a booking for this slot');
            }

            // Check for time conflicts
            const hasConflict = await this.checkTimeConflict(userId, slot[0].start_time, slot[0].end_time);
            if (hasConflict) {
                throw new ConflictError('You have another booking at this time');
            }

            // Check capacity
            const [capacity] = await this.db.query(`
                SELECT 
                    cs.capacity,
                    COUNT(DISTINCT sb.id) as booked_count
                FROM calendar_slots cs
                LEFT JOIN slot_bookings sb ON cs.id = sb.slot_id 
                    AND sb.status IN ('HELD', 'CONFIRMED')
                    AND (sb.status = 'CONFIRMED' OR sb.held_until > NOW())
                WHERE cs.id = ?
                GROUP BY cs.id, cs.capacity
            `, [slotId]);

            if (capacity[0].booked_count >= capacity[0].capacity) {
                throw new ConflictError('Slot is full');
            }

            // Create hold
            const bookingId = uuidv4();
            const heldUntil = new Date(Date.now() + this.HOLD_DURATION_MINUTES * 60 * 1000);

            await this.db.query(`
                INSERT INTO slot_bookings 
                (id, slot_id, user_id, status, held_until)
                VALUES (?, ?, ?, 'HELD', ?)
            `, [bookingId, slotId, userId, heldUntil]);

            logger.info('Slot held', { bookingId, slotId, userId, heldUntil });

            return {
                id: bookingId,
                slot_id: slotId,
                held_until: heldUntil,
                slot_details: slot[0]
            };
        } catch (error) {
            logger.error('Error holding slot:', error);
            throw error;
        }
    }

    /**
     * Confirm booking
     */
    async confirmBooking(bookingId, userId, submissionId = null) {
        try {
            // Get booking
            const [booking] = await this.db.query(`
                SELECT * FROM slot_bookings
                WHERE id = ? AND user_id = ?
            `, [bookingId, userId]);

            if (!booking || booking.length === 0) {
                throw new NotFoundError('Booking not found');
            }

            if (booking[0].status !== 'HELD') {
                throw new ValidationError('Booking is not in HELD status');
            }

            // Check if hold expired
            if (new Date(booking[0].held_until) < new Date()) {
                throw new ValidationError('Hold has expired');
            }

            // Confirm booking
            await this.db.query(`
                UPDATE slot_bookings
                SET status = 'CONFIRMED',
                    confirmed_at = NOW(),
                    submission_id = ?,
                    held_until = NULL
                WHERE id = ?
            `, [submissionId, bookingId]);

            logger.info('Booking confirmed', { bookingId, userId, submissionId });

            return { id: bookingId, status: 'CONFIRMED' };
        } catch (error) {
            logger.error('Error confirming booking:', error);
            throw error;
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId, userId, reason = '') {
        try {
            // Get booking
            const [booking] = await this.db.query(`
                SELECT * FROM slot_bookings
                WHERE id = ? AND user_id = ?
            `, [bookingId, userId]);

            if (!booking || booking.length === 0) {
                throw new NotFoundError('Booking not found');
            }

            if (booking[0].status === 'CANCELLED') {
                throw new ValidationError('Booking already cancelled');
            }

            // Cancel booking
            await this.db.query(`
                UPDATE slot_bookings
                SET status = 'CANCELLED',
                    cancelled_at = NOW(),
                    cancellation_reason = ?
                WHERE id = ?
            `, [reason, bookingId]);

            logger.info('Booking cancelled', { bookingId, userId, reason });

            return { id: bookingId, status: 'CANCELLED' };
        } catch (error) {
            logger.error('Error cancelling booking:', error);
            throw error;
        }
    }

    /**
     * Get user bookings
     */
    async getUserBookings(userId) {
        try {
            const [bookings] = await this.db.query(`
                SELECT 
                    sb.*,
                    cs.title as slot_title,
                    cs.start_time,
                    cs.end_time,
                    cs.location,
                    cs.metadata,
                    s.title as survey_title
                FROM slot_bookings sb
                JOIN calendar_slots cs ON sb.slot_id = cs.id
                JOIN surveys s ON cs.survey_id = s.id
                WHERE sb.user_id = ?
                    AND sb.status IN ('HELD', 'CONFIRMED')
                    AND (sb.status = 'CONFIRMED' OR sb.held_until > NOW())
                ORDER BY cs.start_time ASC
            `, [userId]);

            return bookings.map(b => ({
                ...b,
                metadata: b.metadata ? JSON.parse(b.metadata) : {}
            }));
        } catch (error) {
            logger.error('Error getting user bookings:', error);
            throw error;
        }
    }

    /**
     * Check for time conflicts
     */
    async checkTimeConflict(userId, startTime, endTime) {
        try {
            const [conflicts] = await this.db.query(`
                SELECT sb.id
                FROM slot_bookings sb
                JOIN calendar_slots cs ON sb.slot_id = cs.id
                WHERE sb.user_id = ?
                    AND sb.status IN ('HELD', 'CONFIRMED')
                    AND (sb.status = 'CONFIRMED' OR sb.held_until > NOW())
                    AND (
                        (cs.start_time < ? AND cs.end_time > ?)
                        OR (cs.start_time < ? AND cs.end_time > ?)
                        OR (cs.start_time >= ? AND cs.end_time <= ?)
                    )
            `, [userId, endTime, startTime, endTime, startTime, startTime, endTime]);

            return conflicts.length > 0;
        } catch (error) {
            logger.error('Error checking time conflict:', error);
            throw error;
        }
    }

    /**
     * Cleanup expired holds
     */
    async cleanupExpiredHolds() {
        try {
            const [result] = await this.db.query(`
                DELETE FROM slot_bookings
                WHERE status = 'HELD'
                    AND held_until < NOW()
            `);

            if (result.affectedRows > 0) {
                logger.info(`Cleaned up ${result.affectedRows} expired slot holds`);
            }

            return result.affectedRows;
        } catch (error) {
            logger.error('Error cleaning up expired holds:', error);
            throw error;
        }
    }

    /**
     * Get slots for survey (admin)
     */
    async getSlotsForSurvey(surveyId) {
        try {
            const [slots] = await this.db.query(`
                SELECT 
                    cs.*,
                    COUNT(DISTINCT CASE WHEN sb.status = 'CONFIRMED' THEN sb.id END) as confirmed_count,
                    COUNT(DISTINCT CASE WHEN sb.status = 'HELD' AND sb.held_until > NOW() THEN sb.id END) as held_count
                FROM calendar_slots cs
                LEFT JOIN slot_bookings sb ON cs.id = sb.slot_id
                WHERE cs.survey_id = ?
                GROUP BY cs.id
                ORDER BY cs.start_time ASC
            `, [surveyId]);

            return slots.map(slot => ({
                ...slot,
                metadata: slot.metadata ? JSON.parse(slot.metadata) : {},
                confirmed_count: parseInt(slot.confirmed_count),
                held_count: parseInt(slot.held_count),
                available_capacity: slot.capacity - parseInt(slot.confirmed_count) - parseInt(slot.held_count)
            }));
        } catch (error) {
            logger.error('Error getting slots for survey:', error);
            throw error;
        }
    }

    /**
     * Update slot
     */
    async updateSlot(slotId, updates) {
        try {
            const { title, description, startTime, endTime, capacity, location, metadata } = updates;

            await this.db.query(`
                UPDATE calendar_slots
                SET title = COALESCE(?, title),
                    description = COALESCE(?, description),
                    start_time = COALESCE(?, start_time),
                    end_time = COALESCE(?, end_time),
                    capacity = COALESCE(?, capacity),
                    location = COALESCE(?, location),
                    metadata = COALESCE(?, metadata)
                WHERE id = ?
            `, [title, description, startTime, endTime, capacity, location, JSON.stringify(metadata), slotId]);

            logger.info('Slot updated', { slotId });

            return { id: slotId };
        } catch (error) {
            logger.error('Error updating slot:', error);
            throw error;
        }
    }

    /**
     * Delete slot
     */
    async deleteSlot(slotId) {
        try {
            // Check for confirmed bookings
            const [bookings] = await this.db.query(`
                SELECT COUNT(*) as count
                FROM slot_bookings
                WHERE slot_id = ? AND status = 'CONFIRMED'
            `, [slotId]);

            if (bookings[0].count > 0) {
                throw new ConflictError('Cannot delete slot with confirmed bookings');
            }

            await this.db.query('DELETE FROM calendar_slots WHERE id = ?', [slotId]);

            logger.info('Slot deleted', { slotId });

            return { id: slotId };
        } catch (error) {
            logger.error('Error deleting slot:', error);
            throw error;
        }
    }
}

export default SlotService;
