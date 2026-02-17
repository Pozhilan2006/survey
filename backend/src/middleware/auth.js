import authService from '../domains/auth/authService.js';
import logger from '../utils/logger.js';

export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: { code: 'NO_AUTH', message: 'Authentication required' }
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = authService.verifyToken(token);

        if (!decoded) {
            throw { code: 'INVALID_TOKEN', message: 'Invalid token' };
        }

        req.user = decoded;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error.code === 'INVALID_TOKEN') {
            return res.status(401).json({ error });
        }

        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Authentication failed' }
        });
    }
};

export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({
                error: { code: 'REQUIRE_ROLE_CALLED', message: 'Authentication required' }
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                }
            });
        }

        next();
    };
};

// Keep backward compatibility
export const authorize = requireRole;

export default { authenticate, requireRole, authorize };
