const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { validatePassword } = require('../middleware/requestValidator');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, { errors: errors.array() });
      }

      const { email, password, confirmPassword, firstName, lastName } = req.body;

      // Validate password match
      if (password !== confirmPassword) {
        return sendError(res, 'Passwords do not match', 400);
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return sendError(res, passwordValidation.message, 400);
      }

      // Register user
      const result = await authService.registerUser(email, password, firstName, lastName);

      logger.info(`[${req.id}] User registered: ${email}`);
      return sendSuccess(res, result, 'Registration successful', 201);
    } catch (error) {
      logger.error(`[${req.id}] Register error`, error);
      
      if (error.message.includes('already registered')) {
        return sendError(res, 'Email already registered', 409);
      }
      
      return sendError(res, error.message || 'Registration failed', 400);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, { errors: errors.array() });
      }

      const { email, password } = req.body;
      const result = await authService.loginUser(email, password);

      logger.info(`[${req.id}] User logged in: ${email}`);
      return sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      logger.warn(`[${req.id}] Login failed for: ${req.body.email}`);
      
      if (error.message.includes('locked')) {
        return sendError(res, error.message, 429);
      }

      return sendError(res, 'Invalid email or password', 401);
    }
  }

  async getProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return sendError(res, 'Unauthorized', 401);
      }

      const user = await authService.getUserProfile(req.user.id);

      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      logger.debug(`[${req.id}] Profile retrieved for user: ${user.email}`);
      return sendSuccess(res, user, 'Profile retrieved', 200);
    } catch (error) {
      logger.error(`[${req.id}] Get profile error`, error);
      return sendError(res, error.message || 'Failed to retrieve profile', 500);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, { errors: errors.array() });
      }

      if (!req.user || !req.user.id) {
        return sendError(res, 'Unauthorized', 401);
      }

      // Filter input data
      const allowedFields = ['firstName', 'lastName', 'phone', 'department', 'avatar'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const user = await authService.updateProfile(req.user.id, updateData);

      logger.info(`[${req.id}] Profile updated for user: ${user.email}`);
      return sendSuccess(res, user, 'Profile updated successfully', 200);
    } catch (error) {
      logger.error(`[${req.id}] Update profile error`, error);
      return sendError(res, error.message || 'Failed to update profile', 500);
    }
  }

  async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendError(res, 'Validation failed', 400, { errors: errors.array() });
      }

      if (!req.user || !req.user.id) {
        return sendError(res, 'Unauthorized', 401);
      }

      const { oldPassword, newPassword, confirmPassword } = req.body;

      // Validate new passwords match
      if (newPassword !== confirmPassword) {
        return sendError(res, 'New passwords do not match', 400);
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return sendError(res, passwordValidation.message, 400);
      }

      // Check if old and new passwords are different
      if (oldPassword === newPassword) {
        return sendError(res, 'New password must be different from current password', 400);
      }

      const result = await authService.changePassword(req.user.id, oldPassword, newPassword);

      logger.info(`[${req.id}] Password changed for user: ${req.user.email}`);
      return sendSuccess(res, result, 'Password changed successfully', 200);
    } catch (error) {
      logger.warn(`[${req.id}] Password change failed for user: ${req.user?.email}`);
      
      if (error.message.includes('not found')) {
        return sendError(res, error.message, 404);
      }

      if (error.message.includes('incorrect')) {
        return sendError(res, 'Current password is incorrect', 401);
      }

      return sendError(res, error.message || 'Failed to change password', 400);
    }
  }
}

module.exports = new AuthController();
