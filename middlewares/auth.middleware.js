const jwt = require("jsonwebtoken");
const Blacklist = require("../models/blacklist.model"); // Import Blacklist model

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from the Authorization header
    const token = req.headers.authorization;
    if (!token) {
      return res.status(403).json({ message: "No token provided" });
    }

    // Check if the token is blacklisted
    const blacklistedToken = await Blacklist.findOne({ token });
    if (blacklistedToken) {
      return res.status(403).json({ message: "Token has been revoked" });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Attach user information to the request object
      req.user = decoded;
      next(); // Proceed to the next middleware or route handler
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { authMiddleware };
