import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import logger from '../../utils/logger.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 12;

/**
 * User Management Service
 * Handles CRUD operations for users (Admin only)
 */
class UserService {
    /**
     * Get all users
     */
    async getAllUsers({ role, status } = {}) {
        const pool = getPool();

        let query = `SELECT id, name, email, role, status, created_at, updated_at FROM ${TABLES.USERS}`;
        const params = [];
        const conditions = [];

        if (role) {
            conditions.push('role = ?');
            params.push(role);
        }

        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const [users] = await pool.query(query, params);
        return users;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const pool = getPool();

        const [users] = await pool.query(
            `SELECT id, name, email, role, status, created_at, updated_at 
             FROM ${TABLES.USERS} 
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            throw {
                code: 'USER_NOT_FOUND',
                message: 'User not found',
                statusCode: 404
            };
        }

        return users[0];
    }

    /**
     * Create new user
     */
    async createUser({ name, email, password, role = 'STUDENT', status = 'ACTIVE' }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if email already exists
            const [existing] = await connection.query(
                `SELECT id FROM ${TABLES.USERS} WHERE email = ?`,
                [email]
            );

            if (existing.length > 0) {
                throw {
                    code: 'EMAIL_EXISTS',
                    message: 'Email already registered',
                    statusCode: 400
                };
            }

            // Validate password
            if (!password || password.length < 8) {
                throw {
                    code: 'INVALID_PASSWORD',
                    message: 'Password must be at least 8 characters',
                    statusCode: 400
                };
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            const userId = uuidv4();

            // Insert user
            await connection.query(
                `INSERT INTO ${TABLES.USERS} 
                 (id, name, email, password_hash, role, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, name, email, passwordHash, role, status]
            );

            await connection.commit();

            logger.info(`User created: ${userId} (${email})`);

            return {
                id: userId,
                name,
                email,
                role,
                status
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update user
     */
    async updateUser(userId, { name, email, role, status }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if user exists
            const [users] = await connection.query(
                `SELECT id FROM ${TABLES.USERS} WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                throw {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    statusCode: 404
                };
            }

            // If email is being changed, check uniqueness
            if (email) {
                const [existing] = await connection.query(
                    `SELECT id FROM ${TABLES.USERS} WHERE email = ? AND id != ?`,
                    [email, userId]
                );

                if (existing.length > 0) {
                    throw {
                        code: 'EMAIL_EXISTS',
                        message: 'Email already in use',
                        statusCode: 400
                    };
                }
            }

            // Build update query
            const updates = [];
            const params = [];

            if (name !== undefined) {
                updates.push('name = ?');
                params.push(name);
            }

            if (email !== undefined) {
                updates.push('email = ?');
                params.push(email);
            }

            if (role !== undefined) {
                updates.push('role = ?');
                params.push(role);
            }

            if (status !== undefined) {
                updates.push('status = ?');
                params.push(status);
            }

            if (updates.length === 0) {
                throw {
                    code: 'NO_UPDATES',
                    message: 'No fields to update',
                    statusCode: 400
                };
            }

            params.push(userId);

            await connection.query(
                `UPDATE ${TABLES.USERS} SET ${updates.join(', ')} WHERE id = ?`,
                params
            );

            await connection.commit();

            logger.info(`User updated: ${userId}`);

            // Return updated user
            return await this.getUserById(userId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete user (soft delete - set status to DISABLED)
     */
    async deleteUser(userId) {
        const pool = getPool();

        // Check if user exists
        const [users] = await pool.query(
            `SELECT id FROM ${TABLES.USERS} WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            throw {
                code: 'USER_NOT_FOUND',
                message: 'User not found',
                statusCode: 404
            };
        }

        // Soft delete
        await pool.query(
            `UPDATE ${TABLES.USERS} SET status = 'DISABLED' WHERE id = ?`,
            [userId]
        );

        logger.info(`User disabled: ${userId}`);

        return { success: true };
    }

    /**
     * Hard delete user (permanent deletion)
     */
    async hardDeleteUser(userId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if user exists
            const [users] = await connection.query(
                `SELECT id FROM ${TABLES.USERS} WHERE id = ?`,
                [userId]
            );

            if (users.length === 0) {
                throw {
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    statusCode: 404
                };
            }

            // Delete user (cascades will handle related records)
            await connection.query(
                `DELETE FROM ${TABLES.USERS} WHERE id = ?`,
                [userId]
            );

            await connection.commit();

            logger.info(`User permanently deleted: ${userId}`);

            return { success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new UserService();
