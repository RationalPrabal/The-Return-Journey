require("dotenv").config();
const express = require("express");
const User = require("../models/user.model");
const authRouter = express.Router();
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../utils/accessToken");
const { generateRefreshToken } = require("../utils/refreshToken");
const { authMiddleware } = require("../middlewares/auth.middleware");
const { validateUserCredentials } = require("../utils/passwordValidation");
const jwt = require("jsonwebtoken");
const Blacklist = require("../models/blacklist.model");
//! Register Route with refresh token

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       description: User registration details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Validation error or user already registered
 *       500:
 *         description: Internal server error
 */
authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    // Validate email and password
    const validationError = validateUserCredentials(email, password);
    if (validationError) {
      return res.status(400).send({ message: validationError });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).send({ message: "User already registered" });
    }

    bcrypt.hash(password, 10, async (err, hash) => {
      if (err) {
        return res.status(500).send({ message: "Error hashing password" });
      } else {
        let newUser = new User({ email, password: hash, name });
        await newUser.save();

        const accessToken = generateAccessToken(newUser);
        const refreshToken = generateRefreshToken(newUser);

        // Store refresh token in the database
        newUser.refreshToken = refreshToken;
        await newUser.save();

        return res.status(201).send({
          message: "Registration successful",
          accessToken,
          refreshToken,
        });
      }
    });
  } catch (err) {
    return res.status(500).send({
      message: "Server error during registration",
      error: err.message,
    });
  }
});

//! Login Route with refresh token
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
 *     requestBody:
 *       description: User login credentials
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .send({ message: "Invalid credentials, user not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .send({ message: "Invalid credentials, incorrect password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in the database
    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).send({
      message: "Login successful",
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Server error during login", error: err.message });
  }
});

//! route to generate new access token with help of refresh token
/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Generate new access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       description: Refresh token required to generate new access token
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: yourRefreshToken
 *     responses:
 *       200:
 *         description: New access token generated
 *       401:
 *         description: Refresh token required
 *       403:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 */
authRouter.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).send({ message: "Refresh token required" });
  }

  try {
    // Find the user with the provided refresh token
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(403).send({ message: "Invalid refresh token" });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).send({ message: "Invalid refresh token" });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user);
      return res.status(200).send({
        accessToken: newAccessToken,
      });
    });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Server error", error: err.message });
  }
});

//! route to logout
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out a user and invalidate refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       description: User email for logout
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Logout successful
 *       500:
 *         description: Internal server error
 */
authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).send({ message: "Refresh token required" });
  }

  try {
    await Blacklist.create({
      token: refreshToken,
      expiresAt: new Date(Date.now()),
    });
    await User.updateOne({ refreshToken }, { refreshToken: null });
    return res.status(200).send({ message: "Logged out successfully" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Server error", error: err.message });
  }
});

//! Get all users with pagination (Protected route)
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       500:
 *         description: Internal server error
 */
authRouter.get("/users", authMiddleware, async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Default values
  const options = {
    page: parseInt(page), // Current page
    limit: parseInt(limit), // Records per page
  };

  try {
    // Fetch users based on pagination
    const users = await User.find()
      .select("-password -refreshToken") // Exclude sensitive fields
      .limit(options.limit) // Limit the results
      .skip((options.page - 1) * options.limit); // Skip previous pages

    // Get total count of users
    const totalUsers = await User.countDocuments();

    // Response format
    res.status(200).send({
      page: options.page,
      limit: options.limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / options.limit), // Calculate total pages
      users,
    });
  } catch (err) {
    res.status(500).send({
      message: "Server error during user retrieval",
      error: err.message,
    });
  }
});

//! Search for a user by email (Protected route)
/**
 * @swagger
 * /auth/users/search:
 *   get:
 *     summary: Search for a user by email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           example: user@example.com
 *         description: Email of the user to search
 *     responses:
 *       200:
 *         description: User details found
 *       400:
 *         description: Email query parameter missing
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
authRouter.get("/users/search", authMiddleware, async (req, res) => {
  const { email } = req.query;

  // Validate the query parameter
  if (!email) {
    return res
      .status(400)
      .send({ message: "Please provide an email to search." });
  }

  try {
    // Find the user based on the provided email
    const user = await User.findOne({ email }).select(
      "-password -refreshToken"
    ); // Exclude sensitive fields

    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Return the found user
    res.status(200).send(user);
  } catch (err) {
    res.status(500).send({
      message: "Server error during user search",
      error: err.message,
    });
  }
});

module.exports = {
  authRouter,
};
