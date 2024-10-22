const mongoose = require("mongoose");

const calendarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the user who owns the calendar
      ref: "User",
      required: true,
    },
    events: [
      {
        type: mongoose.Schema.Types.ObjectId, // Array of events associated with the calendar
        ref: "Event",
      },
    ],
  },
  { timestamps: true }
);

const Calendar = mongoose.model("Calendar", calendarSchema);

module.exports = Calendar;
