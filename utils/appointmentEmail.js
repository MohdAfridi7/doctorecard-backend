const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

// 🔥 FINAL FIXED FORMAT FUNCTION
const formatDateTime = (date, time) => {
  const [hours, minutes] = time.split(":");

  const dateObj = new Date(date);
  dateObj.setHours(parseInt(hours));
  dateObj.setMinutes(parseInt(minutes));
  dateObj.setSeconds(0);

  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const formattedTime = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  return { formattedDate, formattedTime };
};

const sendAppointmentEmail = async ({
  to,
  type,
  doctorName,
  patientName,
  patientEmail,
  phone,
  date,
  time,
  message,
  reason
}) => {

 let formattedDate = "";
let formattedTime = "";

if (date && time) {
  const formatted = formatDateTime(date, time);
  formattedDate = formatted.formattedDate;
  formattedTime = formatted.formattedTime;
}

  let title = "";
  let content = "";
  let receiverName = "";

  switch (type) {

    // ================= BOOKING =================
    case "booking-doctor":
      title = "New Appointment Request";
      receiverName = `Dr. ${doctorName}`;
      content = `
        <p><b>Patient:</b> ${patientName}</p>
        <p><b>Email:</b> ${patientEmail}</p>
        <p><b>Date:</b> ${formattedDate}</p>
        <p><b>Time:</b> ${formattedTime}</p>
        <p><b>Problem:</b> ${message}</p>
      `;
      break;

    case "booking-patient":
      title = "Appointment Requested";
      receiverName = patientName;
      content = `
        <p>Your request has been sent successfully.</p>
        <p><b>Doctor:</b> Dr. ${doctorName}</p>
        <p><b>Date:</b> ${formattedDate}</p>
        <p><b>Time:</b> ${formattedTime}</p>
      `;
      break;

    // ================= CONFIRM =================
    case "confirmed":
      title = "Appointment Confirmed";
      receiverName = patientName;
      content = `
        <p>Your appointment is confirmed.</p>
        <p><b>Doctor:</b> Dr. ${doctorName}</p>
        <p><b>Date:</b> ${formattedDate}</p>
        <p><b>Time:</b> ${formattedTime}</p>
      `;
      break;

    // ================= RESCHEDULE =================
    case "rescheduled":
      title = "Appointment Rescheduled";
      receiverName = patientName;
      content = `
        <p>Your appointment has been rescheduled.</p>
        <p><b>New Date:</b> ${formattedDate}</p>
        <p><b>New Time:</b> ${formattedTime}</p>
        <p><b>Reason:</b> ${reason}</p>
      `;
      break;

    // ================= CANCEL =================
    case "cancelled":
      title = "Appointment Cancelled";
      receiverName = patientName;
      content = `
        <p>Your appointment has been cancelled.</p>
        <p><b>Doctor:</b> Dr. ${doctorName}</p>
        <p><b>Date:</b> ${formattedDate}</p>
        <p><b>Time:</b> ${formattedTime}</p>
        <p><b>Reason:</b> ${reason}</p>
      `;
      break;

    case "cancelled-doctor":
      title = "Appointment Cancelled";
      receiverName = `Dr. ${doctorName}`;
      content = `
        <p><b>Patient:</b> ${patientName}</p>
        <p><b>Email:</b> ${patientEmail}</p>
        <p><b>Date:</b> ${formattedDate}</p>
        <p><b>Time:</b> ${formattedTime}</p>
        <p><b>Reason:</b> ${reason}</p>
      `;
      break;

      case "enquiry-doctor":
  title = "New Enquiry Received";
  receiverName = `Dr. ${doctorName}`;
  content = `
    <p><b>Name:</b> ${patientName}</p>
    <p><b>Email:</b> ${patientEmail}</p>
    <p><b>Phone:</b> ${phone}</p>
    <p><b>Message:</b> ${message}</p>
  `;
break;

    default:
      title = "Appointment Update";
      receiverName = patientName || doctorName || "User";
      content = `<p>Your appointment has been updated.</p>`;
  }

  const html = `
  <div style="font-family:Arial;background:#f4f6f9;padding:30px">
    <div style="max-width:600px;margin:auto;background:white;border-radius:12px;padding:30px;box-shadow:0 4px 10px rgba(0,0,0,0.05)">
      
      <h2 style="text-align:center;color:#0f172a;margin-bottom:20px">${title}</h2>

      <p style="font-size:16px">Hello ${receiverName},</p>

      <div style="margin-top:20px;font-size:15px;color:#334155;line-height:1.6">
        ${content}
      </div>

      <hr style="margin:30px 0"/>

      <p style="text-align:center;color:#94a3b8;font-size:13px">
        Doctor Booking System • All rights reserved
      </p>

    </div>
  </div>
  `;

  await transporter.sendMail({
    from: `"Doctor Portal" <${process.env.EMAIL}>`,
    to,
    subject: title,
    html
  });
};

module.exports = sendAppointmentEmail;