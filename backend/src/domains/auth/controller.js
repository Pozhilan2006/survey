import authService from './authService.js';
import logger from '../../utils/logger.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
            });
        }

        const result = await authService.login(email, password);
        res.json(result);
    } catch (error) {
        logger.error('Login error:', error);

        if (error.code === 'INVALID_CREDENTIALS' || error.code === 'NO_PASSWORD') {
            return res.status(401).json({ error });
        }

        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Login failed' }
        });
    }
};

export const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Email and password required' }
            });
        }

        const result = await authService.register(email, password, role);
        res.status(201).json(result);
    } catch (error) {
        logger.error('Registration error:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: { code: 'EMAIL_EXISTS', message: 'Email already registered' }
            });
        }

        res.status(500).json({
            error: { code: 'SERVER_ERROR', message: 'Registration failed' }
        });
    }
};

export const verify = async (req, res) => {
    res.json({ user: req.user });
};
