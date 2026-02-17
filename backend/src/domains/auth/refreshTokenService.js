import { getPool } from '../../db/mysqlClient.js';
import logger from '../../utils/logger.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Refresh Token Service
 * Manages refresh tokens for JWT authentication
 */
class RefreshTokenService {
    /**
     * Generate refresh token
     */
    async generateRefreshToken(userId) {
        const pool = getPool();

        const tokenId = uuidv4();
        const token = jwt.sign(
            { tokenId, userId },
            JWT_REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Store in database
        await pool.query(
            `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
             VALUES (?, ?, ?, ?)`,
            [tokenId, userId, token, expiresAt]
        );

        logger.info(`Refresh token generated for user: ${userId}`);

        return token;
    }

    /**
     * Verify and get user from refresh token
     */
    async verifyRefreshToken(token) {
        const pool = getPool();

        try {
            // Verify JWT
            const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

            // Check if token exists and is not revoked
            const [tokens] = await pool.query(
                `SELECT id, user_id, revoked, expires_at 
                 FROM refresh_tokens 
                 WHERE id = ? AND token = ?`,
                [decoded.tokenId, token]
            );

            if (tokens.length === 0) {
                throw {
                    code: 'INVALID_TOKEN',
                    message: 'Refresh token not found',
                    statusCode: 401
                };
            }

            const tokenRecord = tokens[0];

            if (tokenRecord.revoked) {
                throw {
                    code: 'TOKEN_REVOKED',
                    message: 'Refresh token has been revoked',
                    statusCode: 401
                };
            }

            if (new Date(tokenRecord.expires_at) < new Date()) {
                throw {
                    code: 'TOKEN_EXPIRED',
                    message: 'Refresh token has expired',
                    statusCode: 401
                };
            }

            return {
                userId: tokenRecord.user_id,
                tokenId: decoded.tokenId
            };

        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                throw {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired refresh token',
                    statusCode: 401
                };
            }
            throw error;
        }
    }

    /**
     * Revoke refresh token (logout)
     */
    async revokeRefreshToken(token) {
        const pool = getPool();

        try {
            const decoded = jwt.verify(token, JWT_REFRESH_SECRET);

            await pool.query(
                `UPDATE refresh_tokens SET revoked = TRUE WHERE id = ?`,
                [decoded.tokenId]
            );

            logger.info(`Refresh token revoked: ${decoded.tokenId}`);

            return { success: true };

        } catch (error) {
            // Even if token is invalid, consider it revoked
            logger.warn('Attempted to revoke invalid token');
            return { success: true };
        }
    }

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeAllUserTokens(userId) {
        const pool = getPool();

        const [result] = await pool.query(
            `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ? AND revoked = FALSE`,
            [userId]
        );

        logger.info(`Revoked ${result.affectedRows} tokens for user: ${userId}`);

        return { revoked: result.affectedRows };
    }

    /**
     * Clean up expired tokens (run periodically)
     */
    async cleanupExpiredTokens() {
        const pool = getPool();

        const [result] = await pool.query(
            `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
        );

        logger.info(`Cleaned up ${result.affectedRows} expired refresh tokens`);

        return { deleted: result.affectedRows };
    }
}

export default new RefreshTokenService();
