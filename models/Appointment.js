const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },

  patientName: String,
  patientEmail: String,
  phone:String,

  date: String,  // ✅ display (2026-04-10)
  time: String,  // ✅ display (10:00 AM)

  appointmentDateTime: {   // 🔥 MAIN FIELD (logic ke liye)
    type: Date,
    required: true
  },

  message: String,

  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "rescheduled" ],
    default: "pending"
  },

  cancelReason: String,
  rescheduleReason: String

}, { timestamps: true });

module.exports = mongoose.model("Appointment", appointmentSchema);