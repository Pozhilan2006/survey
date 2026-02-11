import express from 'express';
import { getAllSurveys, submitSurvey } from './controller.js';

const router = express.Router();

// GET /api/v1/surveys
router.get('/', getAllSurveys);
router.post('/:surveyId/submit', submitSurvey);

export default router;
