const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

module.exports = {
  getAllUsers,
};
