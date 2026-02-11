import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errorHandler.js';
import { query } from '../config/database.js';

export async function authenticate(req, res, next) {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No token provided');
        }

        const token = authHeader.substring(7);

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const [rows] = await query(
            'SELECT * FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (rows.length === 0) {
            throw new UnauthorizedError('User not found');
        }

        // Attach user to request
        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            next(new UnauthorizedError('Invalid token'));
        } else if (error.name === 'TokenExpiredError') {
            next(new UnauthorizedError('Token expired'));
        } else {
            next(error);
        }
    }
}

export function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ForbiddenError('Insufficient permissions'));
        }

        next();
    };
}

export default { authenticate, authorize };
