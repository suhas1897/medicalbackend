const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  doctorId: { type: String, required: true },
  doctorName:{type:String, required:true},
  patientId: { type: String, required: true },
  patientName:{type:String},
  appointmentDate: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  doctorImage: { 
    type: String 
  },
  patientImage: { 
    type: String 
  },

}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
