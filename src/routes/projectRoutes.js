const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, requireRole } = require('../middleware/auth');
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');

const router = express.Router();

const projectValidators = [
  body('name').trim().isLength({ min: 3, max: 120 }).withMessage('Project name must be 3-120 characters long.'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be under 500 characters.'),
  body('status').isIn(['Planning', 'Active', 'Completed']).withMessage('Invalid project status.'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Due date must be a valid date.'),
  body('memberIds').optional().isArray().withMessage('Members must be provided as an array.'),
];

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.use(protect);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', requireRole('Admin'), projectValidators, validationMiddleware, createProject);
router.put('/:id', requireRole('Admin'), projectValidators, validationMiddleware, updateProject);
router.delete('/:id', requireRole('Admin'), deleteProject);

module.exports = router;
