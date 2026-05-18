const validator = require('validator');
const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * Validate email format
 */
const validateEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password must be a string' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true, message: 'Password is strong' };
};

/**
 * Validate URL format
 */
const validateUrl = (url) => {
  return validator.isURL(url);
};

/**
 * Validate phone number
 */
const validatePhone = (phone) => {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

/**
 * Sanitize and validate string
 */
const sanitizeString = (str, options = {}) => {
  if (typeof str !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = str.trim();

  if (options.toLowerCase) {
    sanitized = sanitized.toLowerCase();
  }

  if (options.removeSpecialChars) {
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  const maxLength = options.maxLength || 500;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

/**
 * Middleware to validate object against a schema
 */
const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const messages = error.details.map(detail => detail.message);
        return sendError(res, 'Validation failed', 400, { errors: messages });
      }

      req.validatedBody = value;
      next();
    } catch (err) {
      logger.error('Schema validation error', err);
      return sendError(res, 'Invalid request format', 400);
    }
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUrl,
  validatePhone,
  sanitizeString,
  validateSchema,
};
