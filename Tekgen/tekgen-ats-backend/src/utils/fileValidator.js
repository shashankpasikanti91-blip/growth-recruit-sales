const path = require('path');
const fs = require('fs');
const config = require('../config/environment');
const logger = require('./logger');

/**
 * Validate file upload
 */
const validateFileUpload = (file) => {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  // Check file size
  if (file.size > config.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${config.MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  if (!config.ALLOWED_FILE_TYPES.includes(fileExtension)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${config.ALLOWED_FILE_TYPES.join(', ')}`,
    };
  }

  // Validate MIME type
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Invalid file MIME type',
    };
  }

  return { valid: true };
};

/**
 * Safely delete uploaded file
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting file: ${filePath}`, error);
  }
};

/**
 * Generate safe filename
 */
const generateSafeFilename = (originalName) => {
  const timestamp = Date.now();
  const ext = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, ext).replace(/[^a-z0-9]/gi, '_').substring(0, 20);
  return `${timestamp}_${name}${ext}`;
};

/**
 * Get safe file path
 */
const getSafeFilePath = (filename) => {
  const uploadDir = path.resolve(config.UPLOAD_DIR);
  const filePath = path.resolve(config.UPLOAD_DIR, filename);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(uploadDir)) {
    throw new Error('Invalid file path');
  }

  return filePath;
};

module.exports = {
  validateFileUpload,
  deleteFile,
  generateSafeFilename,
  getSafeFilePath,
};
