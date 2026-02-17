import userService from './userService.js';
import logger from '../../utils/logger.js';

/**
 * Get all users
 * GET /api/v1/users
 */
export const getAllUsers = async (req, res, next) => {
    try {
        const { role, status } = req.query;

        const users = await userService.getAllUsers({ role, status });

        res.json({
            success: true,
            users,
            count: users.length
        });

    } catch (error) {
        logger.error('Error in getAllUsers:', error);
        next(error);
    }
};

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await userService.getUserById(id);

        res.json({
            success: true,
            user
        });

    } catch (error) {
        logger.error('Error in getUserById:', error);
        next(error);
    }
};

/**
 * Create new user
 * POST /api/v1/users
 */
export const createUser = async (req, res, next) => {
    try {
        const { name, email, password, role, status } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_FIELDS',
                    message: 'Name, email, and password are required'
                }
            });
        }

        const user = await userService.createUser({
            name,
            email,
            password,
            role,
            status
        });

        res.status(201).json({
            success: true,
            user
        });

    } catch (error) {
        logger.error('Error in createUser:', error);
        next(error);
    }
};

/**
 * Update user
 * PUT /api/v1/users/:id
 */
export const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role, status } = req.body;

        const user = await userService.updateUser(id, {
            name,
            email,
            role,
            status
        });

        res.json({
            success: true,
            user
        });

    } catch (error) {
        logger.error('Error in updateUser:', error);
        next(error);
    }
};

/**
 * Delete user (soft delete)
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await userService.deleteUser(id);

        res.json({
            success: true,
            message: 'User disabled successfully'
        });

    } catch (error) {
        logger.error('Error in deleteUser:', error);
        next(error);
    }
};

/**
 * Hard delete user (permanent)
 * DELETE /api/v1/users/:id/permanent
 */
export const hardDeleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await userService.hardDeleteUser(id);

        res.json({
            success: true,
            message: 'User permanently deleted'
        });

    } catch (error) {
        logger.error('Error in hardDeleteUser:', error);
        next(error);
    }
};
