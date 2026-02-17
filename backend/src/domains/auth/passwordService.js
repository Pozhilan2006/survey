import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import logger from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

/**
 * Password Security Service
 * Handles password change and reset operations
 */
class PasswordService {
    /**
     * Change password (requires current password)
     */
    async changePassword(userId, currentPassword, newPassword) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Get user with password hash
            const [users] = await connection.query(
                `SELECT id, password_hash FROM ${TABLES.USERS} WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                throw {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    statusCode: 404
                };
            }

            const user = users[0];

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password_hash);

            if (!isValid) {
                throw {
                    code: 'INVALID_PASSWORD',
                    message: 'Current password is incorrect',
                    statusCode: 401
                };
            }

            // Validate new password
            if (!newPassword || newPassword.length < 8) {
                throw {
                    code: 'WEAK_PASSWORD',
                    message: 'New password must be at least 8 characters',
                    statusCode: 400
                };
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            await connection.query(
                `UPDATE ${TABLES.USERS} SET password_hash = ? WHERE id = ?`,
                [newPasswordHash, userId]
            );

            await connection.commit();

            logger.info(`Password changed for user: ${userId}`);

            return { success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Request password reset (generates token)
     */
    async requestPasswordReset(email) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Find user by email
            const [users] = await connection.query(
                `SELECT id, email FROM ${TABLES.USERS} WHERE email = ?`,
                [email]
            );

            if (users.length === 0) {
                // Don't reveal if email exists
                logger.warn(`Password reset requested for non-existent email: ${email}`);
                return {
                    success: true,
                    message: 'If the email exists, a reset link has been sent'
                };
            }

            const user = users[0];

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const tokenId = uuidv4();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

            // Store token
            await connection.query(
                `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                 VALUES (?, ?, ?, ?)`,
                [tokenId, user.id, resetToken, expiresAt]
            );

            await connection.commit();

            logger.info(`Password reset token generated for user: ${user.id}`);

            // In production, send email here
            // For now, return token (for testing)
            return {
                success: true,
                message: 'If the email exists, a reset link has been sent',
                // Remove this in production:
                resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Reset password using token
     */
    async resetPassword(token, newPassword) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Find valid token
            const [tokens] = await connection.query(
                `SELECT id, user_id, expires_at, used 
                 FROM password_reset_tokens 
                 WHERE token = ? AND used = FALSE AND expires_at > NOW()`,
                [token]
            );

            if (tokens.length === 0) {
                throw {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token',
                    statusCode: 400
                };
            }

            const resetToken = tokens[0];

            // Validate new password
            if (!newPassword || newPassword.length < 8) {
                throw {
                    code: 'WEAK_PASSWORD',
                    message: 'Password must be at least 8 characters',
                    statusCode: 400
                };
            }

            // Hash new password
            const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            // Update password
            await connection.query(
                `UPDATE ${TABLES.USERS} SET password_hash = ? WHERE id = ?`,
                [passwordHash, resetToken.user_id]
            );

            // Mark token as used
            await connection.query(
                `UPDATE password_reset_tokens SET used = TRUE WHERE id = ?`,
                [resetToken.id]
            );

            await connection.commit();

            logger.info(`Password reset completed for user: ${resetToken.user_id}`);

            return { success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Clean up expired tokens (run periodically)
     */
    async cleanupExpiredTokens() {
        const pool = getPool();

        const [result] = await pool.query(
            `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
        );

        logger.info(`Cleaned up ${result.affectedRows} expired reset tokens`);

        return { deleted: result.affectedRows };
    }
}

export default new PasswordService();
