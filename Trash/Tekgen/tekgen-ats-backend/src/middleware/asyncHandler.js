const logger = require('../utils/logger');

/**
 * Wrapper for async route handlers to catch errors automatically
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async handler error', error);
      next(error);
    });
  };
};

/**
 * Higher-order function to wrap methods in classes
 */
const wrapAsync = (asyncFn) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      logger.error('Wrapped async error', error);
      throw error;
    }
  };
};

module.exports = {
  asyncHandler,
  wrapAsync,
};
