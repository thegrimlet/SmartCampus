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
  className: { type: String, trim: true },
  batch: { type: String, trim: true },
  theoryMarks: { type: Number, min: 0, default: 0 },
  theoryMax: { type: Number, min: 0, default: 0 },
  practicalMarks: { type: Number, min: 0, default: 0 },
  practicalMax: { type: Number, min: 0, default: 0 },
  marksObtained: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, required: true, min: 1, default: 100 },
  grade: { type: String, trim: true },
  remarks: { type: String, trim: true },
  declared: { type: Boolean, default: false },
  declaredAt: Date,
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

resultSchema.index({ student: 1, subject: 1, course: 1, semester: 1, className: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model("Result", resultSchema);
