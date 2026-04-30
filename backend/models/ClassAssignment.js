const mongoose = require("mongoose");

const classAssignmentSchema = new mongoose.Schema({
  className: { type: String, required: true, trim: true },
  batch: { type: String, required: true, trim: true, default: "Morning" },
  course: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  classTeacher: { type: String, trim: true },
  subjects: [{ type: String, trim: true }]
}, { timestamps: true });

classAssignmentSchema.index({ className: 1, batch: 1 }, { unique: true });

module.exports = mongoose.model("ClassAssignment", classAssignmentSchema);
