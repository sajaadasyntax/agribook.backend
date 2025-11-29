import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { uploadLogo } from '../utils/upload';

const router = Router();

router.post('/', userController.createOrGetUser);
router.get('/:id', userController.getUserById);
router.put('/', authenticate, uploadLogo.single('logo'), userController.updateUser);

export default router;

