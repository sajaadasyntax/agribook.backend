import prisma from '../config/database';
import { NotFoundError, DatabaseError, ValidationError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { CategoryType } from '@prisma/client';
import { CreateCategoryDto } from '../types';

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

  async createCategory(data: CreateCategoryDto) {
    try {
      logInfo('Creating category', { name: data.name, type: data.type });

      // Check if category with same name and type already exists
      const existing = await prisma.category.findFirst({
        where: {
          name: data.name,
          type: data.type,
        },
      });

      if (existing) {
        throw new ValidationError('Category with this name already exists for this type', [
          { field: 'name', message: 'Category name already exists for this type' }
        ]);
      }

      const category = await prisma.category.create({
        data: {
          name: data.name,
          type: data.type,
          description: data.description,
        },
      });

      logInfo('Category created successfully', { categoryId: category.id, name: category.name });
      return category;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logError('Error creating category', error, { data });
      throw new DatabaseError('Failed to create category');
    }
  }

  async deleteCategory(categoryId: string) {
    try {
      logInfo('Deleting category', { categoryId });

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          transactions: {
            take: 1,
          },
        },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has transactions
      if (category.transactions.length > 0) {
        throw new ValidationError('Cannot delete category with existing transactions', [
          { field: 'id', message: 'Category has existing transactions' }
        ]);
      }

      await prisma.category.delete({
        where: { id: categoryId },
      });

      logInfo('Category deleted successfully', { categoryId });
      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logError('Error deleting category', error, { categoryId });
      throw new DatabaseError('Failed to delete category');
    }
  }
}

export default new CategoryService();

