import express from 'express';
import { createOption, getOptions, getOption, updateOption, deleteOption, setQuotaBuckets } from './optionController.js';
import { requireRole } from '../../middleware/auth.js';

const router = express.Router();

// All routes require ADMIN role
router.use(requireRole('ADMIN'));

// Option CRUD
router.post('/surveys/:surveyId/options', createOption);
router.get('/surveys/:surveyId/options', getOptions);
router.get('/options/:id', getOption);
router.put('/options/:id', updateOption);
router.delete('/options/:id', deleteOption);

// Quota Management
router.post('/options/:id/quotas', setQuotaBuckets);

export default router;
