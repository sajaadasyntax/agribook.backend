import prisma from '../config/database';
import { NotFoundError, DatabaseError, ValidationError } from '../utils/errors';
import { logInfo, logError } from '../utils/logger';
import { CategoryType } from '@prisma/client';
import { CreateCategoryDto } from '../types';

export class CategoryService {
  async getAllCategories(userId: string, type?: CategoryType) {
    try {
      logInfo('Fetching categories', { userId, type });

      const where: any = { userId };
      if (type) {
        where.type = type;
      }

      const categories = await prisma.category.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
      });

      logInfo('Categories fetched successfully', { count: categories.length, userId, type });
      return categories;
    } catch (error) {
      logError('Error fetching categories', error, { userId, type });
      throw new DatabaseError('Failed to fetch categories');
    }
  }

  async getCategoryById(categoryId: string, userId: string) {
    try {
      logInfo('Fetching category by ID', { categoryId, userId });

      const category = await prisma.category.findFirst({
        where: { 
          id: categoryId,
          userId: userId,
        },
      });

      if (!category) {
        logError('Category not found', new Error('Category not found'), { categoryId, userId });
        throw new NotFoundError('Category not found');
      }

      logInfo('Category fetched successfully', { categoryId, name: category.name, userId });
      return category;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logError('Error fetching category', error, { categoryId, userId });
      throw new DatabaseError('Failed to fetch category');
    }
  }

  async createCategory(data: CreateCategoryDto, userId: string) {
    try {
      logInfo('Creating category', { name: data.name, type: data.type, userId });

      // Check if category with same name and type already exists for this user
      const existing = await prisma.category.findFirst({
        where: {
          userId: userId,
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
          userId: userId,
        },
      });

      logInfo('Category created successfully', { categoryId: category.id, name: category.name, userId });
      return category;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logError('Error creating category', error, { data, userId });
      throw new DatabaseError('Failed to create category');
    }
  }

  async deleteCategory(categoryId: string, userId: string) {
    try {
      logInfo('Deleting category', { categoryId, userId });

      // Check if category exists and belongs to the user
      const category = await prisma.category.findFirst({
        where: { 
          id: categoryId,
          userId: userId,
        },
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

      logInfo('Category deleted successfully', { categoryId, userId });
      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logError('Error deleting category', error, { categoryId, userId });
      throw new DatabaseError('Failed to delete category');
    }
  }
}

export default new CategoryService();

