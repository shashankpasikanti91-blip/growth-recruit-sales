const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Authenticate JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return sendError(res, 'No authorization token provided', 401);
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Invalid authorization header format', 401);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (!token || token.trim() === '') {
      return sendError(res, 'Empty authorization token', 401);
    }

    // Verify token with timeout
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256'],
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        logger.warn(`[${req.id}] Expired token for user`);
        return sendError(res, 'Token has expired. Please login again.', 401);
      } else if (jwtError.name === 'JsonWebTokenError') {
        logger.warn(`[${req.id}] Invalid token signature`);
        return sendError(res, 'Invalid token signature', 401);
      }
      throw jwtError;
    }

    // Validate token structure
    if (!decoded.id || !decoded.email) {
      logger.error(`[${req.id}] Invalid token payload structure`);
      return sendError(res, 'Invalid token structure', 401);
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'RECRUITER',
      canDeleteCandidates: decoded.canDeleteCandidates || false,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    logger.debug(`[${req.id}] User authenticated: ${req.user.email}`);
    next();
  } catch (error) {
    logger.error(`[${req.id}] Authentication error`, error);
    return sendError(res, 'Authentication failed', 401);
  }
};

/**
 * Authorize user by role(s)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required', 401);
      }

      const userRole = req.user.role;

      if (!allowedRoles.includes(userRole)) {
        logger.warn(
          `[${req.id}] Unauthorized access attempt - User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`
        );
        return sendError(res, 'Insufficient permissions for this action', 403);
      }

      logger.debug(`[${req.id}] User authorized with role: ${userRole}`);
      next();
    } catch (error) {
      logger.error(`[${req.id}] Authorization error`, error);
      return sendError(res, 'Authorization failed', 403);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without user info
      return next();
    }

    const token = authHeader.slice(7);

    if (!token || token.trim() === '') {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.id && decoded.email) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'RECRUITER',
        };
      }
    } catch (error) {
      // Silently ignore token errors for optional auth
      logger.debug('Optional auth token verification failed');
    }

    next();
  } catch (error) {
    logger.error(`[${req.id}] Optional authentication error`, error);
    next();
  }
};

/**
 * Require ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return sendError(res, 'Admin access required', 403);
  }
  next();
};

/**
 * RBAC: build a Prisma `where` clause scoped to the user's role
 * - ADMIN: no filter (sees all)
 * - MANAGER: sees own data + team data (same department — future: add teamId)
 * - RECRUITER: sees only own data
 *
 * Usage: const scope = rbacScope(req.user, 'userId');
 *        prisma.job.findMany({ where: scope });
 */
const rbacScope = (user, ownerField = 'userId') => {
  if (!user) return { [ownerField]: '__none__' };
  if (user.role === 'ADMIN') return {};
  // MANAGER sees own data — extend here when team model is added
  return { [ownerField]: user.id };
};

/**
 * Middleware that attaches rbacScope helper to req
 */
const withRbac = (req, res, next) => {
  req.rbacScope = (ownerField = 'userId') => rbacScope(req.user, ownerField);
  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  requireAdmin,
  rbacScope,
  withRbac,
};
