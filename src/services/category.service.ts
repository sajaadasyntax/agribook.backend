import prisma from '../config/database';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { CategoryType } from '@prisma/client';

export class CategoryService {
  async getAllCategories(type?: CategoryType) {
    try {
      logInfo('Fetching categories', { type });

      const where = type ? { type } : {};

      const categories = await prisma.category.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });

      logInfo('Categories fetched successfully', { count: categories.length, type });
      return categories;
    } catch (error) {
      logError('Error fetching categories', error, { type });
      throw new DatabaseError('Failed to fetch categories');
    }
  }

  async getCategoryById(categoryId: string) {
    try {
      logInfo('Fetching category by ID', { categoryId });

      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        logError('Category not found', new Error('Category not found'), { categoryId });
        throw new NotFoundError('Category not found');
      }

      logInfo('Category fetched successfully', { categoryId, name: category.name });
      return category;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching category', error, { categoryId });
      throw new DatabaseError('Failed to fetch category');
    }
  }
}

export default new CategoryService();

