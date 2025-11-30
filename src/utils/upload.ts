import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { logInfo, logError } from './logger';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename: timestamp-userId-originalname
    const userId = (req as any).user?.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}-${userId}${ext}`;
    logInfo('File upload', { filename, userId, originalName: file.originalname });
    cb(null, filename);
  },
});

// File filter - only allow images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
    logError('File upload rejected', error, { mimetype: file.mimetype, originalName: file.originalname });
    cb(error);
  }
};

// Configure multer
export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Helper function to get file URL
export const getFileUrl = (filename: string | null | undefined): string | null => {
  if (!filename) return null;
  
  // If it's already a full URL, return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // If it's a base64 data URI, return as is (for backward compatibility)
  if (filename.startsWith('data:')) {
    return filename;
  }
  
  // If it's already a relative path (starts with /uploads), return as is
  if (filename.startsWith('/uploads/')) {
    return filename;
  }
  
  // Otherwise, it's just a filename - return relative URL that will be served by static middleware
  return `/uploads/logos/${filename}`;
};

// Helper function to delete old file
export const deleteFile = (filename: string | null | undefined): void => {
  if (!filename) return;
  
  // Don't delete if it's a URL or base64
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return;
  }
  
  // Extract just the filename if it's a path
  let actualFilename = filename;
  if (filename.startsWith('/uploads/logos/')) {
    actualFilename = filename.replace('/uploads/logos/', '');
  } else if (filename.startsWith('/uploads/')) {
    actualFilename = filename.replace('/uploads/', '');
  }
  
  const filePath = path.join(uploadsDir, actualFilename);
  
  fs.unlink(filePath, (err) => {
    if (err) {
      // File might not exist, that's okay
      logError('Error deleting file', err, { filename, actualFilename });
    } else {
      logInfo('File deleted', { filename, actualFilename });
    }
  });
};

