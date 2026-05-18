const xss = require('xss');
const logger = require('../utils/logger');

/**
 * Sanitize request body, query, and params to prevent XSS attacks
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Sanitization error', error);
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: 'Invalid request data',
    });
  }
};

/**
 * Recursively sanitize object values
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // Sanitize strings against XSS
    return xss(obj, {
      whiteList: {},
      stripIgnoredTag: true,
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

module.exports = {
  sanitizeRequest,
  sanitizeObject,
};
