import { Router } from 'express';
import reminderController from '../controllers/reminder.controller';
import { authenticate } from '../middleware/auth';
import {
  reminderValidation,
  updateReminderValidation,
  validate,
} from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', reminderController.getReminders);
router.get('/:id', reminderController.getReminderById);
router.post('/', validate(reminderValidation), reminderController.createReminder);
router.put('/:id', validate(updateReminderValidation), reminderController.updateReminder);
router.patch('/:id/toggle', reminderController.toggleReminder);
router.delete('/:id', reminderController.deleteReminder);

export default router;

