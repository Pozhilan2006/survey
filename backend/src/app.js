import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiLimiter, loginLimiter, passwordResetLimiter } from './middleware/rateLimiter.js';
import logger from './utils/logger.js';

// Import routes
import authRoutes from './domains/auth/routes.js';
import participationRoutes from './domains/participation/routes.js';
import surveyRoutes from './domains/surveys/routes.js';
import adminRoutes from './domains/admin/routes.js';
import userRoutes from './domains/users/routes.js';
import healthRoutes from './routes/health.js';
import approverRoutes from './domains/approver/routes.js';
import slotRoutes from './domains/slots/routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Production ready
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (corsOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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

// Health check endpoint (no rate limiting)
app.use('/health', healthRoutes);

// API root
app.get('/api/v1', (req, res) => {
    res.json({
        message: 'College Survey System API',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            health: '/health',
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            surveys: '/api/v1/surveys',
            participation: '/api/v1/participation',
            admin: '/api/v1/admin'
        }
    });
});

// Apply rate limiting to all API routes
app.use('/api/v1', apiLimiter);

// Auth routes (public) - with specific rate limiters
import { authenticate, requireRole } from './middleware/auth.js';

// Apply login rate limiter to login endpoint
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/forgot-password', passwordResetLimiter);
app.use('/api/v1/auth/reset-password', passwordResetLimiter);

app.use('/api/v1/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api/v1/participation', authenticate, participationRoutes);
app.use('/api/v1/surveys', authenticate, surveyRoutes);

// Admin routes (require ADMIN role)
app.use('/api/v1/admin', authenticate, requireRole('ADMIN'), adminRoutes);

// Approver routes (require APPROVER or ADMIN role)
app.use('/api/v1/approver', authenticate, approverRoutes);

// Slot routes (mixed permissions - admin and student)
app.use('/api/v1/slots', slotRoutes);

// User management routes (require ADMIN role)
app.use('/api/v1/users', authenticate, requireRole('ADMIN'), userRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
