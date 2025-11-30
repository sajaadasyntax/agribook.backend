import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import userService from '../services/user.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class UserController {
  loginUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, phone, password } = req.body;
    
    logInfo('Login user request', { email, phone });

    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone is required for login' });
    }

    const result = await userService.loginUser(email, phone, password);

    return res.status(200).json(result);
  });

  registerUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, name, phone, password, companyName } = req.body;
    const logoFile = (req as any).file; // File from multer
    
    logInfo('Register user request', { 
      email, 
      name, 
      companyName,
      hasFile: !!logoFile,
      fileName: logoFile?.filename 
    });

    // If logo file was uploaded, use the filename; otherwise logoUrl is undefined
    const logoFilename = logoFile?.filename;

    const result = await userService.registerUser(email, name, phone, password, companyName, undefined, logoFilename);

    return res.status(201).json(result);
  });

  createOrGetUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, name, phone, companyName } = req.body;
    const logoFile = (req as any).file; // File from multer
    
    logInfo('Create/get user request', { 
      email, 
      name, 
      companyName,
      hasFile: !!logoFile,
      fileName: logoFile?.filename 
    });

    // If logo file was uploaded, use the filename; otherwise logoUrl is undefined
    const logoFilename = logoFile?.filename;

    const result = await userService.createOrGetUser(email, name, phone, companyName, undefined, logoFilename);

    return res.status(201).json(result);
  });

  refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;
    
    logInfo('Refresh token request');

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const result = await userService.refreshAccessToken(refreshToken);

    return res.status(200).json(result);
  });

  logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { refreshToken } = req.body;
    
    logInfo('Logout request', { userId: req.userId });

    if (refreshToken) {
      await userService.logout(refreshToken);
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  });

  logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    logInfo('Logout all devices request', { userId });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await userService.logoutAll(userId);

    return res.status(200).json({ message: 'Logged out from all devices successfully' });
  });

  getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    logInfo('Get user by ID request', { userId: id });

    const user = await userService.getUserById(id);

    return res.json(user);
  });

  getCurrentUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    
    logInfo('Get current user request', { userId });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await userService.getUserById(userId);

    return res.json(user);
  });

  updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { name, phone, companyName, logoUrl } = req.body;
    const logoFile = (req as any).file; // File from multer
    
    logInfo('Update user request', { 
      userId, 
      fields: Object.keys(req.body),
      hasFile: !!logoFile,
      fileName: logoFile?.filename 
    });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // If logo file was uploaded, use the filename instead of logoUrl from body
    const logoFilename = logoFile?.filename;
    
    // If a file was uploaded, ignore logoUrl from body (file takes precedence)
    const finalLogoUrl = logoFile ? undefined : logoUrl;

    const user = await userService.updateUser(
      userId, 
      { name, phone, companyName, logoUrl: finalLogoUrl },
      logoFilename
    );

    return res.json(user);
  });

  changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    
    logInfo('Change password request', { userId });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }

    await userService.changePassword(userId, currentPassword || '', newPassword);

    return res.status(200).json({ message: 'Password changed successfully' });
  });
}

export default new UserController();
