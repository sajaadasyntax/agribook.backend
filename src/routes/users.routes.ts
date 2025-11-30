import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { uploadLogo } from '../utils/upload';

const router = Router();

// Authentication routes
router.post('/login', userController.loginUser);
router.post('/register', uploadLogo.single('logo'), userController.registerUser);

// Legacy route (for backward compatibility, but should be deprecated)
router.post('/', uploadLogo.single('logo'), userController.createOrGetUser);

// Other routes
router.get('/:id', userController.getUserById);
router.put('/', authenticate, uploadLogo.single('logo'), userController.updateUser);

export default router;

