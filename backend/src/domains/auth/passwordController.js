import passwordService from './passwordService.js';
import logger from '../../utils/logger.js';

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Current password and new password are required'
                }
            });
        }

        await passwordService.changePassword(userId, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Error in changePassword:', error);
        next(error);
    }
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_EMAIL',
                    message: 'Email is required'
                }
            });
        }

        const result = await passwordService.requestPasswordReset(email);

        res.json(result);

    } catch (error) {
        logger.error('Error in requestPasswordReset:', error);
        next(error);
    }
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Token and new password are required'
                }
            });
        }

        await passwordService.resetPassword(token, newPassword);

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        logger.error('Error in resetPassword:', error);
        next(error);
    }
};
