const express = require("express");
const Event = require("../models/event.model");
const Calendar = require("../models/calendar.model");
const { authMiddleware } = require("../middlewares/auth.middleware");
const eventRouter = express.Router();

//! Create a new event in a calendar
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

//! Delete an event
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

      const event = await Event.findByIdAndDelete(eventId);
      if (!event) {
        return res.status(404).send({ message: "Event not found" });
      }

      // Remove the event from the calendar's event list
      calendar.events.pull(event._id);
      await calendar.save();

      res.status(200).send({ message: "Event deleted successfully" });
    } catch (err) {
      res.status(500).send({
        message: "Server error during event deletion",
        error: err.message,
      });
    }
  }
);

//! get all events for a particular day

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
