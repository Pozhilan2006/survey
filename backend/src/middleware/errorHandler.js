import logger from '../utils/logger.js';

export class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

export class CapacityExceededError extends ConflictError {
    constructor(message = 'Capacity exceeded') {
        super(message);
    }
}

export class InvalidStateTransitionError extends AppError {
    constructor(from, to, reason) {
        super(`Invalid state transition from ${from} to ${to}: ${reason}`, 400);
        this.from = from;
        this.to = to;
    }
}

export function errorHandler(err, req, res, next) {
    // Log error
    if (err.isOperational) {
        logger.warn(`Operational error: ${err.message}`, {
            statusCode: err.statusCode,
            path: req.path,
            method: req.method
        });
    } else {
        logger.error('Unexpected error:', err);
    }

    // Send error response
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal server error';

    res.status(statusCode).json({
        error: {
            message,
            statusCode,
            timestamp: err.timestamp || new Date().toISOString(),
            path: req.path,
            ...(process.env.NODE_ENV === 'development' && {
                stack: err.stack,
                details: err.errors
            })
        }
    });
}

export default errorHandler;
