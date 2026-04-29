const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationOtpHash: { type: String },
  emailVerificationTokenHash: { type: String },
  emailVerificationExpiresAt: { type: Date },

  role: {
    type: String,
    enum: ["admin", "faculty", "student"],
    default: "student"
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
