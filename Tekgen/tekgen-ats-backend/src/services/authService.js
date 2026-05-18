const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const config = require('../config/environment');
const { encryptPassword, comparePassword } = require('../utils/encryption');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    // Track failed login attempts in memory (in production, use Redis)
    this.loginAttempts = new Map();
    this.lockoutTimers = new Map();
  }

  /**
   * Register a new user with validation
   */
  async registerUser(email, password, firstName, lastName) {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Validate name length
      if (!firstName || firstName.length < 2 || firstName.length > 50) {
        throw new Error('First name must be between 2 and 50 characters');
      }

      if (!lastName || lastName.length < 2 || lastName.length > 50) {
        throw new Error('Last name must be between 2 and 50 characters');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        logger.warn(`Registration attempt with existing email: ${normalizedEmail}`);
        throw new Error('Email already registered');
      }

      // The password validation is expected to be done by the controller
      // Encrypt password with configurable  rounds
      const hashedPassword = await encryptPassword(password, config.BCRYPT_ROUNDS);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'RECRUITER', // Default role
          lastLoginAt: null,
          loginAttempts: 0,
          isAccountLocked: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info(`User registered successfully: ${normalizedEmail}`);

      // Generate token
      const token = this.generateToken(user);

      return {
        user,
        token,
      };
    } catch (error) {
      logger.error('Registration error', error);
      throw error;
    }
  }

  /**
   * Login user with attempt tracking and account lockout
   */
  async loginUser(email, password) {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if account is locked
      if (this.isAccountLocked(normalizedEmail)) {
        const lockoutTime = this.getRemainingLockoutTime(normalizedEmail);
        logger.warn(`Login attempt on locked account: ${normalizedEmail}`);
        throw new Error(`Account is locked. Try again in ${lockoutTime} seconds.`);
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        // Increment failed attempts (even for non-existent users to prevent user enumeration)
        this.recordFailedLoginAttempt(normalizedEmail);
        logger.warn(`Login attempt with non-existent email: ${normalizedEmail}`);
        throw new Error('Invalid email or password');
      }

      // Check if account is locked in database
      if (user.isAccountLocked) {
        logger.warn(`Login attempt on locked account in DB: ${normalizedEmail}`);
        throw new Error('Account is locked. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        this.recordFailedLoginAttempt(normalizedEmail);
        const attemptsLeft = config.MAX_LOGIN_ATTEMPTS - (this.getLoginAttempts(normalizedEmail) || 0);
        logger.warn(`Failed login attempt for: ${normalizedEmail} (${attemptsLeft} attempts left)`);
        throw new Error('Invalid email or password');
      }

      // Clear login attempts on successful login
      this.clearLoginAttempts(normalizedEmail);

      // Update last login time
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginAttempts: 0,
        },
      });

      // Generate token
      const token = this.generateToken(user);

      logger.info(`User logged in successfully: ${normalizedEmail}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          avatar: user.avatar,
          phone: user.phone,
          department: user.department,
          mustChangePassword: !user.lastLoginAt,
          canDeleteCandidates: user.canDeleteCandidates || false,
        },
        token,
      };
    } catch (error) {
      logger.error('Login error', error);
      throw error;
    }
  }

  /**
   * Update user profile with validation
   */
  async updateProfile(userId, updateData) {
    try {
      // Validate user ID
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Prepare update data (only allow specific fields)
      const allowedFields = ['firstName', 'lastName', 'phone', 'department', 'avatar'];
      const update = {};

      for (const field of allowedFields) {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          update[field] = updateData[field].toString().trim();
        }
      }

      if (Object.keys(update).length === 0) {
        throw new Error('No valid fields to update');
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: update,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          department: true,
          avatar: true,
        },
      });

      logger.info(`User profile updated: ${user.email}`);
      return user;
    } catch (error) {
      logger.error('Profile update error', error);
      throw error;
    }
  }

  /**
   * Change password with validation
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        logger.warn(`Password change attempt for non-existent user: ${userId}`);
        throw new Error('User not found');
      }

      // Verify old password
      const isPasswordValid = await comparePassword(oldPassword, user.password);

      if (!isPasswordValid) {
        logger.warn(`Failed password change attempt for: ${user.email}`);
        throw new Error('Current password is incorrect');
      }

      // Check if new password is the same as old password
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        throw new Error('New password must be different from current password');
      }

      // Hash new password
      const hashedPassword = await encryptPassword(newPassword, config.BCRYPT_ROUNDS);

      // Update password and reset login attempts
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          lastLoginAt: new Date(),
          loginAttempts: 0,
          isAccountLocked: false,
        },
      });

      logger.info(`Password changed successfully for: ${user.email}`);
      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Change password error', error);
      throw error;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    try {
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          canDeleteCandidates: user.canDeleteCandidates || false,
        },
        config.JWT_SECRET,
        {
          expiresIn: config.JWT_EXPIRY,
          algorithm: 'HS256',
        }
      );

      return token;
    } catch (error) {
      logger.error('Token generation error', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          department: true,
          avatar: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      return user;
    } catch (error) {
      logger.error('Get profile error', error);
      throw error;
    }
  }

  /**
   * Record failed login attempt
   */
  recordFailedLoginAttempt(email) {
    const key = email.toLowerCase();
    const attempts = (this.loginAttempts.get(key) || 0) + 1;
    this.loginAttempts.set(key, attempts);

    logger.warn(`Failed login attempt recorded for ${key} (${attempts}/${config.MAX_LOGIN_ATTEMPTS})`);

    // Lock account after max attempts
    if (attempts >= config.MAX_LOGIN_ATTEMPTS) {
      this.lockAccount(key);
    }
  }

  /**
   * Lock user account temporarily
   */
  lockAccount(email) {
    const key = email.toLowerCase();
    logger.warn(`Account locked due to multiple failed attempts: ${key}`);

    // Set lockout timer
    const timer = setTimeout(() => {
      this.loginAttempts.delete(key);
      this.lockoutTimers.delete(key);
      logger.info(`Account lockout expired for: ${key}`);
    }, config.LOCK_TIME_MS);

    this.lockoutTimers.set(key, {
      timer,
      lockedAt: Date.now(),
    });
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(email) {
    const key = email.toLowerCase();
    return this.lockoutTimers.has(key);
  }

  /**
   * Get remaining lockout time in seconds
   */
  getRemainingLockoutTime(email) {
    const key = email.toLowerCase();
    const lockout = this.lockoutTimers.get(key);
    if (!lockout) return 0;

    const remaining = Math.ceil((config.LOCK_TIME_MS - (Date.now() - lockout.lockedAt)) / 1000);
    return Math.max(remaining, 0);
  }

  /**
   * Get login attempts
   */
  getLoginAttempts(email) {
    const key = email.toLowerCase();
    return this.loginAttempts.get(key) || 0;
  }

  /**
   * Clear login attempts
   */
  clearLoginAttempts(email) {
    const key = email.toLowerCase();
    this.loginAttempts.delete(key);
  }
}

module.exports = new AuthService();
