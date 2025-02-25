const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  date: String,
  text: String,
  email: String,
});
const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
