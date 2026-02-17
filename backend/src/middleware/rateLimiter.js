import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login attempts
 * 5 attempts per 15 minutes
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_ATTEMPTS',
            message: 'Too many login attempts, please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for general API requests
 * 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for password reset requests
 * 3 attempts per hour
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: {
        success: false,
        error: {
            code: 'TOO_MANY_RESET_ATTEMPTS',
            message: 'Too many password reset attempts, please try again later'
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
});
