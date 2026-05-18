const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Add unique request ID to each request for tracing
 */
const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  req.id = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log request start
  logger.info(`[${requestId}] ${req.method} ${req.path} - Started`);

  // Log response when sent
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - req.startTime;
    logger.info(`[${requestId}] ${req.method} ${req.path} - Completed in ${duration}ms - Status: ${res.statusCode}`);
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  requestIdMiddleware,
};
