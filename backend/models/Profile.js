const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  course: { type: String, trim: true },
  semester: { type: String, trim: true },
  department: { type: String, trim: true },
  rollNumber: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  assignedSubjects: [{ type: String, trim: true }],
  assignedClass: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
