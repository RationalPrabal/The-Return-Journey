require("dotenv").config();
const express = require("express");
const User = require("../models/user.model");
const authRouter = express.Router();
const bcrypt = require("bcrypt");
const { generateAccessToken } = require("../utils/accessToken");
const { generateRefreshToken } = require("../utils/refreshToken");

//! Register Route with refresh token
authRouter.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
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
authRouter.post("/logout", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user and remove the refresh token
    await User.findOneAndUpdate({ email }, { refreshToken: null });

    return res.status(200).send({ message: "Logout successful" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Server error during logout", error: err.message });
  }
});

module.exports = {
  authRouter,
};
