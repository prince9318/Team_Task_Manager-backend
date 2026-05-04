const jwt = require('jsonwebtoken');

const generateToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

module.exports = generateToken;
