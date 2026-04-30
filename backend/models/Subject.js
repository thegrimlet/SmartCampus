const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
  },
  courseCode: { type: String, trim: true, uppercase: true },
  subjectCode: { type: String, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  semester: { type: String, trim: true },
  subjectType: {
    type: String,
    enum: ["Core", "Specialisation Elective"],
    default: "Core"
  },
  theoryMarks: { type: Number, min: 0, default: 0 },
  practicalMarks: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

subjectSchema.index({ course: 1, semester: 1, subjectCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Subject", subjectSchema);
