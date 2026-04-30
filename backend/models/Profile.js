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
  facultyNumber: { type: String, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  dateOfBirth: { type: Date },
  gender: { type: String, trim: true },
  fatherName: { type: String, trim: true },
  fatherOccupation: { type: String, trim: true },
  motherName: { type: String, trim: true },
  motherOccupation: { type: String, trim: true },
  qualification: { type: String, trim: true },
  experience: { type: String, trim: true },
  photoUrl: { type: String, trim: true },
  assignedSubjects: [{ type: String, trim: true }],
  assignedClass: { type: String, trim: true },
  assignedBatch: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Profile", profileSchema);
