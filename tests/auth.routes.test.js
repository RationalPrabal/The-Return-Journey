// auth.routes.test.js
const request = require("supertest");
const { authRouter } = require("../routes/auth.routes"); // Import your router
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Mock the User model and token generation utilities
jest.mock("../models/user.model");
jest.mock("bcrypt", () => ({
  compare: jest.fn(), // Mock the compare function
}));
jest.mock("../utils/accessToken");
jest.mock("../utils/refreshToken");

const User = require("../models/user.model");
const { generateAccessToken } = require("../utils/accessToken");
const { generateRefreshToken } = require("../utils/refreshToken");

const app = express();
app.use(express.json());
app.use("/auth", authRouter); // Use authRouter in the app

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks between tests
  });

  // Test the Register Route
  describe("POST /auth/register", () => {
    test("should register a new user and return access & refresh tokens", async () => {
      const userData = {
        email: "test@example.com",
        password: "password",
        name: "Test User",
      };

      User.findOne.mockResolvedValue(null); // No user found (for new registration)
      User.prototype.save = jest.fn(); // Mock save function
      bcrypt.hash = jest.fn((password, salt, cb) => cb(null, "hashedPassword")); // Mock bcrypt hash

      generateAccessToken.mockReturnValue("accessToken");
      generateRefreshToken.mockReturnValue("refreshToken");

      const response = await request(app).post("/auth/register").send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: "Registration successful",
        accessToken: "accessToken",
        refreshToken: "refreshToken",
      });
      expect(User.prototype.save).toHaveBeenCalledTimes(2); // Save is called twice (user and refresh token)
    });

    test("should return 400 if user is already registered", async () => {
      User.findOne.mockResolvedValue({ email: "test@example.com" });

      const response = await request(app).post("/auth/register").send({
        email: "test@example.com",
        password: "password",
        name: "Test User",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: "User already registered" });
    });
  });

  // Test the Login Route
  describe("POST /auth/login", () => {
    test("should return 400 if user not found", async () => {
      User.findOne.mockResolvedValue(null); // No user found

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password: "password" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid credentials, user not found",
      });
    });

    test("should return 400 if password is incorrect", async () => {
      const user = { email: "test@example.com", password: "hashedPassword" };

      User.findOne.mockResolvedValue(user); // Mock user exists
      bcrypt.compare = jest.fn().mockResolvedValue(false); // Mock password mismatch

      const response = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password: "wrongPassword" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Invalid credentials, incorrect password",
      });
    });
  });

  // Test the Refresh Token Route
  describe("POST /auth/refresh-token", () => {
    test("should return 403 if refresh token is invalid", async () => {
      User.findOne.mockResolvedValue(null); // No user with refresh token

      const response = await request(app)
        .post("/auth/refresh-token")
        .send({ refreshToken: "invalidToken" });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ message: "Invalid refresh token" });
    });
  });

  // Test the Logout Route
  describe("POST /auth/logout", () => {
    test("should logout user and remove refresh token", async () => {
      User.findOneAndUpdate.mockResolvedValue({ email: "test@example.com" }); // Mock user found and updated

      const response = await request(app)
        .post("/auth/logout")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Logout successful" });
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { email: "test@example.com" },
        { refreshToken: null }
      );
    });
  });
});
