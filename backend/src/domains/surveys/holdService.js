import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { evaluateEligibility, buildUserContext } from '../../engines/eligibilityEngine.js';
import { setIsolationLevel, logCapacityState, handleDuplicateError, handleConstraintError } from '../../utils/transactionUtils.js';

/**
 * Hold Service
 * 
 * Manages seat holds with capacity enforcement and expiry.
 * All operations are transaction-safe with SELECT FOR UPDATE.
 * HARDENED: REPEATABLE READ isolation, defensive logging, constraint handling
 */
class HoldService {
    /**
     * Create seat holds for selected options
     * @param {string} surveyId - Survey ID
     * @param {string} userId - User ID
     * @param {string[]} selectedOptionIds - Option IDs to hold
     * @returns {object} Hold details with expiry
     */
    async createHolds(surveyId, userId, selectedOptionIds) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            // HARDENING: Set transaction isolation level
            await setIsolationLevel(connection, 'REPEATABLE READ');
            await connection.beginTransaction();

            // 1. Validate survey exists and is active
            const [surveys] = await connection.query(
                'SELECT id, title, type, status, config FROM surveys WHERE id = ?',
                [surveyId]
            );

            if (surveys.length === 0) {
                throw new Error('Survey not found');
            }

            const survey = surveys[0];

            if (survey.status !== 'ACTIVE') {
                throw new Error('Survey is not active');
            }

            // 2. Check eligibility
            const [users] = await connection.query(
                'SELECT id, email, role, metadata FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('User not found');
            }

            const user = users[0];
            const userContext = buildUserContext(user);

            const config = typeof survey.config === 'string'
                ? JSON.parse(survey.config)
                : (survey.config || {});

            const eligibilityRule = config.eligibility_rule || null;
            const eligibilityResult = evaluateEligibility(eligibilityRule, userContext);

            if (!eligibilityResult.eligible) {
                const error = new Error(eligibilityResult.reason);
                error.code = 'NOT_ELIGIBLE';
                throw error;
            }

            // 3. Validate options belong to survey
            const [options] = await connection.query(
                'SELECT id FROM survey_options WHERE id IN (?) AND survey_id = ?',
                [selectedOptionIds, surveyId]
            );

            if (options.length !== selectedOptionIds.length) {
                throw new Error('Invalid option IDs');
            }

            // 4. Check capacity and create holds
            const holds = [];
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

            for (const optionId of selectedOptionIds) {
                // HARDENING: Lock capacity row for update (prevents race conditions)
                const [capacity] = await connection.query(
                    `SELECT option_id, total_capacity, reserved_count, filled_count 
                     FROM option_capacity 
                     WHERE option_id = ? 
                     FOR UPDATE`,
                    [optionId]
                );

                if (capacity.length === 0) {
                    // No capacity record means unlimited capacity
                    logger.warn(`No capacity record for option ${optionId}, treating as unlimited`);
                } else {
                    const cap = capacity[0];

                    // HARDENING: Log capacity state (dev mode only)
                    logCapacityState('createHolds:before', cap);

                    // HARDENING: Recalculate available seats INSIDE transaction
                    const available = cap.total_capacity - (cap.reserved_count + cap.filled_count);

                    if (available <= 0) {
                        const error = new Error(`Option is at full capacity`);
                        error.code = 'CAPACITY_FULL';
                        error.optionId = optionId;
                        throw error;
                    }
                }

                // HARDENING: Create hold record (may fail on duplicate constraint)
                try {
                    const holdId = uuidv4();
                    await connection.query(
                        `INSERT INTO option_holds 
                         (id, option_id, user_id, release_id, status, expires_at, created_at)
                         VALUES (?, ?, ?, ?, 'ACTIVE', ?, NOW())`,
                        [holdId, optionId, userId, surveyId, expiresAt]
                    );

                    // Increment reserved_count
                    await connection.query(
                        `UPDATE option_capacity 
                         SET reserved_count = reserved_count + 1 
                         WHERE option_id = ?`,
                        [optionId]
                    );

                    // HARDENING: Log capacity state after update (dev mode only)
                    if (process.env.NODE_ENV !== 'production' && capacity.length > 0) {
                        const [updatedCap] = await connection.query(
                            'SELECT option_id, total_capacity, reserved_count, filled_count FROM option_capacity WHERE option_id = ?',
                            [optionId]
                        );
                        if (updatedCap.length > 0) {
                            logCapacityState('createHolds:after', updatedCap[0]);
                        }
                    }

                    holds.push({
                        holdId,
                        optionId,
                        expiresAt: expiresAt.toISOString()
                    });

                    // Audit log
                    await this.insertAuditLog(connection, {
                        userId,
                        action: 'SEAT_HELD',
                        resourceType: 'OPTION_HOLD',
                        resourceId: holdId,
                        details: {
                            surveyId,
                            optionId,
                            expiresAt: expiresAt.toISOString()
                        }
                    });
                } catch (error) {
                    // HARDENING: Handle duplicate hold constraint
                    throw handleDuplicateError(error, 'hold');
                }
            }

            await connection.commit();

            return {
                holds,
                expiresAt: expiresAt.toISOString(),
                expiresIn: 300 // seconds
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Hold creation failed:', error);

            // HARDENING: Handle constraint violations gracefully
            const formattedError = handleConstraintError(error);
            throw formattedError;
        } finally {
            connection.release();
        }
    }

    /**
     * Validate active holds exist for user and options
     * HARDENING: Uses FOR UPDATE to lock holds during validation
     * @param {object} connection - MySQL connection
     * @param {string} userId - User ID
     * @param {string[]} optionIds - Option IDs
     * @returns {boolean} True if valid holds exist
     */
    async validateHolds(connection, userId, optionIds) {
        // HARDENING: Lock holds for update to prevent expiry race condition
        const [holds] = await connection.query(
            `SELECT id, option_id FROM option_holds 
             WHERE user_id = ? 
             AND option_id IN (?) 
             AND status = 'ACTIVE' 
             AND expires_at > NOW()
             FOR UPDATE`,
            [userId, optionIds]
        );

        return holds.length === optionIds.length;
    }

    /**
     * Convert holds to confirmed selections
     * Called during submission
     * HARDENING: Atomic operation with proper locking order
     * @param {object} connection - MySQL connection
     * @param {string} userId - User ID
     * @param {string[]} optionIds - Option IDs
     */
    async confirmHolds(connection, userId, optionIds) {
        // HARDENING: Lock order - holds first, then capacity
        // 1. Get and lock hold IDs
        const [holds] = await connection.query(
            `SELECT id, option_id FROM option_holds 
             WHERE user_id = ? 
             AND option_id IN (?) 
             AND status = 'ACTIVE' 
             AND expires_at > NOW()
             FOR UPDATE`,
            [userId, optionIds]
        );

        if (holds.length !== optionIds.length) {
            const error = new Error('No valid holds found. Please select options again.');
            error.code = 'HOLD_EXPIRED';
            throw error;
        }

        // 2. Delete holds
        const holdIds = holds.map(h => h.id);
        await connection.query(
            `DELETE FROM option_holds WHERE id IN (?)`,
            [holdIds]
        );

        // 3. Update capacity: decrement reserved, increment filled
        // HARDENING: Use GREATEST to prevent negative values
        for (const hold of holds) {
            // HARDENING: Log before update (dev mode)
            if (process.env.NODE_ENV !== 'production') {
                const [cap] = await connection.query(
                    'SELECT option_id, total_capacity, reserved_count, filled_count FROM option_capacity WHERE option_id = ?',
                    [hold.option_id]
                );
                if (cap.length > 0) {
                    logCapacityState('confirmHolds:before', cap[0]);
                }
            }

            await connection.query(
                `UPDATE option_capacity 
                 SET reserved_count = GREATEST(0, reserved_count - 1),
                     filled_count = filled_count + 1
                 WHERE option_id = ?`,
                [hold.option_id]
            );

            // HARDENING: Log after update (dev mode)
            if (process.env.NODE_ENV !== 'production') {
                const [cap] = await connection.query(
                    'SELECT option_id, total_capacity, reserved_count, filled_count FROM option_capacity WHERE option_id = ?',
                    [hold.option_id]
                );
                if (cap.length > 0) {
                    logCapacityState('confirmHolds:after', cap[0]);
                }
            }

            // Audit log
            await this.insertAuditLog(connection, {
                userId,
                action: 'SEAT_CONFIRMED',
                resourceType: 'OPTION_HOLD',
                resourceId: hold.id,
                details: {
                    optionId: hold.option_id
                }
            });
        }
    }

    /**
     * Release holds (manual or on expiry)
     * @param {string[]} holdIds - Hold IDs to release
     */
    async releaseHolds(holdIds) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            // HARDENING: Set isolation level
            await setIsolationLevel(connection, 'REPEATABLE READ');
            await connection.beginTransaction();

            // Get hold details
            const [holds] = await connection.query(
                `SELECT id, option_id, user_id FROM option_holds WHERE id IN (?)`,
                [holdIds]
            );

            if (holds.length === 0) {
                await connection.commit();
                return;
            }

            // Delete holds
            await connection.query(
                `DELETE FROM option_holds WHERE id IN (?)`,
                [holdIds]
            );

            // HARDENING: Decrement reserved_count (never below zero)
            for (const hold of holds) {
                await connection.query(
                    `UPDATE option_capacity 
                     SET reserved_count = GREATEST(0, reserved_count - 1) 
                     WHERE option_id = ?`,
                    [hold.option_id]
                );

                // Audit log
                await this.insertAuditLog(connection, {
                    userId: hold.user_id,
                    action: 'SEAT_RELEASED',
                    resourceType: 'OPTION_HOLD',
                    resourceId: hold.id,
                    details: {
                        optionId: hold.option_id,
                        reason: 'Manual release'
                    }
                });
            }

            await connection.commit();

        } catch (error) {
            await connection.rollback();
            logger.error('Hold release failed:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Insert audit log entry
     * @param {object} connection - MySQL connection
     * @param {object} data - Audit data
     */
    async insertAuditLog(connection, data) {
        const auditId = uuidv4();
        await connection.query(
            `INSERT INTO audit_events
             (id, user_id, action, resource_type, resource_id, details, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                auditId,
                data.userId,
                data.action,
                data.resourceType,
                data.resourceId,
                JSON.stringify(data.details)
            ]
        );
    }
}

export default HoldService;
