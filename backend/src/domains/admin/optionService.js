import { getPool } from '../../db/mysqlClient.js';
import { TABLES } from '../../db/tables.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Survey Options Management Service
 * Handles CRUD operations for survey options
 */
class OptionService {
    /**
     * Create new option for a survey
     */
    async createOption(surveyId, { title, description, capacity, metadata = {} }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verify survey exists
            const [surveys] = await connection.query(
                `SELECT id FROM ${TABLES.SURVEYS} WHERE id = ?`,
                [surveyId]
            );

            if (surveys.length === 0) {
                throw {
                    code: 'SURVEY_NOT_FOUND',
                    message: 'Survey not found',
                    statusCode: 404
                };
            }

            // Validate input
            if (!title || title.trim().length === 0) {
                throw {
                    code: 'INVALID_TITLE',
                    message: 'Option title is required',
                    statusCode: 400
                };
            }

            if (capacity && (capacity < 0 || !Number.isInteger(capacity))) {
                throw {
                    code: 'INVALID_CAPACITY',
                    message: 'Capacity must be a positive integer',
                    statusCode: 400
                };
            }

            const optionId = uuidv4();

            // Insert option
            await connection.query(
                `INSERT INTO ${TABLES.SURVEY_OPTIONS} 
                 (id, survey_id, title, description, metadata) 
                 VALUES (?, ?, ?, ?, ?)`,
                [optionId, surveyId, title.trim(), description || null, JSON.stringify(metadata)]
            );

            // Create capacity record if capacity is specified
            if (capacity !== undefined && capacity !== null) {
                await connection.query(
                    `INSERT INTO ${TABLES.OPTION_CAPACITY} 
                     (id, option_id, total_capacity, available_capacity) 
                     VALUES (?, ?, ?, ?)`,
                    [uuidv4(), optionId, capacity, capacity]
                );
            }

            await connection.commit();

            logger.info(`Option created: ${optionId} for survey ${surveyId}`);

            return {
                id: optionId,
                survey_id: surveyId,
                title: title.trim(),
                description,
                capacity,
                metadata
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get all options for a survey
     */
    async getOptionsBySurvey(surveyId) {
        const pool = getPool();

        const [options] = await pool.query(
            `SELECT 
                o.id,
                o.survey_id,
                o.title,
                o.description,
                o.metadata,
                c.total_capacity,
                c.available_capacity,
                c.reserved_capacity
             FROM ${TABLES.SURVEY_OPTIONS} o
             LEFT JOIN ${TABLES.OPTION_CAPACITY} c ON o.id = c.option_id
             WHERE o.survey_id = ?
             ORDER BY o.created_at ASC`,
            [surveyId]
        );

        return options.map(opt => ({
            ...opt,
            metadata: opt.metadata ? JSON.parse(opt.metadata) : {}
        }));
    }

    /**
     * Get option by ID
     */
    async getOptionById(optionId) {
        const pool = getPool();

        const [options] = await pool.query(
            `SELECT 
                o.id,
                o.survey_id,
                o.title,
                o.description,
                o.metadata,
                c.total_capacity,
                c.available_capacity,
                c.reserved_capacity
             FROM ${TABLES.SURVEY_OPTIONS} o
             LEFT JOIN ${TABLES.OPTION_CAPACITY} c ON o.id = c.option_id
             WHERE o.id = ?`,
            [optionId]
        );

        if (options.length === 0) {
            throw {
                code: 'OPTION_NOT_FOUND',
                message: 'Option not found',
                statusCode: 404
            };
        }

        const option = options[0];
        return {
            ...option,
            metadata: option.metadata ? JSON.parse(option.metadata) : {}
        };
    }

    /**
     * Update option
     */
    async updateOption(optionId, { title, description, capacity, metadata }) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if option exists
            const [options] = await connection.query(
                `SELECT id, survey_id FROM ${TABLES.SURVEY_OPTIONS} WHERE id = ?`,
                [optionId]
            );

            if (options.length === 0) {
                throw {
                    code: 'OPTION_NOT_FOUND',
                    message: 'Option not found',
                    statusCode: 404
                };
            }

            // Build update query
            const updates = [];
            const params = [];

            if (title !== undefined) {
                if (!title || title.trim().length === 0) {
                    throw {
                        code: 'INVALID_TITLE',
                        message: 'Option title cannot be empty',
                        statusCode: 400
                    };
                }
                updates.push('title = ?');
                params.push(title.trim());
            }

            if (description !== undefined) {
                updates.push('description = ?');
                params.push(description);
            }

            if (metadata !== undefined) {
                updates.push('metadata = ?');
                params.push(JSON.stringify(metadata));
            }

            if (updates.length > 0) {
                params.push(optionId);
                await connection.query(
                    `UPDATE ${TABLES.SURVEY_OPTIONS} SET ${updates.join(', ')} WHERE id = ?`,
                    params
                );
            }

            // Update capacity if specified
            if (capacity !== undefined && capacity !== null) {
                if (capacity < 0 || !Number.isInteger(capacity)) {
                    throw {
                        code: 'INVALID_CAPACITY',
                        message: 'Capacity must be a positive integer',
                        statusCode: 400
                    };
                }

                // Check if capacity record exists
                const [capacityRecords] = await connection.query(
                    `SELECT id, total_capacity, available_capacity FROM ${TABLES.OPTION_CAPACITY} WHERE option_id = ?`,
                    [optionId]
                );

                if (capacityRecords.length > 0) {
                    // Update existing capacity
                    const currentCapacity = capacityRecords[0];
                    const diff = capacity - currentCapacity.total_capacity;
                    const newAvailable = currentCapacity.available_capacity + diff;

                    if (newAvailable < 0) {
                        throw {
                            code: 'CAPACITY_TOO_LOW',
                            message: 'Cannot reduce capacity below current bookings',
                            statusCode: 400
                        };
                    }

                    await connection.query(
                        `UPDATE ${TABLES.OPTION_CAPACITY} 
                         SET total_capacity = ?, available_capacity = ? 
                         WHERE option_id = ?`,
                        [capacity, newAvailable, optionId]
                    );
                } else {
                    // Create new capacity record
                    await connection.query(
                        `INSERT INTO ${TABLES.OPTION_CAPACITY} 
                         (id, option_id, total_capacity, available_capacity) 
                         VALUES (?, ?, ?, ?)`,
                        [uuidv4(), optionId, capacity, capacity]
                    );
                }
            }

            await connection.commit();

            logger.info(`Option updated: ${optionId}`);

            // Return updated option
            return await this.getOptionById(optionId);

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Delete option
     */
    async deleteOption(optionId) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Check if option exists
            const [options] = await connection.query(
                `SELECT id FROM ${TABLES.SURVEY_OPTIONS} WHERE id = ?`,
                [optionId]
            );

            if (options.length === 0) {
                throw {
                    code: 'OPTION_NOT_FOUND',
                    message: 'Option not found',
                    statusCode: 404
                };
            }

            // Check if option has selections
            const [selections] = await connection.query(
                `SELECT COUNT(*) as count FROM ${TABLES.SURVEY_SELECTIONS} WHERE option_id = ?`,
                [optionId]
            );

            if (selections[0].count > 0) {
                throw {
                    code: 'OPTION_HAS_SELECTIONS',
                    message: 'Cannot delete option with existing selections',
                    statusCode: 400
                };
            }

            // Delete option (cascades will handle capacity, holds, waitlist)
            await connection.query(
                `DELETE FROM ${TABLES.SURVEY_OPTIONS} WHERE id = ?`,
                [optionId]
            );

            await connection.commit();

            logger.info(`Option deleted: ${optionId}`);

            return { success: true };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Set quota buckets for an option
     */
    async setQuotaBuckets(optionId, buckets) {
        const pool = getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // Verify option exists
            const [options] = await connection.query(
                `SELECT id FROM ${TABLES.SURVEY_OPTIONS} WHERE id = ?`,
                [optionId]
            );

            if (options.length === 0) {
                throw {
                    code: 'OPTION_NOT_FOUND',
                    message: 'Option not found',
                    statusCode: 404
                };
            }

            // Delete existing buckets
            await connection.query(
                `DELETE FROM ${TABLES.OPTION_QUOTA_BUCKETS} WHERE option_id = ?`,
                [optionId]
            );

            // Insert new buckets
            for (const bucket of buckets) {
                if (!bucket.bucket_name || !bucket.quota) {
                    throw {
                        code: 'INVALID_BUCKET',
                        message: 'Bucket name and quota are required',
                        statusCode: 400
                    };
                }

                await connection.query(
                    `INSERT INTO ${TABLES.OPTION_QUOTA_BUCKETS} 
                     (id, option_id, bucket_name, quota) 
                     VALUES (?, ?, ?, ?)`,
                    [uuidv4(), optionId, bucket.bucket_name, bucket.quota]
                );
            }

            await connection.commit();

            logger.info(`Quota buckets set for option: ${optionId}`);

            return { success: true, buckets };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default new OptionService();
