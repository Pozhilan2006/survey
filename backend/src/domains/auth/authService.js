import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from '../../db/mysqlClient.js';
import refreshTokenService from './refreshTokenService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '15m'; // 15 minutes for access token
const SALT_ROUNDS = 10;

class AuthService {
    async login(email, password) {
        const pool = getPool();
        const [users] = await pool.query(
            'SELECT id, email, role, password_hash, status FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
        }

        const user = users[0];

        // Check if user is active
        if (user.status !== 'ACTIVE') {
            throw { code: 'USER_DISABLED', message: 'User account is disabled' };
        }

        if (!user.password_hash) {
            throw { code: 'NO_PASSWORD', message: 'User has no password set. Please contact admin.' };
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
            throw { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
        }

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Generate refresh token (long-lived)
        const refreshToken = await refreshTokenService.generateRefreshToken(user.id);

        return {
            accessToken,
            refreshToken,
            expiresIn: 900, // 15 minutes in seconds
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        };
    }

    async register(email, password, role = 'STUDENT') {
        const pool = getPool();
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const { v4: uuidv4 } = await import('uuid');
        const userId = uuidv4();

        await pool.query(
            'INSERT INTO users (id, email, role, password_hash) VALUES (?, ?, ?, ?)',
            [userId, email, role, passwordHash]
        );

        return { userId, email, role };
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw { code: 'INVALID_TOKEN', message: 'Invalid or expired token' };
        }
    }
}

export default new AuthService();
