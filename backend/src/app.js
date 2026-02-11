import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './domains/auth/routes.js';
import participationRoutes from './domains/participation/routes.js';
// import userRoutes from './domains/users/routes.js';
import surveyRoutes from './domains/surveys/routes.js';
// ... other routes

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
    }));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    });
});

// API routes
app.get('/api/v1', (req, res) => {
    res.json({
        message: 'College Survey System API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            surveys: '/api/v1/surveys',
            releases: '/api/v1/releases',
            participation: '/api/v1/participation'
        }
    });
});

// Mount domain routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/participation', participationRoutes);
// app.use('/api/v1/users', userRoutes);
app.use('/api/v1/surveys', surveyRoutes);
// app.use('/api/v1/releases', releaseRoutes);
// app.use('/api/v1/approvals', approvalRoutes);
// app.use('/api/v1/documents', documentRoutes);
// app.use('/api/v1/allocation', allocationRoutes);
// app.use('/api/v1/relay', relayRoutes);
// app.use('/api/v1/calendar', calendarRoutes);
// app.use('/api/v1/action-plans', actionPlanRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
