const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/*
=====================================
BOOKING CONFIRMATION EMAIL
=====================================
*/
async function sendBookingConfirmation({ to, patient, service, practitioner, date, time }) {
  await transporter.sendMail({
    from: `"MediBook" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Appointment Confirmed",
    html: `
      <p>Hi <strong>${patient}</strong>,</p>
      <p>Your appointment has been successfully booked.</p>
      <ul>
        <li><strong>Service:</strong> ${service}</li>
        <li><strong>Practitioner:</strong> ${practitioner}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
      <p>You may cancel your appointment up to <strong>4 hours</strong> before the scheduled time.</p>
      <p>Thank you,<br>MediBook</p>
    `
  });
}

/*
=====================================
EMAIL VERIFICATION
=====================================
*/
async function sendVerificationEmail(to, token) {

  const verificationLink = `${process.env.BASE_URL}/verify?token=${token}`;

  await transporter.sendMail({
    from: `"MediBook" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your MediBook account",
    html: `
      <h2>Welcome to MediBook</h2>
      <p>Please verify your email address by clicking below:</p>
      <a href="${verificationLink}" style="
        display:inline-block;
        padding:12px 20px;
        background:#0d6efd;
        color:white;
        text-decoration:none;
        border-radius:6px;
        font-weight:bold;">
        Verify My Account
      </a>
      <p style="margin-top:20px;">
        If you did not create this account, ignore this email.
      </p>
      <p>Thank you,<br>MediBook Team</p>
    `
  });
}

module.exports = {
  sendBookingConfirmation,
  sendVerificationEmail
};
