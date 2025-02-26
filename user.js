const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true }, // User ID with prefix
  name: String,
  email: { type: String, unique: true, required: true },
  phone: String,
  address: String,
  password: { type: String, required: true },
  dob: Date,
  age: Number,
  userType: { type: String, required: true }, // Should be 'doctor' or 'patient'
  caretakerName: String,
  caretakerPhone: String,
  profession: String, // Added profession for doctors
  hospital_name:String,
  hospital_address:String,
 // hospital_marks: String,
  hospital_state: String,
  hospital_district: String,
  hospital_pincode:String,
  otp: String,
  otpExpiresAt: Date,
  resetPasswordOTP: String,
  resetPasswordExpires: Date,
    // User image field (stores file name or URL)
    image: { 
      type: String 
    },
  isVerified: { type: Boolean, default: false },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // Generate userId only if it's a new user
  if (this.isNew) {
    const prefix = this.userType === 'doctor' ? 'D' : 'P';
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000); // Generate a random 7-digit number
    this.userId = `${prefix}${randomNumber}`;
  }

  next();
});

module.exports = mongoose.model('Userin', userSchema);
