const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { getAllUsers } = require('../controllers/userController');

const router = express.Router();

router.get('/', protect, requireRole('Admin'), getAllUsers);

module.exports = router;
