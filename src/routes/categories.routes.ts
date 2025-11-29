import { Router } from 'express';
import categoryController from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication for consistency
// Note: Categories are global (not user-specific), but authentication ensures
// only authenticated users can access/manage categories
router.use(authenticate);

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

export default router;

