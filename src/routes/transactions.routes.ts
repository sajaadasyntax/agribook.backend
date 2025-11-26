import { Router } from 'express';
import transactionController from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';
import {
  transactionValidation,
  updateTransactionValidation,
  validate,
} from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/', transactionController.getTransactions);
router.get('/:id', transactionController.getTransactionById);
router.post('/', validate(transactionValidation), transactionController.createTransaction);
router.put('/:id', validate(updateTransactionValidation), transactionController.updateTransaction);
router.delete('/:id', transactionController.deleteTransaction);

export default router;

