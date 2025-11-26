import { Router } from 'express';
import userController from '../controllers/user.controller';

const router = Router();

router.post('/', userController.createOrGetUser);
router.get('/:id', userController.getUserById);

export default router;

