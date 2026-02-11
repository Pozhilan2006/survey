import { StateMachine } from '../index.js';
import { PARTICIPATION_STATES, SEAT_HOLD_DURATION_MINUTES } from '../../../config/constants.js';
import logger from '../../../utils/logger.js';

/**
 * Participation State Machine
 * 
 * Manages the lifecycle of survey participation from eligibility
 * through submission, approval, and allocation.
 */
class ParticipationStateMachineClass extends StateMachine {
    constructor() {
        super({
            entityType: 'PARTICIPATION',
            initialState: PARTICIPATION_STATES.ELIGIBLE,

            states: [
                PARTICIPATION_STATES.ELIGIBLE,
                PARTICIPATION_STATES.INELIGIBLE,
                PARTICIPATION_STATES.VIEWING,
                PARTICIPATION_STATES.HOLD_ACTIVE,
                PARTICIPATION_STATES.SUBMITTED,
                PARTICIPATION_STATES.PENDING_APPROVAL,
                PARTICIPATION_STATES.APPROVED,
                PARTICIPATION_STATES.REJECTED,
                PARTICIPATION_STATES.ALLOCATED,
                PARTICIPATION_STATES.WAITLISTED
            ],

            transitions: [
                // ELIGIBLE -> VIEWING (user starts viewing survey)
                {
                    from: PARTICIPATION_STATES.ELIGIBLE,
                    to: PARTICIPATION_STATES.VIEWING,
                    guard: (ctx) => ({ allowed: true }),
                    before: async (entity, ctx, db) => {
                        logger.debug(`User ${ctx.userId} started viewing survey`);
                    }
                },

                // ELIGIBLE -> INELIGIBLE (eligibility check fails)
                {
                    from: PARTICIPATION_STATES.ELIGIBLE,
                    to: PARTICIPATION_STATES.INELIGIBLE,
                    guard: (ctx) => ({ allowed: true })
                },

                // VIEWING -> HOLD_ACTIVE (user selects option and holds seat)
                {
                    from: PARTICIPATION_STATES.VIEWING,
                    to: PARTICIPATION_STATES.HOLD_ACTIVE,
                    guard: (ctx) => {
                        if (!ctx.capacityAvailable) {
                            return {
                                allowed: false,
                                reason: 'No capacity available'
                            };
                        }
                        return { allowed: true };
                    },
                    before: async (entity, ctx, db) => {
                        // Create hold record
                        const expiresAt = new Date(
                            Date.now() + SEAT_HOLD_DURATION_MINUTES * 60 * 1000
                        );

                        // Using UUIDv4 for ID should be handled by caller or DB default? 
                        // Note: option_holds schema has id CHAR(36).
                        // Since this is inside state machine, and previously it used INSERT without ID? 
                        // Postgres might have had default gen_random_uuid().
                        // MySQL has no such default for CHAR(36).
                        // I need to generate UUID.
                        // But I don't have uuid imported here. 
                        // I should import it.
                        // Wait, I can use a subquery UUID() if MySQL 8 has it, but standard is output to string.
                        // I will assume the db client or caller handles it OR import uuid.
                        // Let's import uuid. I'll add the import at the top.
                        // But write_to_file overwrites the file. I will add the import.

                        const id = crypto.randomUUID(); // Node 19+ or polyfill. uuid package is safer.
                        // I will rely on importing 'uuid' at top of file. I'll add imports.

                        await db.query(
                            `INSERT INTO option_holds 
               (id, participation_id, option_id, release_id, quota_bucket_id, expires_at)
               VALUES (UUID(), ?, ?, ?, ?, ?)`, // MySQL 8.0 support UUID(). Or use JS UUID.
                            [
                                entity.id,
                                ctx.optionId,
                                ctx.releaseId,
                                ctx.quotaBucketId || null,
                                expiresAt
                            ]
                        );

                        // Increment held count
                        if (ctx.quotaBucketId) {
                            await db.query(
                                `UPDATE option_quota_buckets 
                 SET current_held = current_held + 1
                 WHERE id = ?`,
                                [ctx.quotaBucketId]
                            );
                        }

                        await db.query(
                            `UPDATE option_capacity 
               SET current_held = current_held + 1
               WHERE release_id = ? AND option_id = ?`,
                            [ctx.releaseId, ctx.optionId]
                        );

                        logger.info(`Seat held for participation ${entity.id}, expires at ${expiresAt}`);
                    }
                },

                // HOLD_ACTIVE -> VIEWING (user releases hold)
                {
                    from: PARTICIPATION_STATES.HOLD_ACTIVE,
                    to: PARTICIPATION_STATES.VIEWING,
                    before: async (entity, ctx, db) => {
                        // 1. Get info before releasing
                        const [holds] = await db.query(
                            `SELECT quota_bucket_id, option_id, release_id 
                             FROM option_holds 
                             WHERE participation_id = ? AND status = 'ACTIVE'
                             FOR UPDATE`,
                            [entity.id]
                        );

                        if (holds.length > 0) {
                            const hold = holds[0];

                            // 2. Release hold
                            await db.query(
                                `UPDATE option_holds 
                   SET status = 'RELEASED', released_at = NOW()
                   WHERE participation_id = ? AND status = 'ACTIVE'`,
                                [entity.id]
                            );

                            // Decrement held count
                            await db.query(
                                `UPDATE option_capacity 
                   SET current_held = GREATEST(0, current_held - 1)
                   WHERE release_id = ? AND option_id = ?`,
                                [ctx.releaseId, ctx.optionId]
                            );

                            if (ctx.quotaBucketId) {
                                await db.query(
                                    `UPDATE option_quota_buckets 
                     SET current_held = GREATEST(0, current_held - 1)
                     WHERE id = ?`,
                                    [ctx.quotaBucketId]
                                );
                            }
                        }

                        logger.info(`Hold released for participation ${entity.id}`);
                    }
                },

                // HOLD_ACTIVE -> SUBMITTED (user submits survey)
                {
                    from: PARTICIPATION_STATES.HOLD_ACTIVE,
                    to: PARTICIPATION_STATES.SUBMITTED,
                    guard: (ctx) => {
                        if (!ctx.selections || ctx.selections.length === 0) {
                            return {
                                allowed: false,
                                reason: 'No selections provided'
                            };
                        }
                        return { allowed: true };
                    },
                    before: async (entity, ctx, db) => {
                        // 1. Get info before converting
                        const [holds] = await db.query(
                            `SELECT option_id, release_id, quota_bucket_id
                             FROM option_holds 
                             WHERE participation_id = ? AND status = 'ACTIVE'
                             FOR UPDATE`,
                            [entity.id]
                        );

                        if (holds.length > 0) {
                            const hold = holds[0];

                            // 2. Convert hold to filled
                            await db.query(
                                `UPDATE option_holds 
                   SET status = 'CONVERTED', released_at = NOW()
                   WHERE participation_id = ? AND status = 'ACTIVE'`,
                                [entity.id]
                            );

                            // Update capacity counts
                            await db.query(
                                `UPDATE option_capacity 
                 SET current_held = GREATEST(0, current_held - 1),
                     current_filled = current_filled + 1
                 WHERE release_id = ? AND option_id = ?`,
                                [hold.release_id, hold.option_id]
                            );

                            if (hold.quota_bucket_id) {
                                await db.query(
                                    `UPDATE option_quota_buckets 
                   SET current_held = GREATEST(0, current_held - 1),
                       current_filled = current_filled + 1
                   WHERE id = ?`,
                                    [hold.quota_bucket_id]
                                );
                            }
                        }

                        // Save selections
                        for (const selection of ctx.selections) {
                            await db.query(
                                `INSERT INTO survey_selections 
                 (id, participation_id, option_id, rank_order)
                 VALUES (UUID(), ?, ?, ?)`,
                                [entity.id, selection.optionId, selection.rank || null]
                            );
                        }

                        // Save answers if provided
                        if (ctx.answers) {
                            for (const [key, value] of Object.entries(ctx.answers)) {
                                await db.query(
                                    `INSERT INTO survey_answers 
                   (id, participation_id, question_key, answer_value)
                   VALUES (UUID(), ?, ?, ?)`,
                                    [entity.id, key, JSON.stringify(value)]
                                );
                            }
                        }

                        // Update submitted_at timestamp
                        await db.query(
                            `UPDATE survey_participation 
               SET submitted_at = NOW()
               WHERE id = ?`,
                            [entity.id]
                        );

                        logger.info(`Survey submitted for participation ${entity.id}`);
                    }
                },

                // SUBMITTED -> PENDING_APPROVAL (requires approval)
                {
                    from: PARTICIPATION_STATES.SUBMITTED,
                    to: PARTICIPATION_STATES.PENDING_APPROVAL,
                    guard: (ctx) => {
                        if (!ctx.requiresApproval) {
                            return {
                                allowed: false,
                                reason: 'No approval required'
                            };
                        }
                        return { allowed: true };
                    },
                    before: async (entity, ctx, db) => {
                        // Create approval item
                        if (ctx.workflowId) {
                            await db.query(
                                `INSERT INTO approval_items 
                 (id, workflow_id, entity_type, entity_id)
                 VALUES (UUID(), ?, ?, ?)`,
                                [ctx.workflowId, 'PARTICIPATION', entity.id]
                            );
                        }
                    }
                },

                // SUBMITTED -> APPROVED (no approval required)
                {
                    from: PARTICIPATION_STATES.SUBMITTED,
                    to: PARTICIPATION_STATES.APPROVED,
                    guard: (ctx) => {
                        if (ctx.requiresApproval) {
                            return {
                                allowed: false,
                                reason: 'Approval workflow exists'
                            };
                        }
                        return { allowed: true };
                    },
                    after: async (entity, ctx, db) => {
                        // Update approved_at timestamp
                        await db.query(
                            `UPDATE survey_participation 
               SET approved_at = NOW()
               WHERE id = ?`,
                            [entity.id]
                        );
                    }
                },

                // PENDING_APPROVAL -> APPROVED (approval granted)
                {
                    from: PARTICIPATION_STATES.PENDING_APPROVAL,
                    to: PARTICIPATION_STATES.APPROVED,
                    guard: (ctx) => {
                        if (!ctx.allApprovalsMet) {
                            return {
                                allowed: false,
                                reason: 'Not all approvals completed'
                            };
                        }
                        return { allowed: true };
                    },
                    after: async (entity, ctx, db) => {
                        await db.query(
                            `UPDATE survey_participation 
               SET approved_at = NOW()
               WHERE id = ?`,
                            [entity.id]
                        );
                    }
                },

                // PENDING_APPROVAL -> REJECTED (approval denied)
                {
                    from: PARTICIPATION_STATES.PENDING_APPROVAL,
                    to: PARTICIPATION_STATES.REJECTED,
                    before: async (entity, ctx, db) => {
                        // Release capacity
                        const [selections] = await db.query(
                            `SELECT option_id FROM survey_selections 
               WHERE participation_id = ?`,
                            [entity.id]
                        );

                        for (const sel of selections) {
                            await db.query(
                                `UPDATE option_capacity 
                 SET current_filled = GREATEST(0, current_filled - 1)
                 WHERE release_id = ? AND option_id = ?`,
                                [ctx.releaseId, sel.option_id]
                            );
                        }
                    }
                },

                // APPROVED -> ALLOCATED (allocation complete)
                {
                    from: PARTICIPATION_STATES.APPROVED,
                    to: PARTICIPATION_STATES.ALLOCATED,
                    guard: (ctx) => {
                        if (!ctx.allocationComplete) {
                            return {
                                allowed: false,
                                reason: 'Allocation not yet run'
                            };
                        }
                        return { allowed: true };
                    },
                    after: async (entity, ctx, db) => {
                        await db.query(
                            `UPDATE survey_participation 
               SET allocated_at = NOW()
               WHERE id = ?`,
                            [entity.id]
                        );
                    }
                },

                // APPROVED -> WAITLISTED (no allocation available)
                {
                    from: PARTICIPATION_STATES.APPROVED,
                    to: PARTICIPATION_STATES.WAITLISTED,
                    guard: (ctx) => ({ allowed: true })
                }
            ]
        });
    }

    /**
     * Update participation state in database
     */
    async updateEntityState(entity, newState, db) {
        await db.query(
            `UPDATE survey_participation 
       SET state = ?, state_updated_at = NOW()
       WHERE id = ?`,
            [newState, entity.id]
        );

        // Helper fetch to return updated entity (PostgreSQL had RETURNING *)
        const [rows] = await db.query(
            `SELECT * FROM survey_participation WHERE id = ?`,
            [entity.id]
        );

        if (rows.length === 0) {
            throw new Error(`Participation not found: ${entity.id}`);
        }

        return rows[0];
    }
}

// Export singleton instance
export const ParticipationStateMachine = new ParticipationStateMachineClass();

export default ParticipationStateMachine;
