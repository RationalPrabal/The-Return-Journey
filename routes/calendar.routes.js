const express = require("express");
const Calendar = require("../models/calendar.model");
const { authMiddleware } = require("../middlewares/auth.middleware");
const calendarRouter = express.Router();

//! Create a new calendar
/**
 * @swagger
 * /calendars:
 *   post:
 *     summary: Create a new calendar
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Calendar details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Work Calendar
 *     responses:
 *       201:
 *         description: Calendar created successfully
 *       500:
 *         description: Server error during calendar creation
 */
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
/**
 * @swagger
 * /calendars:
 *   get:
 *     summary: Get all calendars for the current user
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of calendars retrieved successfully
 *       500:
 *         description: Server error during calendar retrieval
 */
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
/**
 * @swagger
 * /calendars/{calendarId}:
 *   put:
 *     summary: Update a calendar
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the calendar to update
 *     requestBody:
 *       description: Updated calendar name
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Personal Calendar
 *     responses:
 *       200:
 *         description: Calendar updated successfully
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Server error during calendar update
 */
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
/**
 * @swagger
 * /calendars/{calendarId}:
 *   delete:
 *     summary: Delete a calendar
 *     tags: [Calendars]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the calendar to delete
 *     responses:
 *       200:
 *         description: Calendar deleted successfully
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Server error during calendar deletion
 */
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
