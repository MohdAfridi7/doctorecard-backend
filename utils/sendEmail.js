const nodemailer = require("nodemailer");

// ✅ transporter once create
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (email, otp, doctorName, type = "verify") => {
  try {

    let title = "";
    let message = "";

    // 🔥 SWITCH (clean + safe)
    switch (type) {

      case "verify":
        title = "Doctor Email Verification";
        message = "Use this OTP to verify your doctor account.";
        break;

      case "resend":
        title = "Resend OTP";
        message = "You requested a new OTP.";
        break;

      case "reset":
        title = "Reset Your Password";
        message = "Use this OTP to reset your doctor account password.";
        break;

      case "change-new":
        title = "Verify Your New Email";
        message = "Use this OTP to verify your new email address.";
        break;

      case "change-old":
        title = "Confirm Email Change";
        message = "Use this OTP to confirm changing your email address.";
        break;

      default:
        title = "OTP Verification";
        message = "Use this OTP for verification.";
    }

    const htmlTemplate = `
<div style="font-family:Arial;padding:20px;background:#f4f6f9">
    
  <div style="max-width:600px;margin:auto;background:white;border-radius:10px;padding:30px">

    <h2 style="color:#2c3e50;text-align:center">
      ${title}
    </h2>

    <p style="font-size:16px;color:#555">
      Hello Dr. ${doctorName},
    </p>

    <p style="font-size:16px;color:#555">
      ${message}
    </p>

    <div style="text-align:center;margin:30px 0">

      <span style="
        font-size:32px;
        font-weight:bold;
        letter-spacing:5px;
        color:white;
        background:#007bff;
        padding:12px 30px;
        border-radius:8px;
        display:inline-block
      ">
        ${otp}
      </span>

    </div>

    <p style="font-size:14px;color:#777">
      This OTP is valid for 10 minutes.
    </p>

    <hr style="margin:25px 0">

    <p style="font-size:13px;color:#aaa;text-align:center">
      If you did not request this email, please ignore it.
    </p>

  </div>

</div>
`;

    await transporter.sendMail({
      from: `"Doctor Portal" <${process.env.EMAIL}>`,
      to: email,
      subject: title,
      html: htmlTemplate
    });

  } catch (error) {
    console.log("Email Error:", error);
  }
};

module.exports = sendEmail;