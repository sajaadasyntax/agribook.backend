import { Response } from 'express';
import { AuthenticatedRequest, CreateCategoryDto } from '../types';
import categoryService from '../services/category.service';
import { asyncHandler } from '../middleware/asyncHandler';
import { logInfo } from '../utils/logger';

export class CategoryController {
  getAllCategories = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { type } = req.query;
    logInfo('Get all categories request', { type });

    const categories = await categoryService.getAllCategories(
      type as 'INCOME' | 'EXPENSE' | undefined
    );

    res.json(categories);
  });

  getCategoryById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    logInfo('Get category by ID request', { categoryId: id });

    const category = await categoryService.getCategoryById(id);

    res.json(category);
  });

  createCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data: CreateCategoryDto = req.body;
    logInfo('Create category request', { name: data.name, type: data.type });

    const category = await categoryService.createCategory(data);

    res.status(201).json(category);
  });

  deleteCategory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    logInfo('Delete category request', { categoryId: id });

    const result = await categoryService.deleteCategory(id);

    res.json(result);
  });
}

export default new CategoryController();

