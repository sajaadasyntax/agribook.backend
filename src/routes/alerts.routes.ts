import { Router } from 'express';
import alertController from '../controllers/alert.controller';
import { authenticate } from '../middleware/auth';
import { alertValidation, validate } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', alertController.getAlerts);
router.get('/:id', alertController.getAlertById);
router.post('/', validate(alertValidation), alertController.createAlert);
router.patch('/:id/read', alertController.markAsRead);
router.delete('/:id', alertController.deleteAlert);

export default router;

