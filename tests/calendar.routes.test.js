// calendar.routes.test.js
const request = require("supertest");
const express = require("express");
const { calendarRouter } = require("../routes/calendar.routes");
const Calendar = require("../models/calendar.model");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Mock the Calendar model and the auth middleware
jest.mock("../models/calendar.model");
jest.mock("../middlewares/auth.middleware");

const app = express();
app.use(express.json());
app.use("/calendars", calendarRouter);

describe("Calendar Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks between tests
  });

  // Test the Create Calendar Route
  describe("POST /calendars", () => {
    test("should return 500 if there is a server error", async () => {
      const userId = "mockUserId";
      const calendarData = { name: "My Calendar" };

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.prototype.save = jest
        .fn()
        .mockRejectedValue(new Error("Server error")); // Mock error

      const response = await request(app).post("/calendars").send(calendarData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Server error during calendar creation",
        error: "Server error",
      });
    });
  });

  // Test the Get All Calendars Route
  describe("GET /calendars", () => {
    test("should retrieve all calendars for the current user", async () => {
      const userId = "mockUserId";
      const calendars = [
        { _id: "mockCalendarId", name: "My Calendar", owner: userId },
      ];

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.find.mockResolvedValue(calendars); // Mock find function

      const response = await request(app).get("/calendars");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(calendars);
    });

    test("should return 500 if there is a server error", async () => {
      const userId = "mockUserId";

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.find.mockRejectedValue(new Error("Server error")); // Mock error

      const response = await request(app).get("/calendars");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Server error during calendar retrieval",
        error: "Server error",
      });
    });
  });

  // Test the Update Calendar Route
  describe("PUT /calendars/:calendarId", () => {
    test("should update a calendar", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";
      const calendarData = { name: "Updated Calendar" };
      const updatedCalendar = {
        _id: calendarId,
        ...calendarData,
        owner: userId,
      };

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndUpdate = jest.fn().mockResolvedValue(updatedCalendar); // Mock update function

      const response = await request(app)
        .put(`/calendars/${calendarId}`)
        .send(calendarData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Calendar updated",
        calendar: updatedCalendar,
      });
    });

    test("should return 404 if calendar is not found", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";
      const calendarData = { name: "Updated Calendar" };

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndUpdate = jest.fn().mockResolvedValue(null); // Mock not found

      const response = await request(app)
        .put(`/calendars/${calendarId}`)
        .send(calendarData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Calendar not found" });
    });

    test("should return 500 if there is a server error", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";
      const calendarData = { name: "Updated Calendar" };

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndUpdate = jest
        .fn()
        .mockRejectedValue(new Error("Server error")); // Mock error

      const response = await request(app)
        .put(`/calendars/${calendarId}`)
        .send(calendarData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Server error during calendar update",
        error: "Server error",
      });
    });
  });

  // Test the Delete Calendar Route
  describe("DELETE /calendars/:calendarId", () => {
    test("should delete a calendar", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndDelete = jest
        .fn()
        .mockResolvedValue({ _id: calendarId }); // Mock delete function

      const response = await request(app).delete(`/calendars/${calendarId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: "Calendar deleted successfully",
      });
    });

    test("should return 404 if calendar is not found", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndDelete = jest.fn().mockResolvedValue(null); // Mock not found

      const response = await request(app).delete(`/calendars/${calendarId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: "Calendar not found" });
    });

    test("should return 500 if there is a server error", async () => {
      const userId = "mockUserId";
      const calendarId = "mockCalendarId";

      authMiddleware.mockImplementation((req, res, next) => {
        req.user = { id: userId }; // Mock user in request
        next();
      });

      Calendar.findOneAndDelete = jest
        .fn()
        .mockRejectedValue(new Error("Server error")); // Mock error

      const response = await request(app).delete(`/calendars/${calendarId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Server error during calendar deletion",
        error: "Server error",
      });
    });
  });
});
