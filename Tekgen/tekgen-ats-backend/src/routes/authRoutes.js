const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Register route
router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
], authController.register);

// Login route
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

// Protected routes
router.use((req, res, next) => {
  const { authenticate } = require('../middleware/auth');
  authenticate(req, res, next);
});

router.get('/profile', authController.getProfile);

router.put('/profile', [
  body('firstName').trim().notEmpty().optional(),
  body('lastName').trim().notEmpty().optional(),
  body('phone').optional(),
  body('department').optional(),
], authController.updateProfile);

router.post('/change-password', [
  body('oldPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  body('confirmPassword').notEmpty(),
], authController.changePassword);

module.exports = router;
