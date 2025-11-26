import { Router } from 'express';
import settingsController from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import {
  settingsValidation,
  verifyPinValidation,
  validate,
} from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', settingsController.getSettings);
router.put('/', validate(settingsValidation), settingsController.updateSettings);
router.post('/verify-pin', validate(verifyPinValidation), settingsController.verifyPin);

export default router;

