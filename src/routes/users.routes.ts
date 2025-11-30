import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { uploadLogo } from '../utils/upload';

const router = Router();

// Authentication routes (public)
router.post('/login', userController.loginUser);
router.post('/register', uploadLogo.single('logo'), userController.registerUser);
router.post('/refresh-token', userController.refreshToken);

// Logout routes
router.post('/logout', userController.logout);
router.post('/logout-all', authenticate, userController.logoutAll);

// Legacy route (for backward compatibility, deprecated)
router.post('/', uploadLogo.single('logo'), userController.createOrGetUser);

// Protected routes
router.get('/me', authenticate, userController.getCurrentUser);
router.put('/', authenticate, uploadLogo.single('logo'), userController.updateUser);
router.post('/change-password', authenticate, userController.changePassword);

// User lookup (protected)
router.get('/:id', authenticate, userController.getUserById);

export default router;
