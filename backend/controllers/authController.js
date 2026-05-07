const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../services/emailService");
const { isValidEmail } = require("../utils/validators");

const OTP_WINDOW_MS = 15 * 60 * 1000;

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const buildOtpResponse = (message, deliveryResult, otpCode) => {
  const response = { msg: message };
  if (!deliveryResult.delivered) {
    response.devOtp = otpCode;
    response.devReason = deliveryResult.reason;
  }
  return response;
};

const findByIdentifier = async (identifier) => {
  const value = identifier?.trim();
  if (!value) return null;
  const normalizedEmail = value.toLowerCase();
  return User.findOne({
    $or: [
      { institutionalId: new RegExp(`^${escapeRegex(value)}$`, "i") },
      { email: normalizedEmail }
    ]
  });
};

exports.register = async (req, res) => {
  res.status(410).json({ msg: "Public registration is disabled. Please contact the administrator." });
};

exports.login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const user = await findByIdentifier(identifier || email);
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    if (!user.emailVerified) {
      return res.status(403).json({
        msg: "This account is not active. Please contact the administrator."
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.emailVerificationOtpHash;
    delete safeUser.emailVerificationTokenHash;
    delete safeUser.emailVerificationExpiresAt;
    delete safeUser.passwordResetOtpHash;
    delete safeUser.passwordResetExpiresAt;

    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.recoverId = async (req, res) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ msg: "Email is required" });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ msg: "Enter a valid email address" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ msg: "No account found for this email" });
    }

    const text = [
      `Hello ${user.name},`,
      "",
      `Your Smart Campus login ID is: ${user.institutionalId || user.email}`,
      "",
      "Use this ID with your password to sign in."
    ].join("\n");

    const deliveryResult = await sendEmail({
      to: user.email,
      subject: "Your Smart Campus login ID",
      text,
      html: `<p>Hello ${user.name},</p><p>Your Smart Campus login ID is: <strong>${user.institutionalId || user.email}</strong></p>`
    });

    const response = { msg: "Login ID sent to the registered email." };
    if (!deliveryResult.delivered) {
      response.devLoginId = user.institutionalId || user.email;
      response.devReason = deliveryResult.reason;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const user = await findByIdentifier(req.body.identifier || req.body.email);
    if (!user) {
      return res.status(404).json({ msg: "No account found" });
    }

    const otpCode = createOtp();
    user.passwordResetOtpHash = hashValue(otpCode);
    user.passwordResetExpiresAt = new Date(Date.now() + OTP_WINDOW_MS);
    await user.save();

    const deliveryResult = await sendEmail({
      to: user.email,
      subject: "Reset your Smart Campus password",
      text: `Your Smart Campus password reset OTP is ${otpCode}. It expires in 15 minutes.`,
      html: `<p>Your Smart Campus password reset OTP is <strong>${otpCode}</strong>.</p><p>It expires in 15 minutes.</p>`
    });

    res.json(buildOtpResponse("Password reset OTP sent to the registered email.", deliveryResult, otpCode));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await findByIdentifier(req.body.identifier || req.body.email);
    const otp = req.body.otp?.trim();
    const password = req.body.password;

    if (!user) {
      return res.status(404).json({ msg: "No account found" });
    }

    if (!otp || !password) {
      return res.status(400).json({ msg: "OTP and new password are required" });
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      return res.status(400).json({ msg: "Password reset OTP expired" });
    }

    if (user.passwordResetOtpHash !== hashValue(otp)) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetOtpHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    res.json({ msg: "Password changed. You can log in now." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
