import path from 'path';
import fs from 'fs';
import { getFileUrl, deleteFile } from '../utils/upload';
import { logInfo, logError } from '../utils/logger';

export class FileService {
  /**
   * Process uploaded logo file
   * For now, just returns the filename
   * In the future, you can add image optimization here using sharp
   */
  async processLogoFile(filename: string): Promise<string> {
    try {
      logInfo('Processing logo file', { filename });
      
      // TODO: Add image optimization using sharp if needed
      // Example:
      // const sharp = require('sharp');
      // const inputPath = path.join(__dirname, '../../uploads/logos', filename);
      // const outputPath = path.join(__dirname, '../../uploads/logos', `optimized-${filename}`);
      // await sharp(inputPath)
      //   .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      //   .jpeg({ quality: 85 })
      //   .toFile(outputPath);
      
      return filename;
    } catch (error) {
      logError('Error processing logo file', error, { filename });
      throw error;
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
}

export default new FileService();

