import express from 'express';
import { getAllSurveys } from './controller.js';

const router = express.Router();

// GET /api/v1/surveys
router.get('/', getAllSurveys);

export default router;
