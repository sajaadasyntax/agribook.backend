import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import userService from '../services/user.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class UserController {
  createOrGetUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { email, name, phone } = req.body;
    logInfo('Create/get user request', { email, name });

    const result = await userService.createOrGetUser(email, name, phone);

    res.status(201).json(result);
  });

  getUserById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    logInfo('Get user by ID request', { userId: id });

    const user = await userService.getUserById(id);

    res.json(user);
  });
}

export default new UserController();

