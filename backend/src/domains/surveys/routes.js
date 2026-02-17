import express from 'express';
import { getAllSurveys, submitSurvey, checkEligibility, createHold } from './controller.js';

const router = express.Router();

// GET /api/v1/surveys
router.get('/', getAllSurveys);

// GET /api/v1/surveys/:surveyId/eligibility
router.get('/:surveyId/eligibility', checkEligibility);

// POST /api/v1/surveys/:surveyId/hold
router.post('/:surveyId/hold', createHold);

// POST /api/v1/surveys/:surveyId/submit
router.post('/:surveyId/submit', submitSurvey);

export default router;
