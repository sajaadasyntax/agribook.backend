import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { getFileUrl, deleteFile } from '../utils/upload';
import { logInfo, logError } from '../utils/logger';

// Image optimization configuration
const IMAGE_CONFIG = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 85,
  format: 'jpeg' as const,
};

export class FileService {
  /**
   * Process uploaded logo file with optimization
   * - Resizes to max 512x512 (maintaining aspect ratio)
   * - Converts to JPEG with 85% quality
   * - Returns the optimized filename
   */
  async processLogoFile(filename: string): Promise<string> {
    try {
      logInfo('Processing logo file', { filename });
      
      const uploadsDir = path.join(__dirname, '../../uploads/logos');
      const inputPath = path.join(uploadsDir, filename);
      
      // Generate optimized filename
      const ext = path.extname(filename);
      const baseName = path.basename(filename, ext);
      const optimizedFilename = `${baseName}.jpg`; // Always output as JPEG
      const outputPath = path.join(uploadsDir, optimizedFilename);
      
      // Check if file exists
      if (!fs.existsSync(inputPath)) {
        logError('File not found for optimization', new Error('File not found'), { filename, inputPath });
        return filename; // Return original if not found
      }
      
      // Get file stats for logging
      const stats = fs.statSync(inputPath);
      const originalSize = stats.size;
      
      // Process image with sharp
      await sharp(inputPath)
        .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: IMAGE_CONFIG.quality,
          progressive: true,
        })
        .toFile(outputPath);
      
      // Get optimized file stats
      const optimizedStats = fs.statSync(outputPath);
      const optimizedSize = optimizedStats.size;
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      logInfo('Logo file optimized', {
        originalFilename: filename,
        optimizedFilename,
        originalSize: `${(originalSize / 1024).toFixed(1)}KB`,
        optimizedSize: `${(optimizedSize / 1024).toFixed(1)}KB`,
        savings: `${savings}%`,
      });
      
      // Delete original if it's different from optimized
      if (inputPath !== outputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
        logInfo('Original file deleted after optimization', { filename });
      }
      
      return optimizedFilename;
    } catch (error) {
      logError('Error processing logo file', error, { filename });
      // Return original filename if optimization fails
      return filename;
    }
  }

  /**
   * Get the URL for a logo file
   */
  getLogoUrl(filename: string | null | undefined): string | null {
    return getFileUrl(filename);
  }

  /**
   * Delete a logo file
   */
  deleteLogoFile(filename: string | null | undefined): void {
    deleteFile(filename);
  }

  /**
   * Check if file exists
   */
  fileExists(filename: string | null | undefined): boolean {
    if (!filename) return false;
    
    // Don't check URLs or base64
    if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
      return true; // Assume exists if it's a URL
    }
    
    // Extract just the filename if it's a path
    let actualFilename = filename;
    if (filename.startsWith('/uploads/logos/')) {
      actualFilename = filename.replace('/uploads/logos/', '');
    } else if (filename.startsWith('/uploads/')) {
      actualFilename = filename.replace('/uploads/', '');
    }
    
    const filePath = path.join(__dirname, '../../uploads/logos', actualFilename);
    return fs.existsSync(filePath);
  }

  /**
   * Get image metadata
   */
  async getImageMetadata(filename: string): Promise<{ width: number; height: number; format: string } | null> {
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/logos');
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const metadata = await sharp(filePath).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
      };
    } catch (error) {
      logError('Error getting image metadata', error, { filename });
      return null;
    }
  }
}

export default new FileService();
