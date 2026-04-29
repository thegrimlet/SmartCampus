const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { buildVerificationEmail, sendEmail } = require("../services/emailService");

const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const buildVerificationArtifacts = (user) => {
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS);
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verificationLink = `${clientUrl}/verify-email?token=${token}`;

  user.emailVerificationOtpHash = hashValue(otpCode);
  user.emailVerificationTokenHash = hashValue(token);
  user.emailVerificationExpiresAt = expiresAt;

  return {
    otpCode,
    token,
    verificationLink
  };
};

const buildRegistrationResponse = (user, deliveryResult, verificationLink, otpCode) => {
  const response = {
    msg: deliveryResult.delivered
      ? "Registration successful. Check your email for the verification link or OTP."
      : "Registration successful. Email delivery is not configured, so use the OTP shown below for local testing.",
    requiresEmailVerification: true,
    email: user.email
  };

  if (!deliveryResult.delivered) {
    response.devVerification = {
      otp: otpCode,
      link: verificationLink,
      reason: deliveryResult.reason
    };
  }

  return response;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const allowedRoles = ["faculty", "student"];

    if (!name?.trim() || !normalizedEmail || !password) {
      return res.status(400).json({ msg: "Name, email, and password are required" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const status = "approved";

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      status,
      emailVerified: false
    });

    const { otpCode, verificationLink } = buildVerificationArtifacts(user);
    await user.save();

    const emailContent = buildVerificationEmail({
      name: user.name,
      verificationLink,
      otpCode
    });
    const deliveryResult = await sendEmail({
      to: user.email,
      ...emailContent
    });

    res.json(buildRegistrationResponse(user, deliveryResult, verificationLink, otpCode));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.verifyEmailOtp = async (req, res) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ msg: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.emailVerified) {
      return res.json({ msg: "Email already verified" });
    }

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ msg: "Verification code expired. Request a new one." });
    }

    if (user.emailVerificationOtpHash !== hashValue(otp)) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    res.json({ msg: "Email verified. You can log in now." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.verifyEmailLink = async (req, res) => {
  try {
    const token = req.query.token?.trim();
    if (!token) {
      return res.status(400).json({ msg: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationTokenHash: hashValue(token)
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid verification link" });
    }

    if (user.emailVerified) {
      return res.json({ msg: "Email already verified" });
    }

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({ msg: "Verification link expired. Request a new one." });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    res.json({ msg: "Email verified. You can log in now." });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.emailVerified) {
      return res.json({ msg: "Email already verified" });
    }

    const { otpCode, verificationLink } = buildVerificationArtifacts(user);
    await user.save();

    const emailContent = buildVerificationEmail({
      name: user.name,
      verificationLink,
      otpCode
    });
    const deliveryResult = await sendEmail({
      to: user.email,
      ...emailContent
    });

    res.json(buildRegistrationResponse(user, deliveryResult, verificationLink, otpCode));
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(400).json({ msg: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: "Wrong password" });

    if (!user.emailVerified) {
      return res.status(403).json({
        msg: "Please verify your email first. Use the OTP or verification link sent during registration."
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

    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
