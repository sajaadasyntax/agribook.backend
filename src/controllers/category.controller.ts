import { Response } from 'express';
import { AuthenticatedRequest, CreateCategoryDto } from '../types';
import categoryService from '../services/category.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class CategoryController {
  getAllCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { type } = req.query;
    logInfo('Get all categories request', { userId, type });

    const categories = await categoryService.getAllCategories(
      userId,
      type as 'INCOME' | 'EXPENSE' | undefined
    );

    res.json(categories);
  });

  getCategoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    logInfo('Get category by ID request', { categoryId: id, userId });

    const category = await categoryService.getCategoryById(id, userId);

    res.json(category);
  });

  createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const data: CreateCategoryDto = req.body;
    logInfo('Create category request', { name: data.name, type: data.type, userId });

    const category = await categoryService.createCategory(data, userId);

    res.status(201).json(category);
  });

  deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    logInfo('Delete category request', { categoryId: id, userId });

    const result = await categoryService.deleteCategory(id, userId);

    res.json(result);
  });
}

export default new CategoryController();

