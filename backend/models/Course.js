const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  courseCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
  courseName: { type: String, required: true, trim: true },
  semYearType: {
    type: String,
    enum: ["Semester", "Year"],
    default: "Semester"
  },
  totalSemYear: { type: Number, required: true, min: 1 },
  department: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model("Course", courseSchema);
