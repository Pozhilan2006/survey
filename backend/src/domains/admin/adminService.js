import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import { setIsolationLevel } from '../../utils/transactionUtils.js';
import { validateTransition } from '../../utils/stateMachine.js';
import { TABLES } from '../../db/tables.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Admin Service
 * Handles admin operations for submissions and approvals
 * HARDENED: Conditional updates to prevent double approval/rejection
 */
class AdminService {
    /**
     * Get all submissions
     * @returns {Promise<Array>} List of submissions
     */
    async getAllSubmissions() {
        const pool = getPool();

        const [submissions] = await pool.query(`
            SELECT 
                sp.id as participationId,
                sp.status,
                sp.submitted_at as submittedAt,
                u.email as studentEmail,
                u.metadata as userMetadata,
                s.title as surveyTitle,
                s.type as surveyType
            FROM survey_participation sp
            JOIN users u ON sp.user_id = u.id
            JOIN surveys s ON sp.release_id = s.id
            WHERE sp.status IN ('SUBMITTED', 'APPROVED', 'REJECTED')
            ORDER BY sp.submitted_at DESC
        `);

        // Extract student name from metadata or use email
        return submissions.map(sub => ({
            participationId: sub.participationId,
            studentName: this.extractStudentName(sub.userMetadata, sub.studentEmail),
            surveyTitle: sub.surveyTitle,
            surveyType: sub.surveyType,
            submittedAt: sub.submittedAt,
            status: sub.status
        }));
    }

    /**
     * Approve a submission
     * HARDENING: Uses conditional UPDATE to prevent double approval
     * @param {string} participationId - Participation ID
     * @param {string} adminUserId - Admin user ID
     * @returns {Promise<object>} Approval result
     */
    async approveSubmission(participationId, adminUserId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            // HARDENING: Set isolation level
            await setIsolationLevel(connection, 'REPEATABLE READ');
            await connection.beginTransaction();

            // 1. Check if participation exists and get current status
            const [participations] = await connection.query(
                'SELECT id, user_id, status FROM survey_participation WHERE id = ?',
                [participationId]
            );

            if (participations.length === 0) {
                throw new Error('Participation not found');
            }

            const participation = participations[0];

            // Validate state transition
            validateTransition('PARTICIPATION', participation.status, 'APPROVED');

            // 2. HARDENING: Conditional update - only update if status is still SUBMITTED
            const [result] = await connection.query(
                `UPDATE survey_participation 
                 SET status = 'APPROVED', completed_at = NOW() 
                 WHERE id = ? AND status = 'SUBMITTED'`,
                [participationId]
            );

            // HARDENING: Check if update actually happened
            if (result.affectedRows === 0) {
                // Status changed between our SELECT and UPDATE (race condition)
                const [check] = await connection.query(
                    'SELECT status FROM survey_participation WHERE id = ?',
                    [participationId]
                );

                if (check.length > 0 && check[0].status !== 'SUBMITTED') {
                    const error = new Error(
                        `Submission already processed (current status: ${check[0].status})`
                    );
                    error.code = 'ALREADY_PROCESSED';
                    throw error;
                }

                // Should not reach here, but handle gracefully
                throw new Error('Failed to update submission status');
            }

            // 3. Insert audit log (in same transaction)
            await this.insertAuditLog(connection, {
                userId: adminUserId,
                action: 'SURVEY_APPROVED',
                resourceType: 'SURVEY_PARTICIPATION',
                resourceId: participationId,
                details: {
                    participationId,
                    studentUserId: participation.user_id,
                    approvedBy: adminUserId
                }
            });

            await connection.commit();

            return {
                success: true,
                message: 'Submission approved successfully'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Approval failed:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Reject a submission
     * HARDENING: Uses conditional UPDATE to prevent double rejection
     * @param {string} participationId - Participation ID
     * @param {string} adminUserId - Admin user ID
     * @returns {Promise<object>} Rejection result
     */
    async rejectSubmission(participationId, adminUserId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            // HARDENING: Set isolation level
            await setIsolationLevel(connection, 'REPEATABLE READ');
            await connection.beginTransaction();

            // 1. Check if participation exists and get current status
            const [participations] = await connection.query(
                'SELECT id, user_id, status FROM survey_participation WHERE id = ?',
                [participationId]
            );

            if (participations.length === 0) {
                throw new Error('Participation not found');
            }

            const participation = participations[0];

            // Validate state transition
            validateTransition('PARTICIPATION', participation.status, 'REJECTED');

            // 2. HARDENING: Conditional update - only update if status is still SUBMITTED
            const [result] = await connection.query(
                `UPDATE survey_participation 
                 SET status = 'REJECTED', completed_at = NOW() 
                 WHERE id = ? AND status = 'SUBMITTED'`,
                [participationId]
            );

            // HARDENING: Check if update actually happened
            if (result.affectedRows === 0) {
                // Status changed between our SELECT and UPDATE (race condition)
                const [check] = await connection.query(
                    'SELECT status FROM survey_participation WHERE id = ?',
                    [participationId]
                );

                if (check.length > 0 && check[0].status !== 'SUBMITTED') {
                    const error = new Error(
                        `Submission already processed (current status: ${check[0].status})`
                    );
                    error.code = 'ALREADY_PROCESSED';
                    throw error;
                }

                // Should not reach here, but handle gracefully
                throw new Error('Failed to update submission status');
            }

            // 3. Insert audit log (in same transaction)
            await this.insertAuditLog(connection, {
                userId: adminUserId,
                action: 'SURVEY_REJECTED',
                resourceType: 'SURVEY_PARTICIPATION',
                resourceId: participationId,
                details: {
                    participationId,
                    studentUserId: participation.user_id,
                    rejectedBy: adminUserId
                }
            });

            await connection.commit();

            return {
                success: true,
                message: 'Submission rejected successfully'
            };

        } catch (error) {
            await connection.rollback();
            logger.error('Rejection failed:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get audit logs
     * @param {number} limit - Number of logs to fetch
     * @returns {Promise<Array>} Audit logs
     */
    async getAuditLogs(limit = 100) {
        const pool = getPool();

        const [logs] = await pool.query(`
            SELECT 
                ae.id,
                ae.user_id as userId,
                ae.action,
                ae.resource_type as resourceType,
                ae.resource_id as resourceId,
                ae.details,
                ae.created_at as timestamp,
                u.email as userEmail
            FROM audit_events ae
            LEFT JOIN users u ON ae.user_id = u.id
            ORDER BY ae.created_at DESC
            LIMIT ?
        `, [limit]);

        return logs.map(log => ({
            ...log,
            details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
        }));
    }

    /**
     * Extract student name from metadata or fallback to email
     * @param {object|string} metadata - User metadata
     * @param {string} email - User email
     * @returns {string} Student name
     */
    extractStudentName(metadata, email) {
        try {
            const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
            return meta?.name || meta?.college_user_id || email.split('@')[0];
        } catch {
            return email.split('@')[0];
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

export default AdminService;
