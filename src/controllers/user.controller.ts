import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import userService from '../services/user.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class UserController {
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

    res.status(201).json(result);
  });

  getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    logInfo('Get user by ID request', { userId: id });

    const user = await userService.getUserById(id);

    res.json(user);
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
}

export default new UserController();

