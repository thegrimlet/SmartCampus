const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subject: { type: String, required: true, trim: true },
  course: { type: String, trim: true },
  semester: { type: String, trim: true },
  marksObtained: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, required: true, min: 1, default: 100 },
  grade: { type: String, trim: true },
  remarks: { type: String, trim: true },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

module.exports = mongoose.model("Result", resultSchema);
