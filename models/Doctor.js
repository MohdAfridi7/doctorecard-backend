const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({

  fullName: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    unique: true,
    index: true
  },

  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please use valid email"]
  },

  phone: {
    type: String,
    match: [/^[0-9]{10}$/, "Enter valid phone number"]
  },

  password: {
    type: String,
    select: false
  },

  // 🔥 NEW FIELDS
  role: {
    type: String,
    enum: ["doctor", "admin"],
    default: "doctor"
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  gender: String,
  dob: Date,

  profilePhoto: String,
  cloudinaryId: String,

  specialization: [String],
  qualification: [String],
  experience: String,
  medicalRegNumber: String,
  clinicName: String,
  consultationFee: Number,

  clinicAddress: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,

  availableDays: [String],
  startTime: String,
  endTime: String,
  onlineConsultation: Boolean,

  bio: String,
  about: String,
  clinicLocation: String,

  isVerified: {
    type: Boolean,
    default: false
  },

  resetOtp: Number,
  resetOtpExpiry: Date,
  resetOtpVerified: {
    type: Boolean,
    default: false
  },
  profileViews: {
  type: Number,
  default: 0
},

  emailChangeOtp: Number,
  emailChangeOtpExpiry: Date,
  newEmail: String,
  oldEmailOtp: Number,
  oldEmailOtpExpiry: Date

}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);