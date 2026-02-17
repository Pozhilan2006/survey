import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    hardDeleteUser
} from './userController.js';

const router = express.Router();

// All user routes require ADMIN role (applied in app.js)

// GET /api/v1/users - Get all users
router.get('/', getAllUsers);

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', getUserById);

// POST /api/v1/users - Create new user
router.post('/', createUser);

// PUT /api/v1/users/:id - Update user
router.put('/:id', updateUser);

// DELETE /api/v1/users/:id - Soft delete user
router.delete('/:id', deleteUser);

// DELETE /api/v1/users/:id/permanent - Hard delete user
router.delete('/:id/permanent', hardDeleteUser);

export default router;
