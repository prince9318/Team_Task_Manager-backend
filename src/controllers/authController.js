const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const createToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  if (role === 'Admin') {
    const existingAdmin = await User.exists({ role: 'Admin' });
    if (existingAdmin) {
      return res.status(409).json({
        message: 'Admin account already exists. Please sign up as Member.',
      });
    }
  }

  const user = await User.create({ name, email, password, role });

  return res.status(201).json({
    token: createToken(user),
    user: formatUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.json({
    token: createToken(user),
    user: formatUser(user),
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = {
  signup,
  login,
  getCurrentUser,
};
