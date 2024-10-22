const jwt = require("jsonwebtoken");
const generateRefreshToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id, name: user.name, role: user.role },
    process.env.JWT_REFRESH_SECRET, // Use a different secret for refresh tokens
    { expiresIn: "30d" } // Long-lived refresh token
  );
};

module.exports = {
  generateRefreshToken,
};
