import refreshTokenService from './refreshTokenService.js';
import authService from './authService.js';
import logger from '../../utils/logger.js';
import { getPool } from '../../db/mysqlClient.js';

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_TOKEN',
                    message: 'Refresh token is required'
                }
            });
        }

        // Verify refresh token
        const { userId } = await refreshTokenService.verifyRefreshToken(refreshToken);

        // Get user details
        const pool = getPool();
        const [users] = await pool.query(
            'SELECT id, email, role, status FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0 || users[0].status !== 'ACTIVE') {
            throw {
                code: 'USER_NOT_FOUND',
                message: 'User not found or inactive',
                statusCode: 401
            };
        }

        const user = users[0];

        // Generate new access token
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

        const accessToken = jwt.default.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({
            success: true,
            accessToken,
            expiresIn: 900 // 15 minutes
        });

    } catch (error) {
        logger.error('Error in refreshToken:', error);
        next(error);
    }
};

/**
 * Logout (revoke refresh token)
 * POST /api/v1/auth/logout
 */
export const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await refreshTokenService.revokeRefreshToken(refreshToken);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        logger.error('Error in logout:', error);
        next(error);
    }
};
