const Doctor = require("../models/Doctor");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");
const sendWelcomeEmail = require("../utils/sendWelcomeEmail");
const generateSlug = require("../utils/slugify");
const cloudinary = require("../config/cloudinary");
const Appointment = require("../models/Appointment");
const Enquiry = require("../models/Enquiry");
const AdminEnquiry = require("../models/AdminEnquiry");
const sendAppointmentEmail = require("../utils/appointmentEmail");
const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


let tempSignup = {};

// password generator
const generatePassword = (length = 8) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
};


// ================= SIGNUP =================
exports.signupDoctor = async (req, res) => {
  try {
    const email = req.body.email;

    const existing = await Doctor.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    tempSignup[email] = {
  data: req.body,
  profilePhoto: req.file ? req.file.cloudinaryUrl : "",
  cloudinaryId: req.file ? req.file.cloudinaryId : "",
  otp,
  otpExpiry
};

    await sendEmail(email, otp, req.body.fullName, "verify");

    res.json({ message: "OTP sent to email" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = tempSignup[email];

    if (!record) {
      return res.status(400).json({ message: "Signup session expired" });
    }

    if (Date.now() > record.otpExpiry) {
      delete tempSignup[email];
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(record.data.password, 10);

    let baseSlug = generateSlug(record.data.fullName);
    let slug = baseSlug;

    let count = 1;
    while (await Doctor.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    const doctor = new Doctor({
      ...record.data,
      password: hashedPassword,
      profilePhoto: record.profilePhoto, // ✅ cloudinary URL
      cloudinaryId: record.cloudinaryId,
      isVerified: true,
      slug
    });

    await doctor.save();

    try {
      await sendWelcomeEmail(doctor.email, doctor.fullName);
    } catch (err) {}

    delete tempSignup[email];

    res.json({
      message: "Doctor registered successfully",
      doctor,
      profileUrl: `/doctor/${doctor.slug}`
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESEND OTP =================
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const record = tempSignup[email];

    if (!record) {
      return res.status(400).json({ message: "Signup expired" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    record.otp = otp;
    record.otpExpiry = Date.now() + 10 * 60 * 1000;

    await sendEmail(email, otp, record.data.fullName, "resend");

    res.json({ message: "OTP resent" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= LOGIN =================
exports.loginDoctor = async (req, res) => {
  try {

    const { email, password } = req.body;

    const doctor = await Doctor.findOne({ email }).select("+password");

    if (!doctor) {
      return res.status(400).json({ message: "Invalid email" });
    }

    const match = await bcrypt.compare(password, doctor.password);

    if (!match) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 🔥 BLOCK CHECK
    if (doctor.isBlocked) {
      return res.status(403).json({ message: "Account blocked by admin" });
    }

    doctor.password = undefined;

    // 🔥 TOKEN WITH ROLE
    const token = jwt.sign(
      { id: doctor._id, role: doctor.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: doctor.role,
      doctor,
      profileUrl: `/doctor/${doctor.slug}`
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    doctor.resetOtp = otp;
    doctor.resetOtpExpiry = Date.now() + 10 * 60 * 1000;
    doctor.resetOtpVerified = false;

    await doctor.save();

    await sendEmail(email, otp, doctor.fullName, "reset");

    res.json({ message: "OTP sent" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESEND RESET OTP =================
exports.resendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    doctor.resetOtp = otp;
    doctor.resetOtpExpiry = Date.now() + 10 * 60 * 1000;

    await doctor.save();

    await sendEmail(email, otp, doctor.fullName, "reset");

    res.json({ message: "OTP resent" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY RESET OTP =================
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found" });
    }

    if (doctor.resetOtp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > doctor.resetOtpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    doctor.resetOtpVerified = true;
    await doctor.save();

    res.json({ message: "OTP verified" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= RESET PASSWORD =================
exports.resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const doctor = await Doctor.findOne({ email });
    if (!doctor) {
      return res.status(400).json({ message: "Doctor not found" });
    }

    if (!doctor.resetOtpVerified) {
      return res.status(400).json({ message: "OTP not verified" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    doctor.password = hashedPassword;
    doctor.resetOtp = null;
    doctor.resetOtpExpiry = null;
    doctor.resetOtpVerified = false;

    await doctor.save();

    res.json({ message: "Password reset successful" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};



// ================= GET PROFILE =================

exports.getDoctorProfile = async (req, res) => {
  try {

    const doctor = await Doctor.findOne({ slug: req.params.slug });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // 🔥 BLOCK CHECK
    if (doctor.isBlocked) {
      return res.status(403).json({ message: "Doctor profile is blocked" });
    }

    // 🔥 INCREMENT VIEW
    doctor.profileViews += 1;
    await doctor.save();

    // 🔥 hide sensitive fields
    const safeDoctor = doctor.toObject();
    delete safeDoctor.password;
    delete safeDoctor.resetOtp;

    res.json(safeDoctor);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= GET Dashboard =================
exports.getDashboard = async (req, res) => {
  try {

    const doctor = await Doctor
      .findById(req.user.id)
      .select("-password -resetOtp -resetOtpExpiry -resetOtpVerified");

    res.json(doctor);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};









exports.getDashboardStats = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.user.id);

    const totalAppointments = await Appointment.countDocuments({
      doctor: req.user.id
    });

    const pendingAppointments = await Appointment.countDocuments({
      doctor: req.user.id,
      status: "pending"
    });

    const totalEnquiries = await Enquiry.countDocuments({
      doctor: req.user.id
    });

    const recentEnquiries = await Enquiry
      .find({ doctor: req.user.id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      doctorName: doctor.fullName,
      profileViews: doctor.profileViews,
      totalAppointments,
      pendingAppointments,
      totalEnquiries,
      profileUrl: `/doctor/${doctor.slug}`,
      recentEnquiries
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res) => {
  try {

    const updates = req.body;

    delete updates.email;
    delete updates.profilePhoto;
    delete updates.password;
    delete updates.resetOtp;

    const doctor = await Doctor.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password -resetOtp -resetOtpExpiry -resetOtpVerified");

    res.json({
      message: "Profile updated",
      doctor
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= SEND NEW EMAIL OTP =================
exports.sendNewEmailOtp = async (req, res) => {
  try {

    const { newEmail } = req.body;

    const existing = await Doctor.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const doctor = await Doctor.findById(req.user.id);

    doctor.newEmail = newEmail;
    doctor.emailChangeOtp = otp;
    doctor.emailChangeOtpExpiry = Date.now() + 10 * 60 * 1000;

    await doctor.save();

    // 🔥 FIXED TYPE
    await sendEmail(newEmail, otp, doctor.fullName, "change-new");

    res.json({ message: "OTP sent to new email" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY NEW EMAIL OTP =================
exports.verifyNewEmailOtp = async (req, res) => {
  try {

    const { otp } = req.body;

    const doctor = await Doctor.findById(req.user.id);

    if (!doctor.emailChangeOtp || doctor.emailChangeOtp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > doctor.emailChangeOtpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // 🔥 send OTP to old email
    const oldOtp = Math.floor(100000 + Math.random() * 900000);

    doctor.oldEmailOtp = oldOtp;
    doctor.oldEmailOtpExpiry = Date.now() + 10 * 60 * 1000;

    await doctor.save();

    // 🔥 FIXED TYPE
    await sendEmail(doctor.email, oldOtp, doctor.fullName, "change-old");

    res.json({ message: "OTP sent to old email" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================= VERIFY OLD EMAIL OTP =================
exports.verifyOldEmailOtp = async (req, res) => {
  try {

    const { otp } = req.body;

    const doctor = await Doctor.findById(req.user.id);

    if (!doctor.oldEmailOtp || doctor.oldEmailOtp != otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > doctor.oldEmailOtpExpiry) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // 🔥 FINAL CHANGE
    doctor.email = doctor.newEmail;

    // 🔥 CLEANUP (IMPORTANT)
    doctor.newEmail = null;
    doctor.emailChangeOtp = null;
    doctor.emailChangeOtpExpiry = null;
    doctor.oldEmailOtp = null;
    doctor.oldEmailOtpExpiry = null;

    await doctor.save();

    res.json({ message: "Email updated successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

 // ================= RESEND NEW EMAIL OTP =================
exports.resendNewEmailOtp = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.user.id);

    if (!doctor.newEmail) {
      return res.status(400).json({ message: "No email change request found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    doctor.emailChangeOtp = otp;
    doctor.emailChangeOtpExpiry = Date.now() + 10 * 60 * 1000;

    await doctor.save();

    await sendEmail(
      doctor.newEmail,
      otp,
      doctor.fullName,
      "change-new"
    );

    res.json({ message: "OTP resent to new email" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// ================= RESEND OLD EMAIL OTP =================
exports.resendOldEmailOtp = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.user.id);

    if (!doctor.oldEmailOtp) {
      return res.status(400).json({ message: "Old email verification not started" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    doctor.oldEmailOtp = otp;
    doctor.oldEmailOtpExpiry = Date.now() + 10 * 60 * 1000;

    await doctor.save();

    await sendEmail(
      doctor.email,
      otp,
      doctor.fullName,
      "change-old"
    );

    res.json({ message: "OTP resent to old email" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// ================= CHANGE PROFILE PHOTO =================
exports.changeProfilePhoto = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const doctor = await Doctor.findById(req.user.id);

    if (doctor.cloudinaryId) {
      await cloudinary.uploader.destroy(doctor.cloudinaryId);
    }

    doctor.profilePhoto = req.file.cloudinaryUrl;
    doctor.cloudinaryId = req.file.cloudinaryId;

    await doctor.save();

    res.json({
      message: "Profile photo updated",
      profilePhoto: doctor.profilePhoto
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// ================= BOOK APPOINTMENT =================
exports.bookAppointment = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ slug: req.params.slug });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const { patientName, patientEmail, phone, date, time, message } = req.body;

    const appointmentDateTime = new Date(`${date}T${time}:00`);

    // ✅ slot check
    const existing = await Appointment.findOne({
      doctor: doctor._id,
      appointmentDateTime,
      status: { $in: ["pending", "confirmed"] }
    });

    if (existing) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    // ✅ save
    const appointment = await Appointment.create({
      doctor: doctor._id,
      patientName,
      patientEmail,
      phone,
      date,
      time,
      appointmentDateTime,
      message
    });

    // ================= 📩 EMAILS =================

    // 👉 Doctor ko mail
    await sendAppointmentEmail({
      to: doctor.email,
      type: "booking-doctor",
      doctorName: doctor.fullName,
      patientName,
      patientEmail,
      date,
      time,
      message
    });

    // 👉 Patient ko mail
    await sendAppointmentEmail({
      to: patientEmail,
      type: "booking-patient",
      doctorName: doctor.fullName,
      patientName,
      date,
      time
    });

    // ================= END =================

    res.json({ message: "Appointment booked", appointment });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ================= CONFIRM =================
exports.confirmAppointment = async (req, res) => {
  const appointment = await Appointment.findById(req.params.id).populate("doctor");

  appointment.status = "confirmed";
  await appointment.save();

  await sendAppointmentEmail({
    to: appointment.patientEmail,
    type: "confirmed",
    doctorName: appointment.doctor.fullName,
    patientName: appointment.patientName,
    date: appointment.date,
    time: appointment.time
  });

  res.json({ message: "Confirmed" });
};


// ================= RESCHEDULE =================
exports.rescheduleAppointment = async (req, res) => {
  const { date, time, reason } = req.body;

  const appointment = await Appointment.findById(req.params.id).populate("doctor");

  const newDateTime = new Date(`${date}T${time}:00`);

  appointment.date = date;
  appointment.time = time;
  appointment.appointmentDateTime = newDateTime;
  appointment.rescheduleReason = reason;

  appointment.status = "rescheduled";

  await appointment.save();

  await sendAppointmentEmail({
    to: appointment.patientEmail,
    type: "rescheduled",
    doctorName: appointment.doctor.fullName,
    patientName: appointment.patientName,
    date: date,
    time,
    reason
  });

  res.json({ message: "Rescheduled" });
};


// ================= CANCEL =================
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;

    const appointment = await Appointment.findById(req.params.id).populate("doctor");

    appointment.status = "cancelled";
    appointment.cancelReason = reason;

    await appointment.save();

    // patient mail
    await sendAppointmentEmail({
      to: appointment.patientEmail,
      type: "cancelled",
      doctorName: appointment.doctor.fullName,
      patientName: appointment.patientName,
      date: appointment.date,
      time: appointment.time,
      reason
    });

    // doctor mail
    await sendAppointmentEmail({
      to: appointment.doctor.email,
      type: "cancelled-doctor",
      doctorName: appointment.doctor.fullName,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      date: appointment.date,
      time: appointment.time,
      reason
    });

    res.json({ message: "Cancelled" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};


// ================= GET =================
exports.getDoctorAppointments = async (req, res) => {
  try {

    const appointments = await Appointment.find({
      doctor: req.user.id  // 🔥 logged doctor
    }).sort({ appointmentDateTime: -1 });

    res.json(appointments);

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
};



exports.getAllDoctors = async (req, res) => {
  try {

    const doctors = await Doctor.aggregate([
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "doctor",
          as: "appointments"
        }
      },
      {
        $addFields: {
          totalAppointments: { $size: "$appointments" }
        }
      },
      {
        $project: {
          fullName: 1,
          email: 1,
          phone: 1,
          slug: 1,
          password: 1,
          isBlocked: 1,
          totalAppointments: 1
        }
      }
    ]);

    res.json({
      total: doctors.length,
      doctors
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.getAdminDashboardStats = async (req, res) => {
  try {

    // 🔥 TOTAL DOCTORS
    const totalDoctors = await Doctor.countDocuments({
      role: "doctor"
    });

    // 🔥 BLOCKED DOCTORS
    const blockedDoctors = await Doctor.countDocuments({
      role: "doctor",
      isBlocked: true
    });

    // 🔥 TOTAL ENQUIRIES
    const totalEnquiries = await AdminEnquiry.countDocuments();

    // 🔥 UNREAD ENQUIRIES
    const unreadEnquiries = await AdminEnquiry.countDocuments({
      status: "unread"
    });

    // 🔥 RECENT ENQUIRIES (latest 5)
    const recentEnquiries = await AdminEnquiry
      .find()
      .sort({ createdAt: -1 })
      .limit(5);

    // 📊 MONTHLY DOCTOR CHART (SAFE VERSION)
    const doctorsMonthlyChart = await Doctor.aggregate([
      {
        $match: {
          role: "doctor",
          createdAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalDoctors: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return res.status(200).json({
      totalDoctors,
      blockedDoctors,
      totalEnquiries,
      unreadEnquiries,
      recentEnquiries,
      doctorsMonthlyChart
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


exports.toggleDoctorBlock = async (req, res) => {
  try {

    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.isBlocked = !doctor.isBlocked;

    await doctor.save();

    res.json({
      message: doctor.isBlocked ? "Doctor blocked" : "Doctor unblocked",
      doctor
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


exports.createDoctorByAdmin = async (req, res) => {
  try {

    const { fullName, email } = req.body;

    // 🔹 validation
    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and Email are required"
      });
    }

    // 🔹 email check
    const existingDoctor = await Doctor.findOne({ email });

    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Doctor already exists with this email"
      });
    }

    // 🔹 auto password generate
    const autoPassword = generatePassword(10);

    // 🔹 hash password
    const hashedPassword = await bcrypt.hash(autoPassword, 10);

    // 🔹 slug generate
    let baseSlug = generateSlug(fullName);
    let slug = baseSlug;

    let count = 1;
    while (await Doctor.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    // 🔹 create doctor
    const doctor = await Doctor.create({
      fullName,
      email,
      password: hashedPassword,
      slug,
      role: "doctor",
      isVerified: true
    });

    // 🔹 send email with password
    await sendWelcomeEmail(
      doctor.email,
      doctor.fullName,
      autoPassword
    );

    res.status(201).json({
      success: true,
      message: "Doctor created successfully",
      doctor,
      profileUrl: `/doctor/${slug}`
    });

  } catch (error) {

    console.log("Create Doctor Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });

  }
};



exports.sendEnquiry = async (req, res) => {

  try {

    const doctor = await Doctor.findOne({ slug: req.params.slug });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const { name, email, phone, message } = req.body;

    // validation
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ message: "All fields required" });
    }

    const enquiry = await Enquiry.create({
      doctor: doctor._id,
      name,
      email,
      phone,
      message
    });

    // ================= EMAIL =================

    // 👉 Doctor ko mail
    await sendAppointmentEmail({
      to: doctor.email,
      type: "enquiry-doctor",
      doctorName: doctor.fullName,
      patientName: name,
      patientEmail: email,
      phone,
      message
    });

    res.json({
      message: "Enquiry sent successfully",
      enquiry
    });

  } catch (err) {

    console.log(err);
    res.status(500).json({ message: "Server error" });

  }

};




exports.getDoctorEnquiries = async (req, res) => {

  try {

    const enquiries = await Enquiry.find({ doctor: req.user.id })
      .sort({ createdAt: -1 });

    res.json(enquiries);

  } catch (err) {

    res.status(500).json({ message: "Server error" });

  }

};


exports.updateEnquiryStatus = async (req, res) => {

  try {

    const { status } = req.body;

    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json({
      message: "Status updated",
      enquiry
    });

  } catch (err) {

    res.status(500).json({ message: "Server error" });

  }

};



exports.sendAdminEnquiry = async (req, res) => {

  try {

    const { name, email, phone, message } = req.body;

    const enquiry = await AdminEnquiry.create({
      name,
      email,
      phone,
      message
    });

    res.status(201).json({
      success: true,
      message: "Enquiry sent successfully"
    });

  } catch (error) {

    res.status(500).json({
      message: "Server Error"
    });

  }

};


exports.getAdminEnquiries = async (req, res) => {

  try {

    const enquiries = await AdminEnquiry
      .find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      total: enquiries.length,
      enquiries
    });

  } catch (error) {

    res.status(500).json({
      message: "Server Error"
    });

  }

};


exports.updateAdminEnquiryStatus = async (req, res) => {
  try {

    const { id } = req.params;

    const enquiry = await AdminEnquiry.findById(id);

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found"
      });
    }

    // Toggle status
    enquiry.status = enquiry.status === "read" ? "unread" : "read";

    await enquiry.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      enquiry
    });

  } catch (error) {

    res.status(500).json({
      message: "Server Error"
    });

  }
};


// ================= AI GENERATE BIO / ABOUT =================


exports.generateDoctorAIContent = async (req, res) => {
  try {
    const { prompt, field } = req.body;

const aiPrompt = `
Generate 5 SEPARATE professional doctor ${field} options.

VERY IMPORTANT RULES:
- Must return exactly 5 different paragraphs
- Each paragraph MUST be 70 to 80 words
- Do NOT combine into one paragraph
- Do NOT number them
- Do NOT use bullet points
- Each paragraph must start on a new line
- Strict separation is required

Format example:
Paragraph 1

Paragraph 2

Paragraph 3

Paragraph 4

Paragraph 5

Doctor details:
${prompt}
`;

    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: aiPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    let text = result.choices[0].message.content;

    // ================= CLEAN + PARSE =================
    const suggestions = text
      .split("\n")
      .map(line =>
        line
          .replace(/^\d+[\.\)]\s*/, "")   // remove numbering
          .replace(/[-•]/g, "")           // remove bullets
          .trim()
      )
      .filter(line => line.length > 10)
      .slice(0, 5);

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "AI generation failed",
      error: error.message
    });
  }
};


// exports.createAdmin = async (req, res) => {
//   const bcrypt = require("bcryptjs");

//   const hashed = await bcrypt.hash("sarfraz@7860", 10);

//   const admin = await Doctor.create({
//     fullName: "Admin",
//     email: "admin@gmail.com",
//     password: hashed,
//     role: "admin",
//     isVerified: true
//   });

//   res.json(admin);
// };