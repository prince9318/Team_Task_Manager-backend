const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, requireRole } = require('../middleware/auth');
const { getAllTasks, createTask, updateTask, updateTaskStatus, deleteTask } = require('../controllers/taskController');

const router = express.Router();

const taskValidators = [
  body('title').trim().isLength({ min: 3, max: 140 }).withMessage('Task title must be 3-140 characters long.'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 800 })
    .withMessage('Description must be under 800 characters.'),
  body('status').isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Invalid task status.'),
  body('priority').isIn(['Low', 'Medium', 'High']).withMessage('Invalid task priority.'),
  body('projectId').notEmpty().withMessage('Project is required.'),
  body('assigneeId').notEmpty().withMessage('Assignee is required.'),
  body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Due date must be a valid date.'),
];

const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.use(protect);

router.get('/', getAllTasks);
router.post('/', requireRole('Admin'), taskValidators, validationMiddleware, createTask);
router.put('/:id', requireRole('Admin'), taskValidators, validationMiddleware, updateTask);
router.patch(
  '/:id/status',
  [body('status').isIn(['Todo', 'In Progress', 'Review', 'Done']).withMessage('Invalid task status.')],
  validationMiddleware,
  updateTaskStatus
);
router.delete('/:id', requireRole('Admin'), deleteTask);

module.exports = router;
