import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import { ParticipationStateMachine } from '../../engines/stateMachine/definitions/participation.js';
import { PARTICIPATION_STATES } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Approval Service
 * Handles approval workflows for survey participation
 */
class ApprovalService {
    /**
     * Get approvals (pending/history) with filtering
     */
    async getApprovals({ status, surveyId, limit = 50, offset = 0 }) {
        const pool = getPool();

        // Base query
        let query = `
            SELECT 
                p.id,
                p.user_id,
                p.survey_id,
                p.release_id,
                p.state,
                p.submitted_at,
                p.state_updated_at,
                u.email,
                u.profile,
                s.title as survey_title,
                sr.version as release_version
            FROM ${TABLES.SURVEY_PARTICIPATION} p
            JOIN ${TABLES.USERS} u ON p.user_id = u.id
            JOIN ${TABLES.SURVEYS} s ON p.survey_id = s.id
            JOIN ${TABLES.SURVEY_RELEASES} sr ON p.release_id = sr.id
            WHERE 1=1
        `;

        const params = [];

        // Apply filters
        if (status) {
            query += ` AND p.state = ?`;
            params.push(status);
        } else {
            // Default to showing relevant approval states if no status specified
            query += ` AND p.state IN (?, ?, ?)`;
            params.push(
                PARTICIPATION_STATES.PENDING_APPROVAL,
                PARTICIPATION_STATES.APPROVED,
                PARTICIPATION_STATES.REJECTED
            );
        }

        if (surveyId) {
            query += ` AND p.survey_id = ?`;
            params.push(surveyId);
        }

        // Ordering and pagination
        query += ` ORDER BY p.submitted_at ASC LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));

        // Execute query
        const [approvals] = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM ${TABLES.SURVEY_PARTICIPATION} p
            WHERE 1=1
        `;
        const countParams = [];

        if (status) {
            countQuery += ` AND p.state = ?`;
            countParams.push(status);
        } else {
            countQuery += ` AND p.state IN (?, ?, ?)`;
            countParams.push(
                PARTICIPATION_STATES.PENDING_APPROVAL,
                PARTICIPATION_STATES.APPROVED,
                PARTICIPATION_STATES.REJECTED
            );
        }

        if (surveyId) {
            countQuery += ` AND p.survey_id = ?`;
            countParams.push(surveyId);
        }

        const [countResult] = await pool.query(countQuery, countParams);

        // Enhance results with selections if needed (could be a separate call)
        // For dashboard list view, we might not need full details yet.

        return {
            items: approvals.map(app => ({
                ...app,
                profile: typeof app.profile === 'string' ? JSON.parse(app.profile) : app.profile
            })),
            total: countResult[0].total,
            limit,
            offset
        };
    }

    /**
     * Get details for a specific approval request
     */
    async getApprovalDetails(participationId) {
        const pool = getPool();

        // Get basic details
        const [rows] = await pool.query(`
            SELECT 
                p.id,
                p.user_id,
                p.survey_id,
                p.release_id,
                p.state,
                p.submitted_at,
                u.email,
                u.profile,
                s.title as survey_title
            FROM ${TABLES.SURVEY_PARTICIPATION} p
            JOIN ${TABLES.USERS} u ON p.user_id = u.id
            JOIN ${TABLES.SURVEYS} s ON p.survey_id = s.id
            WHERE p.id = ?
        `, [participationId]);

        if (rows.length === 0) {
            throw { code: 'NOT_FOUND', message: 'Participation not found', statusCode: 404 };
        }

        const details = rows[0];

        // Get selections
        const [selections] = await pool.query(`
            SELECT 
                ss.id,
                ss.option_id,
                ss.rank_order,
                so.title as option_title,
                so.description as option_description
            FROM ${TABLES.SURVEY_SELECTIONS} ss
            JOIN ${TABLES.SURVEY_OPTIONS} so ON ss.option_id = so.id
            WHERE ss.participation_id = ?
            ORDER BY ss.rank_order ASC
        `, [participationId]);

        return {
            ...details,
            profile: typeof details.profile === 'string' ? JSON.parse(details.profile) : details.profile,
            selections
        };
    }

    /**
     * Approve a participation
     */
    async approveParticipation(participationId, approverId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // fetch participation
            const [rows] = await connection.query(
                `SELECT * FROM ${TABLES.SURVEY_PARTICIPATION} WHERE id = ? FOR UPDATE`,
                [participationId]
            );

            if (rows.length === 0) {
                throw { code: 'NOT_FOUND', message: 'Participation not found', statusCode: 404 };
            }

            const participation = rows[0];

            if (participation.state !== PARTICIPATION_STATES.PENDING_APPROVAL) {
                throw {
                    code: 'INVALID_STATE',
                    message: `Cannot approve participation in state ${participation.state}`,
                    statusCode: 400
                };
            }

            // Execute transition
            const updated = await ParticipationStateMachine.executeTransition(
                participation,
                PARTICIPATION_STATES.APPROVED,
                {
                    userId: participation.user_id,
                    approverId
                },
                connection
            );

            // Create audit log for approval
            await connection.query(
                `INSERT INTO ${TABLES.AUDIT_EVENTS} 
                (id, user_id, action, resource_type, resource_id, details, ip_address)
                VALUES (UUID(), ?, 'APPROVE_PARTICIPATION', 'PARTICIPATION', ?, ?, NULL)`,
                [
                    approverId,
                    participationId,
                    JSON.stringify({ previousState: participation.state })
                ]
            );

            await connection.commit();
            logger.info(`Participation approved: ${participationId} by ${approverId}`);

            return updated;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Reject a participation
     */
    async rejectParticipation(participationId, approverId, reason) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // fetch participation
            const [rows] = await connection.query(
                `SELECT * FROM ${TABLES.SURVEY_PARTICIPATION} WHERE id = ? FOR UPDATE`,
                [participationId]
            );

            if (rows.length === 0) {
                throw { code: 'NOT_FOUND', message: 'Participation not found', statusCode: 404 };
            }

            const participation = rows[0];

            if (participation.state !== PARTICIPATION_STATES.PENDING_APPROVAL) {
                throw {
                    code: 'INVALID_STATE',
                    message: `Cannot reject participation in state ${participation.state}`,
                    statusCode: 400
                };
            }

            // Execute transition
            const updated = await ParticipationStateMachine.executeTransition(
                participation,
                PARTICIPATION_STATES.REJECTED,
                {
                    userId: participation.user_id,
                    approverId,
                    reason,
                    releaseId: participation.release_id // Needed for capacity release
                },
                connection
            );

            // Create audit log for rejection
            await connection.query(
                `INSERT INTO ${TABLES.AUDIT_EVENTS} 
                (id, user_id, action, resource_type, resource_id, details, ip_address)
                VALUES (UUID(), ?, 'REJECT_PARTICIPATION', 'PARTICIPATION', ?, ?, NULL)`,
                [
                    approverId,
                    participationId,
                    JSON.stringify({ reason, previousState: participation.state })
                ]
            );

            await connection.commit();
            logger.info(`Participation rejected: ${participationId} by ${approverId}`);

            return updated;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new ApprovalService();
