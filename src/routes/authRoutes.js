const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { signup, login, getCurrentUser } = require('../controllers/authController');

const router = express.Router();

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post(
  '/signup',
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters long.'),
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must contain at least 6 characters.'),
    body('role').isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member.'),
  ],
  validationMiddleware,
  signup
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validationMiddleware,
  login
);

router.get('/me', protect, getCurrentUser);

module.exports = router;
