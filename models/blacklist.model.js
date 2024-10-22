// models/blacklist.model.js
const mongoose = require("mongoose");

const blacklistSchema = new mongoose.Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Expiration time of the token
});

const Blacklist = mongoose.model("Blacklist", blacklistSchema);

module.exports = Blacklist;
