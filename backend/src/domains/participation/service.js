import ParticipationRepository from './repository.js';
import { EligibilityEngine } from '../../engines/eligibility/index.js';
import { ParticipationStateMachine } from '../../engines/stateMachine/definitions/participation.js';
import { withTransaction, acquireLock, releaseLock } from '../../utils/transaction.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../middleware/errorHandler.js';
import { PARTICIPATION_STATES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Participation Service
 * 
 * Business logic for survey participation
 */
class ParticipationService {
    constructor(db) {
        this.db = db;
        this.repository = new ParticipationRepository(db);
        this.eligibilityEngine = new EligibilityEngine(db);
    }

    /**
     * Check eligibility for a release
     */
    async checkEligibility(userId, releaseId) {
        return await this.eligibilityEngine.evaluate(userId, releaseId);
    }

    /**
     * Start participation (create participation record and transition to VIEWING)
     */
    async startParticipation(userId, releaseId) {
        return await withTransaction(async (connection) => {
            // Check if participation already exists
            const existing = await this.repository.findByUserAndRelease(
                userId,
                releaseId,
                connection
            );

            if (existing) {
                // If already exists, just return it
                return existing;
            }

            // Check eligibility
            const eligibility = await this.eligibilityEngine.evaluate(userId, releaseId);

            if (eligibility.decision === 'DENY') {
                throw new ForbiddenError(eligibility.reason);
            }

            // Create participation record
            const participation = await this.repository.create({
                releaseId,
                userId,
                state: PARTICIPATION_STATES.ELIGIBLE,
                eligibilityResult: eligibility
            }, connection);

            // Transition to VIEWING state
            const updated = await ParticipationStateMachine.executeTransition(
                participation,
                PARTICIPATION_STATES.VIEWING,
                { userId },
                connection
            );

            return updated;
        });
    }

    /**
     * Get participation by ID
     */
    async getParticipation(participationId, userId) {
        const participation = await this.repository.findById(participationId);

        if (!participation) {
            throw new NotFoundError('Participation not found');
        }

        // Verify user owns this participation
        if (participation.user_id !== userId) {
            throw new ForbiddenError('Access denied');
        }

        return participation;
    }

    /**
     * Hold a seat
     */
    async holdSeat(participationId, optionId, userId) {
        return await withTransaction(async (connection) => {
            // Get participation
            const participation = await this.repository.findById(participationId, connection);

            if (!participation) {
                throw new NotFoundError('Participation not found');
            }

            if (participation.user_id !== userId) {
                throw new ForbiddenError('Access denied');
            }

            // Acquire lock on option to prevent race conditions
            const lockKey = `option_${optionId}`;
            await acquireLock(connection, lockKey);

            try {
                // Check capacity
                const capacity = await this.checkCapacity(
                    connection,
                    participation.release_id,
                    optionId,
                    userId
                );

                if (!capacity.available) {
                    throw new ConflictError('No capacity available');
                }

                // Execute state transition (this will create hold and update capacity)
                const updated = await ParticipationStateMachine.executeTransition(
                    participation,
                    PARTICIPATION_STATES.HOLD_ACTIVE,
                    {
                        userId,
                        optionId,
                        releaseId: participation.release_id,
                        capacityAvailable: true,
                        quotaBucketId: capacity.quotaBucketId
                    },
                    connection
                );

                // Get the created hold
                const [holds] = await connection.query(
                    `SELECT * FROM option_holds 
             WHERE participation_id = ? AND status = 'ACTIVE'
             ORDER BY created_at DESC LIMIT 1`,
                    [participationId]
                );

                return {
                    participation: updated,
                    hold: holds[0]
                };
            } finally {
                // Explicitly release lock because MySQL locks are session scoped
                await releaseLock(connection, lockKey);
            }
        });
    }

    /**
     * Release a hold
     */
    async releaseHold(participationId, userId) {
        return await withTransaction(async (connection) => {
            const participation = await this.repository.findById(participationId, connection);

            if (!participation) {
                throw new NotFoundError('Participation not found');
            }

            if (participation.user_id !== userId) {
                throw new ForbiddenError('Access denied');
            }

            // Get active hold
            const [holds] = await connection.query(
                `SELECT * FROM option_holds 
         WHERE participation_id = ? AND status = 'ACTIVE'`,
                [participationId]
            );

            if (holds.length === 0) {
                throw new NotFoundError('No active hold found');
            }

            const hold = holds[0];

            // Execute state transition (this will release hold and update capacity)
            const updated = await ParticipationStateMachine.executeTransition(
                participation,
                PARTICIPATION_STATES.VIEWING,
                {
                    userId,
                    optionId: hold.option_id,
                    releaseId: participation.release_id,
                    quotaBucketId: hold.quota_bucket_id
                },
                connection
            );

            return updated;
        });
    }

    /**
     * Submit survey
     */
    async submitSurvey(participationId, selections, answers, userId) {
        return await withTransaction(async (connection) => {
            const participation = await this.repository.findById(participationId, connection);

            if (!participation) {
                throw new NotFoundError('Participation not found');
            }

            if (participation.user_id !== userId) {
                throw new ForbiddenError('Access denied');
            }

            // Check if approval is required
            const requiresApproval = await this.checkApprovalRequired(
                participation.release_id,
                connection
            );

            // Execute state transition (this will save selections and convert hold to filled)
            const updated = await ParticipationStateMachine.executeTransition(
                participation,
                PARTICIPATION_STATES.SUBMITTED,
                {
                    userId,
                    selections,
                    answers,
                    releaseId: participation.release_id
                },
                connection
            );

            // If approval required, transition to PENDING_APPROVAL
            if (requiresApproval.required) {
                const withApproval = await ParticipationStateMachine.executeTransition(
                    updated,
                    PARTICIPATION_STATES.PENDING_APPROVAL,
                    {
                        userId,
                        requiresApproval: true,
                        workflowId: requiresApproval.workflowId
                    },
                    connection
                );
                return withApproval;
            } else {
                // Otherwise, transition directly to APPROVED
                const approved = await ParticipationStateMachine.executeTransition(
                    updated,
                    PARTICIPATION_STATES.APPROVED,
                    {
                        userId,
                        requiresApproval: false
                    },
                    connection
                );
                return approved;
            }
        });
    }

    /**
     * Get user's participations
     */
    async getUserParticipations(userId) {
        return await this.repository.findByUser(userId);
    }

    /**
     * Check capacity availability
     */
    async checkCapacity(connection, releaseId, optionId, userId) {
        // Get user's groups
        const [userGroups] = await connection.query(
            `SELECT g.id FROM \`groups\` g
       JOIN group_members gm ON g.id = gm.group_id
       JOIN users u ON u.id = gm.user_id
       WHERE u.id = ?`,
            [userId]
        );

        const groupIds = userGroups.map(r => r.id);

        if (groupIds.length > 0) {
            // Check quota bucket availability
            const [quotaCheck] = await connection.query(
                `SELECT qb.*, (qb.capacity - qb.filled) as available
         FROM option_quota_buckets qb
         JOIN option_capacity oc ON oc.id = qb.capacity_id
         WHERE oc.release_id = ? 
           AND oc.option_id = ?
           AND qb.rule_key IN (?)
         ORDER BY available DESC
         LIMIT 1`,
                [releaseId, optionId, groupIds] // mysql2 expands array in IN (?)
            );

            if (quotaCheck.length > 0 && quotaCheck[0].available > 0) {
                return {
                    available: true,
                    quotaBucketId: quotaCheck[0].id
                };
            }
        }

        // Check overall capacity
        const [overallCheck] = await connection.query(
            `SELECT (total_capacity - reserved_count - filled_count) as available
       FROM option_capacity
       WHERE option_id = ?`,
            [optionId]
        );

        // Note: Logic simplification, relying on option_id being unique in capacity table or need join if release check needed
        // Assuming option_capacity one-to-one with option_id, which is unique.

        return {
            available: overallCheck[0]?.available > 0,
            quotaBucketId: null
        };
    }

    /**
     * Check if approval is required for this release
     */
    async checkApprovalRequired(releaseId, connection) {
        // TODO: Implement approval workflow check
        // For now, return false
        return {
            required: false,
            workflowId: null
        };
    }
}

export default ParticipationService;
