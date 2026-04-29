const buildVerificationEmail = ({ name, verificationLink, otpCode }) => ({
  subject: "Verify your Smart Campus account",
  text: [
    `Hello ${name},`,
    "",
    "Welcome to Smart Campus.",
    `Use this OTP to verify your email: ${otpCode}`,
    `Or open this verification link: ${verificationLink}`,
    "",
    "This code expires in 15 minutes."
  ].join("\n"),
  html: `
    <div style="font-family: Arial, sans-serif; color: #1a2433; line-height: 1.5;">
      <h2>Verify your Smart Campus account</h2>
      <p>Hello ${name},</p>
      <p>Use this OTP to verify your email:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">${otpCode}</p>
      <p>Or verify with one click:</p>
      <p><a href="${verificationLink}" style="display: inline-block; background: #1d64d8; color: #fff; padding: 10px 16px; border-radius: 6px; text-decoration: none;">Verify Email</a></p>
      <p>This code expires in 15 minutes.</p>
    </div>
  `
});

const sendEmail = async ({ to, subject, text, html }) => {
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );

  if (!smtpConfigured) {
    return { delivered: false, reason: "smtp_not_configured" };
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (err) {
    return { delivered: false, reason: "nodemailer_not_installed" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html
  });

  return { delivered: true };
};

module.exports = {
  buildVerificationEmail,
  sendEmail
};
