const nodemailer = require("nodemailer");

const BASE_URL = "https://doc.gold.ac.uk/www/350/medibook";

const resetLink = `${BASE_URL}/reset/${token}`;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/*
=====================================
BOOKING CONFIRMATION EMAIL
(Already working - untouched)
=====================================
*/
async function sendBookingConfirmation({ to, patient, service, practitioner, date, time }) {
  const mailOptions = {
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
  };

  await transporter.sendMail(mailOptions);
}

/*
=====================================
EMAIL VERIFICATION
(New Feature)
=====================================
*/
async function sendVerificationEmail(to, token) {

const verificationLink = `${BASE_URL}/verify?token=${token}`;
  const mailOptions = {
    from: `"MediBook" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your MediBook account",
    html: `
      <h2>Welcome to MediBook</h2>

      <p>Please verify your email address by clicking the button below:</p>

      <a href="${verificationLink}"
         style="
           display:inline-block;
           padding:12px 20px;
           background:#0d6efd;
           color:white;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
         ">
         Verify My Account
      </a>

      <p style="margin-top:20px;">
        If you did not create this account, you can safely ignore this email.
      </p>

      <p>Thank you,<br>MediBook Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail(to, token){
  const mailOptions = {
    from: `"MediBook Security" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Reset your MediBook password",

    text: `
Reset your password:
${resetLink}
If you didn't request this, ignore this email.
    `,

    html: `
      <h2>Password Reset Request</h2>

      <p>You requested to reset your password.</p>

      <a href="${resetLink}"
         style="
           display:inline-block;
           padding:12px 20px;
           background:#dc3545;
           color:white;
           text-decoration:none;
           border-radius:6px;
           font-weight:bold;
         ">
         Reset Password
      </a>

      <p style="margin-top:20px;color:#666;font-size:14px">
        This link expires in 15 minutes.
      </p>

      <p>If you didn't request this, you can ignore this email.</p>

      <p>MediBook Security Team</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendBookingConfirmation,
  sendVerificationEmail,
  sendPasswordResetEmail
};