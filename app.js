require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const path = require("path");

const nodemailer = require('nodemailer');
const Remark = require("./remarks"); 
const Feedback = require("./feedback");
const Event = require('./event');
const User=require('./user');
const Contact = require('./contactus');
const MedicalRecord=require('./medical');
const Appointment=require('./appointment');
const multer = require("multer");
const fs = require("fs");


const app = express();
const mongoUrl = "mongodb+srv://npallapo:gC580rwLVY55JlWR@cluster0.gumrtg8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const port = process.env.PORT || 5001;
const EMAIL_USER = npallapo@gitam.in;
const EMAIL_PASS = tjvpjqqkhyoyacvi;

mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Database connected");
    })
    .catch((e) => {
        console.error("Database connection error: ", e);
    });

  // Configure storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });


//app.use(express.json());
app.use(cors());
// Increase the JSON body limit to 50mb
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Replace * with your client domain in production
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Transporter setup for nodemailer (adjust as necessary)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  // host: 'smtp.gmail.com',
  // port: 587,
  // secure: false, // true for 465, false for other ports
  auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
  },
});
// Verify transporter
transporter.verify((error, success) => {
if (error) {
  console.error('Error with email configuration:', error);
} else {
  console.log('Email transporter is ready');
}
});


app.get("/", (req, res) => {
    res.send({ status: "Started" });
});



app.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      password,
      dob,
      age,
      userType,
      caretakerName,
      caretakerPhone,
      profession,
      hospital_name,
      hospital_address,
      hospital_state,
      hospital_district,
      hospital_pincode,
      image, // This is now a base64 encoded string
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ status: "error", data: "Email already exists" });
    }

    // Validate userType
    if (!["doctor", "patient"].includes(userType)) {
      return res.json({ status: "error", data: "Invalid userType" });
    }

    // If doctor, validate required fields
    if (
      userType === "doctor" &&
      (!profession || !hospital_name || !hospital_address || !hospital_pincode)
    ) {
      return res.json({
        status: "error",
        data: "Profession, hospital name, hospital address and hospital pincode are required for doctors",
      });
    }

    // Validate userType and required fields here ...

    // Generate unique userId, OTP, etc.
    const prefix = userType === "doctor" ? "D" : "P";
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const userId = `${prefix}${randomNumber}`;
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Process the image if provided
    let imageFilename = null;
    if (image) {
      // Create a unique filename
      imageFilename = Date.now() + "-profile.jpeg";
      // Decode the base64 string into a buffer
      const imageBuffer = Buffer.from(image, "base64");
      // Define the uploads folder (make sure it exists)
      const uploadPath = path.join(__dirname, "uploads", imageFilename);
      // Write the image buffer to the file system
      fs.writeFileSync(uploadPath, imageBuffer);
    }

    // Create new user with imageFilename (or null)
    const newUser = new User({
      userId,
      name,
      email,
      phone,
      address,
      password,
      dob,
      age,
      userType,
      caretakerName,
      caretakerPhone,
      profession,
      hospital_name,
      hospital_address,
      hospital_state,
      hospital_district,
      hospital_pincode,
      image: imageFilename,
      otp,
      otpExpiresAt,
    });

    await newUser.save();


    // Send OTP email
    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: "Verify Your Account",
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    };
    // Send OTP email...
    return res.status(201).json({
      status: "success",
      message: "User registered successfully! OTP sent to email.",
      data: { user: newUser, userId },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.json({ status: "error", data: error.message });
  }
});


app.get('/doctors', async (req, res) => {
  try {
    // Fetch users whose userId starts with 'D' (indicating they are doctors)
    const doctors = await User.find({ userId: { $regex: '^D', $options: 'i' } });

    // Map the doctor data to only return name and profession
    const doctorData = doctors.map(doctor => ({
      name: doctor.name,
      profession: doctor.profession,
      userId:doctor.userId,
      image: doctor.image 
        ? `${req.protocol}://${req.get("host")}/uploads/${doctor.image}`
        : null,
    }));

    res.json({ status: 'success', data: doctorData });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/doctor/:userId', async (req, res) => {
 // const { userId } = req.query;
  try {
    const doctor = await User.findOne({ userId: req.params.userId });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    // Construct full URL for the image if it exists
    const imageUrl = doctor.image 
      ? `${req.protocol}://${req.get("host")}/uploads/${doctor.image}`
      : null;

    // Return doctor details with the image URL
    res.json({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
      userId: doctor.userId,
      profession: doctor.profession,
      hospital_address:doctor.hospital_address,
      hospital_name:doctor.hospital_name,
      hospital_pincode:doctor.hospital_pincode,
      image: imageUrl,
      // include any other fields as needed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/getUser/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});

app.put('/update/:userId', async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: req.body },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Error updating user' });
  }
});

app.get('/doctors/profession/search', async (req, res) => {
  try {
    const { profession } = req.query;  // Get profession from query params

    if (!profession) {
      return res.status(400).json({ message: "Please provide a profession." });
    }

    const doctors = await User.find({ 
      userType: 'doctor', 
      profession: { $regex: new RegExp(profession, "i") }  // Case-insensitive search
    });

    if (doctors.length === 0) {
      return res.status(404).json({ message: "No doctors found." });
    }

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  
});

app.get('/doctors/search', async (req, res) => {
  try {
    let query = { userType: 'doctor' }; // Ensuring we only get doctors

    // Search by profession
    if (req.query.profession) {
      query.profession = { $regex: new RegExp(req.query.profession, "i") }; // Case-insensitive search
    }

    // Search by name
    if (req.query.name) {
      query.name = { $regex: new RegExp(req.query.name, "i") };
    }

    // Search by hospital name
    if (req.query.hospital_name) {
      query.hospital_name = { $regex: new RegExp(req.query.hospital_name, "i") };
    }

    // Search by hospital state
    if (req.query.hospital_state) {
      query.hospital_state = { $regex: new RegExp(req.query.hospital_state, "i") };
    }

    // Search by hospital district
    if (req.query.hospital_district) {
      query.hospital_district = { $regex: new RegExp(req.query.hospital_district, "i") };
    }

    const doctors = await User.find(query);

    if (doctors.length === 0) {
      return res.status(404).json({ message: "No doctors found." });
    }

    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// app.post('/register', async (req, res) => {
//   try {
//     const { 
//       name, 
//       email, 
//       phone, 
//       address, 
//       password, 
//       dob, 
//       age, 
//       userType, 
//       caretakerName, 
//       caretakerPhone, 
//       profession,
//       hospital_name,
//       hospital_address,
//       //hospital_marks,
//   hospital_state,
//   hospital_district,
//     hospital_pincode 
//     } = req.body;

//     // Check if email already exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.json({ status: 'error', data: 'Email already exists' });
//     }

//     // Validate userType
//     if (!['doctor', 'patient'].includes(userType)) {
//       return res.json({ status: 'error', data: 'Invalid userType' });
//     }

//     // If doctor, profession is required
//     if (userType === 'doctor' && !profession && !hospital_name && !hospital_address && !hospital_pincode) {
//       return res.json({ status: 'error', data: 'Profession is required for doctors' });
//     }

//     // Generate unique userId
//     const prefix = userType === 'doctor' ? 'D' : 'P';
//     const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
//     const userId = `${prefix}${randomNumber}`;

//     // Generate OTP
//     const otp = crypto.randomInt(100000, 999999).toString();
//     const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

//     // Create and save user
//     const user = new User({
//       userId,
//       name,
//       email,
//       phone,
//       address,
//       password,
//       dob,
//       age,
//       userType,
//       caretakerName: userType === 'patient' ? caretakerName : null,
//       caretakerPhone: userType === 'patient' ? caretakerPhone : null,
//       profession: userType === 'doctor' ? profession : null,
//       hospital_name:userType==='doctor'? hospital_name:null,
//       hospital_address : userType==='doctor'? hospital_address:null,
//       //hospital_marks: userType === "doctor" ? hospitalMarks : null,
//   hospital_state: userType === "doctor" ? hospital_state : null,
//   hospital_district: userType === "doctor" ? hospital_district : null,
//     hospital_pincode: userType ==='doctor'?hospital_pincode: null,
//       otp,
//       otpExpiresAt,
//     });

//     await user.save();

//     // Send OTP email
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'Verify Your Account',
//       text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
//     };

//     await transporter.sendMail(mailOptions);

//     res.status(201).json({ status: 'success', data: 'User registered. OTP sent to email.', userId });
//   } catch (error) {
//     console.error('Error during registration:', error);
//     res.json({ status: 'error', data: error.message });
//   }
// });





app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ status: 'error', data: 'User not found' });
    }

    if (user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ status: 'error', data: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.status(200).json({ status: 'success', data: 'User verified successfully' });
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).json({ status: 'error', data: 'Internal server error' });
  }
});

// Routes
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return res.send({ status: "error", data: "Email and password are required" });
  }

  try {
      const user = await User.findOne({ email });
      if (!user) {
          return res.send({ status: "error", data: "User not found" });
      }

      if (!user.isVerified) {
          return res.send({ status: "error", data: "Email not verified" });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.send({ status: "error", data: "Invalid password" });
      }

      res.send({ status: "success", data: "Login successful" });
  } catch (error) {
      console.error("Login error: ", error);
      res.send({ status: "error", data: error.message });
  }
});

// Forgot Password
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: 'error', data: 'User not found' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiresAt;
    await user.save();

    const mailOptions = {
      from: EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It expires in 15 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.json({ status: 'success', data: 'OTP sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.json({ status: 'error', data: error.message });
  }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ status: 'error', data: 'User not found' });
    }

    if (user.resetPasswordOTP !== otp || user.resetPasswordExpires < new Date()) {
      return res.json({ status: 'error', data: 'Invalid or expired OTP' });
    }

    //const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ status: 'success', data: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.json({ status: 'error', data: error.message });
  }
});


app.post('/change-password', async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.send({ status: 'error', data: 'User not found' });
      }
  
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.send({ status: 'error', data: 'Current password is incorrect' });
      }
  
      const salt = await bcrypt.genSalt(10);
      //const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      user.password = newPassword;
      await user.save();
  
      res.send({ status: 'success', data: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing password:', error);
      res.send({ status: 'error', data: 'Server error' });
    }
  });

  app.get('/profile', async (req, res) => {
    const { email } = req.query;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.send({ status: 'error', data: 'User not found' });
      }
  
       // Construct full image URL if image exists
    const imageUrl = user.image
    ? `${req.protocol}://${req.get("host")}/uploads/${user.image}`
    : null;

      res.send({
        status: 'success',
        data: {
          name: user.name,
          email: user.email,
          phone: user.phone,
          age:user.age,
          userId:user.userId,
          profession:user.profession,
          image:imageUrl,
        },
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.send({ status: 'error', data: 'Server error' });
    }
  });
  app.post('/contact-us', async (req, res) => {
    const { name, email, message } = req.body;
  
    if (!name || !email || !message) {
      return res.send({ status: 'error', data: 'All fields are required' });
    }
  
    try {
      const newContact = new Contact({
        name,
        email,
        message
      });
  
      await newContact.save();
      res.send({ status: 'success', data: 'Message sent successfully' });
    } catch (error) {
      console.error('Error saving contact message:', error);
      res.send({ status: 'error', data: 'Server error' });
    }
  });
// Endpoint to handle forgot password

app.get('/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const medicalRecords = await MedicalRecord.find({ email });
    const feedbacks = await Feedback.find({ email });
    const events = await Event.find({ email });
    const remarks = await Remark.find({ email });

    res.json({
      status: 'success',
      data: { medicalRecords, feedbacks, events, remarks },
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});

app.post('/save-remarks', async (req, res) => {
  const { email, remarks } = req.body;
  console.log('Received:', { email, remarks });

  if (!email || !remarks) {
    return res.send({ status: 'error', data: 'Enter the remarks' });
  }

  try {
    const newRemark = new Remark({ email, remarks });
    await newRemark.save();
    res.send({ status: 'success', data: 'Remark saved successfully' });
  } catch (error) {
    console.error('Error saving remark:', error);
    res.status(500).send({ status: 'error', data: error.message });
  }
});



app.post('/submit-feedback', async (req, res) => {
    const { email, rating, feedback } = req.body;

    if (!email || !rating || !feedback) {
        return res.send({ status: "error", message: "All fields are required" });
    }

    try {
        const newFeedback = new Feedback({
            email,
            rating,
            feedback,
        });

        await newFeedback.save();
        res.send({ status: "success", message: "Feedback submitted successfully" });
    } catch (error) {
        console.error("Feedback submission error: ", error);
        res.status(500).send({ status: "error", message: error.message });
    }
});

// Fetch medical records (Patients can only view their own, doctors fetch by patientId)
app.post('/addRecord', async (req, res) => {
  try {
      const { doctorId, patientId, diagnosis, prescription, additionalNotes, date } = req.body;

      // Validate request body
      if (!doctorId || !patientId) {
          return res.status(400).json({ message: "Doctor ID and Patient ID are required" });
      }

      if (typeof doctorId !== 'string' || typeof patientId !== 'string') {
          return res.status(400).json({ message: "Invalid ID format" });
      }

      // Check if doctorId starts with 'D'
      if (doctorId.substring(0, 1) !== 'D') { // Using substring instead of startsWith for safety
          return res.status(403).json({ message: "Only doctors can upload records" });
      }

      const newRecord = new MedicalRecord({ doctorId, patientId, diagnosis, prescription, additionalNotes, date });
      await newRecord.save();
      res.status(201).json({ message: "Record added successfully" });
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error", error });
  }
});

// Get records for a patient
app.get('/getRecords/:patientId', async (req, res) => {
  try {
      const { patientId } = req.params;
      if (!patientId || typeof patientId !== 'string') {
          return res.status(400).json({ message: "Invalid Patient ID" });
      }

      // Check if patientId starts with 'P'
      if (patientId.substring(0, 1) !== 'P') { // Using substring for safety
          return res.status(403).json({ message: "Unauthorized access" });
      }

      const records = await MedicalRecord.find({ patientId });
      res.status(200).json(records);
  } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error", error });
  }
});

// app.post('/appointment', async (req, res) => {
//   try {
//     const { doctorId, patientId, appointmentDate, timeSlot } = req.body;
//     // Additional validations (e.g. duplicate booking) can be added here
//     const appointment = new Appointment({
//       doctorId,
//       patientId,
//       appointmentDate,
//       timeSlot
//     });
//     await appointment.save();
//     res.status(201).json({
//       message: 'Appointment booked successfully, pending approval.',
//       appointment
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error booking appointment', error: error.message });
//   }
// });

// // PATCH /appointments/:appointmentId - Doctor updates appointment status
// app.patch('/appointment/:appointmentId', async (req, res) => {
//   try {
//     const { appointmentId } = req.params;
//     const { status } = req.body; // Expecting 'approved' or 'rejected'
//     const appointment = await Appointment.findByIdAndUpdate(
//       appointmentId,
//       { status },
//       { new: true }
//     );
//     if (!appointment) {
//       return res.status(404).json({ message: 'Appointment not found' });
//     }
//     res.json({ message: 'Appointment status updated', appointment });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error updating appointment', error: error.message });
//   }
// });

// // GET /appointments/doctor/:doctorId - Doctor retrieves all appointments
// app.get('/appointment/doctor/:doctorId', async (req, res) => {
//   try {
//     const { doctorId } = req.params;
//     const appointments = await Appointment.find({ doctorId });
//     res.json(appointments);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error fetching appointments', error: error.message });
//   }
// });

// GET /appointments/patient/:patientId - Fetch appointments for a patient
app.get('/appointment/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    console.log('Fetching appointments for patientId:', patientId);
    const appointments = await Appointment.find({ patientId });
    res.json({ status: 'success', data: appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error fetching appointments', error: error.message });
  }
});

// Route: Book Appointment (POST)
app.post("/appointment", async (req, res) => {
  try {
    const { doctorId, doctorName,patientId,patientName, appointmentDate, timeSlot } = req.body;

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      doctorId,
      appointmentDate,
      timeSlot,
      status: { $in: ["pending", "approved"] } // Block pending & approved slots
    });

    if (existingAppointment) {
      return res.json({ message: "Time slot already booked" });
    }

    // Create new appointment
    const appointment = new Appointment({ doctorId,doctorName, patientId,patientName, appointmentDate, timeSlot });
    await appointment.save();

    res.json({ message: "Appointment booked successfully, pending approval.", appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error booking appointment", error: error.message });
  }
});

// Route: Update Appointment Status (PATCH)
app.patch("/appointment/:appointmentId", async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body; // Expecting 'approved' or 'rejected'

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Appointment status updated", appointment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating appointment", error: error.message });
  }
});

// Route: Get Doctor’s Appointments (GET)
app.get("/appointment/doctor/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const appointments = await Appointment.find({ doctorId });

    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching appointments", error: error.message });
  }
});



app.listen(port, () => {
    console.log(`Node.js server started on port ${port}`);
});
