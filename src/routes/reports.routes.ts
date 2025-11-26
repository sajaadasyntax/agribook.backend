import { Router } from 'express';
import reportController from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/summary', reportController.getSummary);
router.get('/daily', reportController.getDailyReport);
router.get('/weekly', reportController.getWeeklyReport);
router.get('/monthly', reportController.getMonthlyReport);
router.get('/statistics', reportController.getStatistics);

export default router;

