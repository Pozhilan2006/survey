import express from 'express';
import { getPool } from '../db/mysqlClient.js';

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        database: 'unknown'
    };

    try {
        const pool = getPool();
        await pool.query('SELECT 1');
        health.database = 'connected';
    } catch (error) {
        health.status = 'degraded';
        health.database = 'disconnected';
        health.databaseError = process.env.NODE_ENV === 'development' ? error.message : undefined;
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;
