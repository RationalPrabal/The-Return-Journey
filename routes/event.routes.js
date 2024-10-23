const express = require("express");
const Event = require("../models/event.model");
const Calendar = require("../models/calendar.model");
const { authMiddleware } = require("../middlewares/auth.middleware");
const eventRouter = express.Router();

//! Create a new event in a calendar
/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API for managing calendar events
 */

/**
 * @swagger
 * /{calendarId}/events:
 *   post:
 *     summary: Create a new event in a calendar
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         description: The ID of the calendar where the event will be created
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - title
 *               - startTime
 *               - endTime
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event:
 *                   type: object
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error during event creation
 */
eventRouter.post("/:calendarId/events", authMiddleware, async (req, res) => {
  const { calendarId } = req.params;
  const { title, description, startTime, endTime, location, attendees } =
    req.body;
  const userId = req.user.id;

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar || calendar.owner.toString() !== userId) {
      return res
        .status(403)
        .send({ message: "Access denied, you don't own this calendar" });
    }

    const newEvent = new Event({
      title,
      description,
      startTime,
      endTime,
      location,
      organizer: userId,
      attendees,
    });

    await newEvent.save();

    // Add event reference to the calendar
    calendar.events.push(newEvent._id);
    await calendar.save();

    res
      .status(201)
      .send({ message: "Event created successfully", event: newEvent });
  } catch (err) {
    res.status(500).send({
      message: "Server error during event creation",
      error: err.message,
    });
  }
});

//! Get all events in a calendar
/**
 * @swagger
 * /{calendarId}/events:
 *   get:
 *     summary: Get all events in a calendar
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         description: The ID of the calendar to retrieve events from
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of events in the calendar
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error during event retrieval
 */

eventRouter.get("/:calendarId/events", authMiddleware, async (req, res) => {
  const { calendarId } = req.params;
  const userId = req.user.id;

  try {
    const calendar = await Calendar.findById(calendarId).populate("events");
    if (!calendar || calendar.owner.toString() !== userId) {
      return res
        .status(403)
        .send({ message: "Access denied, you don't own this calendar" });
    }

    res.status(200).send(calendar.events);
  } catch (err) {
    res.status(500).send({
      message: "Server error during event retrieval",
      error: err.message,
    });
  }
});

//! Get details of a specific event
/**
 * @swagger
 * /events/{eventId}:
 *   get:
 *     summary: Get details of a specific event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         description: The ID of the event to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error during event retrieval
 */
eventRouter.get("/events/:eventId", authMiddleware, async (req, res) => {
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId)
      .populate("organizer", "-password -refreshToken") // Exclude sensitive fields
      .populate("attendees", "-password -refreshToken"); // Exclude sensitive fields
    if (!event) {
      return res.status(404).send({ message: "Event not found" });
    }

    res.status(200).send(event);
  } catch (err) {
    res.status(500).send({
      message: "Server error during event retrieval",
      error: err.message,
    });
  }
});

//! Update an event (only organizers can update)
/**
 * @swagger
 * /events/{eventId}:
 *   patch:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         description: The ID of the event to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               attendees:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error during event update
 */
eventRouter.patch("/events/:eventId", authMiddleware, async (req, res) => {
  const { eventId } = req.params;
  const userId = req.user.id;

  try {
    // Find the event and ensure the user is the organizer
    const event = await Event.findById(eventId);
    if (!event || event.organizer.toString() !== userId) {
      return res.status(403).send({
        message: "Access denied, only the organizer can update this event",
      });
    }

    // Use findByIdAndUpdate for partial updates
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $set: req.body }, // Only the fields in req.body will be updated
      { new: true, runValidators: true } // Return the updated document and run schema validations
    );

    res
      .status(200)
      .send({ message: "Event updated successfully", event: updatedEvent });
  } catch (err) {
    res.status(500).send({
      message: "Server error during event update",
      error: err.message,
    });
  }
});

//! Delete an event from any specified calendar
/**
 * @swagger
 * /{calendarId}/events/{eventId}:
 *   delete:
 *     summary: Delete an event from a calendar
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: calendarId
 *         required: true
 *         description: The ID of the calendar where the event is located
 *         schema:
 *           type: string
 *       - in: path
 *         name: eventId
 *         required: true
 *         description: The ID of the event to delete
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event removed from calendar successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found in this calendar
 *       500:
 *         description: Server error during event removal
 */

eventRouter.delete(
  "/:calendarId/events/:eventId",
  authMiddleware,
  async (req, res) => {
    const { calendarId, eventId } = req.params;
    const userId = req.user.id;

    try {
      const calendar = await Calendar.findById(calendarId);
      if (!calendar || calendar.owner.toString() !== userId) {
        return res
          .status(403)
          .send({ message: "Access denied, you don't own this calendar" });
      }

      // Check if the event exists in the calendar's event list
      if (!calendar.events.includes(eventId)) {
        return res
          .status(404)
          .send({ message: "Event not found in this calendar" });
      }

      // Remove the event from the calendar's event list
      calendar.events.pull(eventId);
      await calendar.save();

      res
        .status(200)
        .send({ message: "Event removed from calendar successfully" });
    } catch (err) {
      res.status(500).send({
        message: "Server error during event removal",
        error: err.message,
      });
    }
  }
);

//! get all events for a particular day
/**
 * @swagger
 * /events/day/{date}:
 *   get:
 *     summary: Get all events for a particular day
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: path
 *         required: true
 *         description: The date to retrieve events for in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           example: "2023-10-23"
 *     responses:
 *       200:
 *         description: List of events for the specified date
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       404:
 *         description: No events found for the specified date
 *       500:
 *         description: Server error during event retrieval
 */
eventRouter.get("/events/day/:date", authMiddleware, async (req, res) => {
  const { date } = req.params;
  const userId = req.user.id;

  try {
    // Parse the provided date as a local date
    const providedDate = new Date(date);

    if (isNaN(providedDate.getTime())) {
      return res.status(400).send({ message: "Invalid date format" });
    }

    // Ensure that the date is treated as local, and set to the beginning of the day
    const startOfDay = new Date(providedDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(providedDate.setHours(23, 59, 59, 999));

    // Find events where the user is the organizer and the event is within the day
    const events = await Event.find({
      organizer: userId,
      startTime: { $gte: startOfDay, $lt: endOfDay },
    }).populate("organizer attendees", "-password -refreshToken");

    if (events.length === 0) {
      return res
        .status(404)
        .send({ message: "No events found for the specified date" });
    }

    res.status(200).send(events);
  } catch (err) {
    res.status(500).send({
      message: "Server error during event retrieval",
      error: err.message,
    });
  }
});

module.exports = { eventRouter };
