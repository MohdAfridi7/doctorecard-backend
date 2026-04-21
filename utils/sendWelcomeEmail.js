const nodemailer = require("nodemailer");

const sendWelcomeEmail = async (email, name, password = null) => {

  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
      }
    });

    // 🔹 Password Section (Only when Admin creates doctor)
    const passwordSection = password
      ? `
      <div style="background:#f1f5f9;padding:15px;border-radius:6px;margin-top:20px">
        <p style="margin:5px 0;font-size:15px"><b>Email:</b> ${email}</p>
        <p style="margin:5px 0;font-size:15px"><b>Password:</b> ${password}</p>
      </div>
      `
      : "";

    const htmlTemplate = `
    
    <div style="font-family:Arial;background:#f4f6f9;padding:30px">

      <div style="max-width:600px;margin:auto;background:white;border-radius:10px;padding:35px">

        <h2 style="text-align:center;color:#2c3e50">
          Welcome to Doctor Portal
        </h2>

        <p style="font-size:16px;color:#555">
          Dear Dr. ${name},
        </p>

        <p style="font-size:16px;color:#555">
          Congratulations! Your doctor account has been successfully created.
        </p>

        ${passwordSection}

        <p style="font-size:16px;color:#555;margin-top:20px">
          You can now login to your dashboard and start managing your appointments and consultations.
        </p>

        <div style="text-align:center;margin:30px 0">

          <a href="https://yourwebsite.com/login"
            style="
              background:#28a745;
              color:white;
              padding:12px 25px;
              text-decoration:none;
              border-radius:6px;
              font-weight:bold
            ">
            Login to Dashboard
          </a>

        </div>

        <hr>

        <p style="font-size:13px;color:#888;text-align:center">
          Thank you for joining our platform.
        </p>

      </div>

    </div>
    
    `;

    await transporter.sendMail({
      from: `"Doctor Portal" <${process.env.EMAIL}>`,
      to: email,
      subject: "Welcome to Doctor Portal",
      html: htmlTemplate
    });

  } catch (error) {

    console.log("Email Send Error:", error);

  }

};

module.exports = sendWelcomeEmail;