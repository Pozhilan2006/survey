import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * DEV ONLY: Generate a test JWT token
 * POST /api/v1/auth/dev-login
 * 
 * This endpoint is for development/testing only.
 * Remove or disable in production.
 */
router.post('/dev-login', (req, res) => {
    const { userId = 'dev-user-1', role = 'ADMIN' } = req.body;

    const token = jwt.sign(
        {
            userId,
            role,
            email: `${userId}@dev.local`
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1h' }
    );

    res.json({
        accessToken: token,
        user: {
            userId,
            role,
            email: `${userId}@dev.local`
        }
    });
});

/**
 * DEV ONLY: Generate a student token
 * POST /api/v1/auth/dev-student
 */
router.post('/dev-student', (req, res) => {
    const token = jwt.sign(
        {
            userId: 'student-123',
            role: 'STUDENT',
            email: 'student@dev.local'
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1h' }
    );

    res.json({
        accessToken: token,
        user: {
            userId: 'student-123',
            role: 'STUDENT',
            email: 'student@dev.local'
        }
    });
});

export default router;
