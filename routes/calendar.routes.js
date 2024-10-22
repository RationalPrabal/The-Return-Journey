const express = require("express");
const Calendar = require("../models/calendar.model");
const { authMiddleware } = require("../middlewares/auth.middleware");
const calendarRouter = express.Router();

//! Create a new calendar
calendarRouter.post("/", authMiddleware, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // Extract user ID from token
  try {
    const newCalendar = new Calendar({ name, owner: userId });
    await newCalendar.save();
    res.status(201).send({
      message: "Calendar created successfully",
      calendar: newCalendar,
    });
  } catch (err) {
    res.status(500).send({
      message: "Server error during calendar creation",
      error: err.message,
    });
  }
});

//! Get all calendars for the current user
calendarRouter.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    const calendars = await Calendar.find({ owner: userId });
    res.status(200).send(calendars);
  } catch (err) {
    res.status(500).send({
      message: "Server error during calendar retrieval",
      error: err.message,
    });
  }
});

//! Update a calendar
calendarRouter.put("/:calendarId", authMiddleware, async (req, res) => {
  const { calendarId } = req.params;
  const { name } = req.body;
  const userId = req.user.id;
  try {
    const calendar = await Calendar.findOneAndUpdate(
      { _id: calendarId, owner: userId },
      { name },
      { new: true }
    );
    if (!calendar) {
      return res.status(404).send({ message: "Calendar not found" });
    }
    res.status(200).send({ message: "Calendar updated", calendar });
  } catch (err) {
    res.status(500).send({
      message: "Server error during calendar update",
      error: err.message,
    });
  }
});

//! Delete a calendar
calendarRouter.delete("/:calendarId", authMiddleware, async (req, res) => {
  const { calendarId } = req.params;
  const userId = req.user.id;
  try {
    const calendar = await Calendar.findOneAndDelete({
      _id: calendarId,
      owner: userId,
    });
    if (!calendar) {
      return res.status(404).send({ message: "Calendar not found" });
    }
    res.status(200).send({ message: "Calendar deleted successfully" });
  } catch (err) {
    res.status(500).send({
      message: "Server error during calendar deletion",
      error: err.message,
    });
  }
});

module.exports = { calendarRouter };
