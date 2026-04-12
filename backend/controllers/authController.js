const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    const allowedRoles = ["admin", "faculty", "student"];

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
    const hasApprovedAdmin = await User.exists({ role: "admin", status: "approved" });
    const status = role === "admin" && !hasApprovedAdmin ? "approved" : "pending";

    await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role,
      status
    });

    res.json({
      msg: status === "approved"
        ? "Admin account created. You can log in now."
        : "Request submitted. Wait for admin approval."
    });
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

    if (user.status !== "approved") {
      return res.status(403).json({
        msg: "Your account is not approved yet. Please wait for admin approval."
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
