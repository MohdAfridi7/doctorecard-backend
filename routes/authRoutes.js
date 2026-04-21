    const express = require("express");
    const router = express.Router();

    const { upload, uploadToCloudinary } = require("../middleware/upload");
    const auth = require("../middleware/authMiddleware");
    const admin = require("../middleware/admin");

    const authController = require("../controllers/authController");

    const bcrypt = require("bcryptjs");
    const Doctor = require("../models/Doctor");

    // ================= AUTH =================
    router.post(
    "/signup",
    upload.single("profilePhoto"),
    uploadToCloudinary,
    authController.signupDoctor
    );

    router.post("/verify-otp", authController.verifyOtp);
    router.post("/resend-otp", authController.resendOtp);
    router.post("/login", authController.loginDoctor);

    router.post("/forgot-password", authController.forgotPassword);
    router.post("/resend-reset-otp", authController.resendResetOtp);
    router.post("/verify-reset-otp", authController.verifyResetOtp);
    router.post("/reset-password", authController.resetPassword);

    // ================= PROFILE =================
    router.get("/profile/:slug", authController.getDoctorProfile);
    router.get("/dashboard", auth, authController.getDashboard);
    router.get("/dashboard-stats", auth, authController.getDashboardStats);

    router.put("/update-profile", auth, authController.updateProfile);

    router.put(
    "/change-photo",
    auth,
    upload.single("profilePhoto"),
    uploadToCloudinary,
    authController.changeProfilePhoto
    );

    // ================= CHANGE EMAIL =================

    // Send OTP to new email
    router.post(
    "/change-email/send-otp",
    auth,
    authController.sendNewEmailOtp
    );

    // Verify new email OTP
    router.post(
    "/change-email/verify-new",
    auth,
    authController.verifyNewEmailOtp
    );

    // Resend OTP to new email
    router.post(
    "/change-email/resend-new-otp",
    auth,
    authController.resendNewEmailOtp
    );

    // Verify old email OTP
    router.post(
    "/change-email/verify-old",
    auth,
    authController.verifyOldEmailOtp
    );

    // Resend OTP to old email
    router.post(
    "/change-email/resend-old-otp",
    auth,
    authController.resendOldEmailOtp
    );

    // ================= APPOINTMENTS =================

    router.post("/book/:slug", authController.bookAppointment);

    router.get("/appointments", auth, authController.getDoctorAppointments);

    router.put("/appointments/:id/confirm", auth, authController.confirmAppointment);

    router.put("/appointments/:id/reschedule", auth, authController.rescheduleAppointment);

    router.put("/appointments/:id/cancel", auth, authController.cancelAppointment);


    // ================= ENQUIRIES =================

    // Send enquiry from website (no login required)
    router.post("/enquiry/:slug", authController.sendEnquiry);

    // Doctor dashboard enquiries
    router.get("/doctor/enquiries", auth, authController.getDoctorEnquiries);

    // Mark enquiry read / unread
    router.put("/enquiry/:id/status", auth, authController.updateEnquiryStatus);


    // ================= ADMIN =================

    // 🔥 GET ALL DOCTORS
    router.get("/admin/doctors", auth, admin, authController.getAllDoctors);

    router.get("/admin/dashboard-stats", auth, admin, authController.getAdminDashboardStats);

    // 🔥 BLOCK / UNBLOCK DOCTOR
    router.put("/admin/doctor/:id/toggle-block", auth, admin, authController.toggleDoctorBlock);

    // 🔥 CREATE DOCTOR BY ADMIN
    router.post("/admin/create-doctor", auth, admin, authController.createDoctorByAdmin);



    // ================= ADMIN ENQUIRIES =================

    // 🌍 Website se admin ko enquiry
    router.post("/admin/enquiry", authController.sendAdminEnquiry);

    // 📥 Admin dashboard enquiries
    router.get("/admin/enquiries", auth, admin, authController.getAdminEnquiries);

    // ✔ Mark read / unread
    router.put(
    "/admin/enquiry/:id/status",
    auth,
    admin,
    authController.updateAdminEnquiryStatus
    );

    // router.get("/create-admin", authController.createAdmin);


    // ================= AI GENERATE BIO / ABOUT =================

router.post(
  "/generate-ai-content",authController.generateDoctorAIContent);

    module.exports = router;