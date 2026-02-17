import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app.js';
import logger from './utils/logger.js';
import { initializeDatabase } from './config/database.js';
import { startBackgroundJobs } from './utils/backgroundJobs.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
    try {
        console.log('DIRNAME:', import.meta.url);
        console.log('CWD:', process.cwd());
        // Initialize database connection
        logger.info('Initializing database connection...');
        await initializeDatabase();
        logger.info('Database connected successfully');

        // Start background jobs
        logger.info('Starting background jobs...');
        startBackgroundJobs();
        logger.info('Background jobs started');

        // Create HTTP server
        const server = createServer(app);

        // Start listening
        server.listen(PORT, () => {
            logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
            logger.info(`📡 API available at http://localhost:${PORT}/api/v1`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT signal received: closing HTTP server');
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
