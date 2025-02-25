const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  patientId: { type: String, required: true },
  diagnosis: { type: String, required: true },
  prescription: { type: String, required: true },
  additionalNotes: String,
  date: { type: Date, required: true }
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);