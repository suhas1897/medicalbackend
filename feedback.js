// models/feedback.js

const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  email: { type: String, required: true },
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);

module.exports = Feedback;
