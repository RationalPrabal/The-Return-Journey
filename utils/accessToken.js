const jwt = require("jsonwebtoken");
const generateAccessToken = (user) => {
  return jwt.sign(
    { email: user.email, id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Short-lived access token
  );
};

module.exports = {
  generateAccessToken,
};
