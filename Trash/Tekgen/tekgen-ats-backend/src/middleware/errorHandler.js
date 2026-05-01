const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const config = require('../config/environment');

/**
 * Global error handler middleware
 * Must be registered last in middleware stack
 */
const errorHandler = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  const errorId = Date.now();

  // Log error with request context
  logger.error(
    `[${requestId}] Error ID: ${errorId} - ${err.message}`,
    err
  );

  // Prevent sensitive data exposure in production
  let message = err.message;
  let statusCode = 500;
  let data = null;

  if (config.NODE_ENV !== 'development') {
    message = 'An error occurred. Please try again later.';
  }

  // Express-validator errors
  if (err.array && typeof err.array === 'function') {
    const validationErrors = err.array();
    statusCode = 400;
    message = 'Validation failed';
    data = { errors: validationErrors };
  }
  // Prisma/Database errors
  else if (err.code === 'P2002') {
    statusCode = 409;
    message = 'This record already exists';
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  } else if (err.code === 'P2028') {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (err.code?.startsWith('P')) {
    // Other Prisma errors
    statusCode = 400;
    message = 'Database operation failed';
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid or malformed token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired. Please login again';
  }
  // Multer file upload errors
  else if (err.code === 'LIMIT_PART_COUNT') {
    statusCode = 400;
    message = 'Too many parts in form data';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File exceeds maximum size limit';
  } else if (err.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files uploaded';
  } else if (err.code === 'LIMIT_FIELD_KEY') {
    statusCode = 400;
    message = 'Field name too long';
  } else if (err.code === 'LIMIT_FIELD_VALUE') {
    statusCode = 400;
    message = 'Field value too large';
  }
  // Custom application errors
  else if (err.statusCode) {
    statusCode = err.statusCode;
  }
  // Handle common error types
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error occurred';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  }

  // Include error ID in response for debugging
  const responseData = {
    errorId,
    ...(config.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
    ...data,
  };

  return sendError(res, message, statusCode, responseData);
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: 'Resource not found',
    path: req.path,
  });
};

/**
 * Catch unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to send alert/notification
  if (config.NODE_ENV === 'production') {
    // sendAlert('Unhandled Rejection', reason);
  }
});

/**
 * Catch uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, restart process or send alert
  if (config.NODE_ENV === 'production') {
    // sendAlert('Uncaught Exception', error);
    process.exit(1);
  }
});

module.exports = {
  errorHandler,
  notFoundHandler,
};
